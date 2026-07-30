import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  BillingOrderType,
  CheckoutPaymentMethod,
  BillingPlan,
  billingErrors,
  BillingProvider,
  DEFAULT_BILLING_PLANS,
  NormalizedWebhookEvent,
  PaymentCheckResult,
  SubscriptionStatus,
} from '../domain/billingTypes';
import { PlanEntitlementService } from './PlanEntitlementService';

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const iso = (date = new Date()) => date.toISOString();
const orderNsu = () => `blu_ord_${crypto.randomBytes(12).toString('hex')}`;
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const normalizeStatus = (value?: unknown) => String(value || '').toUpperCase();
const firstNonEmpty = (...values: unknown[]) => String(values.find((value) => String(value || '').trim()) || '').trim();
const digitsOrEmpty = (...values: unknown[]) => String(values.find((value) => String(value || '').replace(/\D/g, '').trim()) || '').replace(/\D/g, '');

export class BillingService {
  constructor(
    private readonly db: admin.firestore.Firestore,
  private readonly provider: BillingProvider,
  private readonly config: {
    providerId: 'pagarme';
    handle: string;
    redirectUrl: string;
      webhookUrl: string;
      graceDays: number;
    },
  ) {}

  async getPlan(planId: string): Promise<BillingPlan> {
    const snapshot = await this.db.collection('plans').doc(planId).get();
    const fallbackPlan = DEFAULT_BILLING_PLANS.find((plan) => plan.id === planId || plan.slug === planId) || null;
    if (!snapshot.exists) {
      if (fallbackPlan) return fallbackPlan;
      throw billingErrors.planNotFound();
    }
    const plan = { id: snapshot.id, ...snapshot.data() } as BillingPlan;
    if (!plan.active) throw billingErrors.planInactive();
    if (!Number.isSafeInteger(Number(plan.priceInCents)) || Number(plan.priceInCents) < 0) throw billingErrors.planInactive();
    return plan;
  }

  async getOrCreateSubscription(companyId: string, planId: string, userId: string, options: { trialDays?: number; freeAccess?: boolean } = {}) {
    const existing = await this.db.collection('subscriptions').where('customerCompanyId', '==', companyId).limit(1).get();
    if (!existing.empty) return { id: existing.docs[0].id, ...existing.docs[0].data() };
    const now = new Date();
    const ref = this.db.collection('subscriptions').doc();
    const trialDays = Math.max(0, Number(options.trialDays || 0));
    const status = options.freeAccess ? 'ACTIVE' : trialDays > 0 ? 'TRIALING' : 'PAYMENT_PENDING';
    const subscription = {
      id: ref.id,
      customerCompanyId: companyId,
      planId,
      status: status as SubscriptionStatus,
      provider: this.config.providerId,
      trialStartedAt: trialDays > 0 ? iso(now) : null,
      trialEndsAt: trialDays > 0 ? iso(addDays(now, trialDays)) : null,
      currentPeriodStartedAt: iso(now),
      currentPeriodEndsAt: options.freeAccess ? null : iso(addMonths(now, 1)),
      nextBillingDate: options.freeAccess ? null : iso(addMonths(now, 1)),
      gracePeriodEndsAt: null,
      canceledAt: null,
      cancelAtPeriodEnd: false,
      suspendedAt: null,
      lastPaymentId: null,
      createdAt: iso(now),
      updatedAt: iso(now),
      createdBy: userId,
    };
    await ref.set(subscription);
    await this.db.collection('companies').doc(companyId).set({ subscriptionId: ref.id, accessStatus: status, updatedAt: iso() }, { merge: true });
    return subscription;
  }

  private async loadBillingProfile(companyId: string, billingCompanyId?: string, userId?: string) {
    const selectedBillingCompanyId = String(billingCompanyId || '').trim();
    const [companySnapshot, platformCustomerSnapshot, selectedPlatformCustomerSnapshot, legalEntitiesSnapshot, userSnapshot] = await Promise.all([
      this.db.collection('companies').doc(companyId).get(),
      this.db.collection('platformCustomers').doc(companyId).get(),
      selectedBillingCompanyId && selectedBillingCompanyId !== companyId
        ? this.db.collection('platformCustomers').doc(selectedBillingCompanyId).get().catch(() => null)
        : Promise.resolve(null),
      this.db.collection('companies').doc(companyId).collection('settings').doc('legalEntities').get(),
      userId
        ? this.db.collection('users').doc(userId).get().catch(() => null)
        : Promise.resolve(null),
    ]);
    const company = companySnapshot.exists ? companySnapshot.data() || {} : {};
    const rootPlatformCustomer = platformCustomerSnapshot.exists ? platformCustomerSnapshot.data() || {} : {};
    const selectedPlatformCustomer = selectedPlatformCustomerSnapshot?.exists ? selectedPlatformCustomerSnapshot.data() || {} : {};
    const platformCustomer = { ...rootPlatformCustomer, ...selectedPlatformCustomer };
    const userProfile = userSnapshot?.exists ? userSnapshot.data() || {} : {};
    const legalEntities = legalEntitiesSnapshot.exists ? (legalEntitiesSnapshot.data()?.companies || []) : [];
    const selectedCompanySnapshot = selectedBillingCompanyId
      ? await this.db.collection('companies').doc(selectedBillingCompanyId).get().catch(() => null)
      : null;
    const selectedCompanyDoc = selectedCompanySnapshot?.exists ? selectedCompanySnapshot.data() || {} : null;
    const selectedLegalEntity = selectedBillingCompanyId
      ? legalEntities.find((item: any) => String(item?.id || '') === selectedBillingCompanyId)
      : null;
    return {
      rootCompany: company,
      platformCustomer,
      userProfile,
      billingCompany: selectedCompanyDoc || selectedLegalEntity || company,
    };
  }

  async createCheckout(input: {companyId: string; billingCompanyId?: string; userId: string; userEmail?: string; userName?: string; userPhone?: string; planId: string; type: BillingOrderType; paymentMethod: CheckoutPaymentMethod; cardToken?: string; orderNsu?: string}) {
    const plan = await this.getPlan(input.planId);
    if (plan.slug === 'enterprise') throw billingErrors.invalidPlanChange('Plano Enterprise exige contratação assistida.');
    const shouldTrial = input.type === 'FIRST_SUBSCRIPTION' && plan.slug !== 'test-1-real';
    const isFreePlan = Number(plan.priceInCents || 0) <= 0;
    const subscription = await this.getOrCreateSubscription(input.companyId, plan.id, input.userId, { trialDays: isFreePlan ? 0 : shouldTrial ? 7 : 0, freeAccess: isFreePlan });
    const { rootCompany, platformCustomer, userProfile, billingCompany } = await this.loadBillingProfile(input.companyId, input.billingCompanyId, input.userId);
    const city = firstNonEmpty(
      billingCompany.municipio,
      billingCompany.city,
      rootCompany.municipio,
      rootCompany.city,
      platformCustomer.city,
      platformCustomer.municipio,
      platformCustomer.companyCity,
      userProfile.billingCity,
      userProfile.municipio,
      userProfile.companyCity,
    );
    const state = firstNonEmpty(
      billingCompany.uf,
      billingCompany.state,
      rootCompany.uf,
      rootCompany.state,
      platformCustomer.state,
      platformCustomer.uf,
      platformCustomer.companyState,
      userProfile.billingState,
      userProfile.uf,
      userProfile.companyState,
    );
    const companyAddress = {
      street: firstNonEmpty(
        billingCompany.logradouro,
        billingCompany.street,
        rootCompany.logradouro,
        rootCompany.street,
        platformCustomer.street,
        platformCustomer.address,
        platformCustomer.logradouro,
        platformCustomer.companyStreet,
        userProfile.billingStreet,
        userProfile.logradouro,
        userProfile.companyStreet,
      ),
      number: firstNonEmpty(
        billingCompany.numero,
        billingCompany.number,
        rootCompany.numero,
        rootCompany.number,
        platformCustomer.number,
        platformCustomer.addressNumber,
        platformCustomer.address_number,
        platformCustomer.companyNumber,
        userProfile.billingNumber,
        userProfile.numero,
        userProfile.companyNumber,
      ),
      zipCode: digitsOrEmpty(
        billingCompany.cep,
        billingCompany.zipCode,
        billingCompany.zip_code,
        rootCompany.cep,
        rootCompany.zipCode,
        rootCompany.zip_code,
        platformCustomer.zipCode,
        platformCustomer.zip_code,
        platformCustomer.cep,
        platformCustomer.companyCep,
        userProfile.billingCep,
        userProfile.cep,
        userProfile.zipCode,
        userProfile.zip_code,
        userProfile.companyCep,
      ),
      province: firstNonEmpty(
        billingCompany.bairro,
        billingCompany.neighborhood,
        rootCompany.bairro,
        rootCompany.neighborhood,
        platformCustomer.neighborhood,
        platformCustomer.bairro,
        platformCustomer.companyNeighborhood,
        userProfile.billingNeighborhood,
        userProfile.bairro,
        userProfile.neighborhood,
        userProfile.companyNeighborhood,
      ),
      city,
      state,
      country: 'BR',
    };
    const companyCpfCnpj = digitsOrEmpty(
      billingCompany.document,
      billingCompany.cnpj,
      rootCompany.document,
      rootCompany.cnpj,
      platformCustomer.companyDocument,
      platformCustomer.document,
      userProfile.document,
      userProfile.cnpj,
      userProfile.cpf,
    );
    const companyPhone = digitsOrEmpty(
      billingCompany.telefoneCelular,
      billingCompany.phone,
      billingCompany.telefoneFixo,
      rootCompany.telefoneCelular,
      rootCompany.phone,
      rootCompany.telefoneFixo,
      platformCustomer.ownerPhone,
      platformCustomer.companyPhone,
      platformCustomer.companyMobile,
      userProfile.billingPhone,
      userProfile.phone,
      userProfile.phoneNumber,
      input.userPhone,
    );
    const customerName = firstNonEmpty(
      billingCompany.razaoSocial,
      billingCompany.tradeName,
      billingCompany.nomeFantasia,
      billingCompany.name,
      rootCompany.name,
      rootCompany.tradeName,
      rootCompany.nomeFantasia,
      platformCustomer.companyName,
      userProfile.displayName,
      input.userName,
      input.userEmail,
    );
    const addressValidation = {
      CEP: companyAddress.zipCode.length === 8,
      logradouro: Boolean(companyAddress.street),
      número: Boolean(companyAddress.number),
      bairro: Boolean(companyAddress.province),
      município: Boolean(companyAddress.city),
      UF: companyAddress.state.length === 2,
    };
    const missingAddressFields = Object.entries(addressValidation)
      .filter(([, valid]) => !valid)
      .map(([label]) => label);
    if (missingAddressFields.length) {
      throw billingErrors.invalidPlanChange(
        `Complete o endereço da empresa principal em Perfil antes de pagar: ${missingAddressFields.join(', ')}.`,
      );
    }
    const baseAmountInCents = Number(plan.priceInCents || 0);
    const discountPercent = Math.max(0, Number(rootCompany.billingDiscountPercent || 0));
    const discountFixedInCents = Math.max(0, Number(rootCompany.billingDiscountCents || 0));
    const percentageDiscountInCents = Math.round(baseAmountInCents * (discountPercent / 100));
    const amountInCents = Math.max(0, baseAmountInCents - discountFixedInCents - percentageDiscountInCents);
    const discountAppliedInCents = Math.max(0, baseAmountInCents - amountInCents);

    const openOrderQuery = await this.db.collection('billingOrders')
      .where('companyId', '==', input.companyId)
      .where('planId', '==', plan.id)
      .where('type', '==', input.type)
      .limit(10)
      .get();
    const openOrders: any[] = openOrderQuery.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
    const latestOpenOrder = openOrders
      .filter((order) => {
        const status = String(order.status || '').toUpperCase();
        const provider = String(order.provider || '').toLowerCase();
        const paymentMethod = String(order.paymentMethod || '').toLowerCase();
        return provider === this.config.providerId
          && paymentMethod === String(input.paymentMethod || '').toLowerCase()
          && !['PAID', 'CANCELED', 'REFUNDED'].includes(status)
          && Boolean(String(order.orderNsu || '').trim());
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
    if (latestOpenOrder?.paymentData) {
      return {
        orderId: String(latestOpenOrder.id),
        orderNsu: String(latestOpenOrder.orderNsu || ''),
        amountInCents: Number(latestOpenOrder.amountInCents || amountInCents),
        planName: plan.name,
        paymentMethod: String(latestOpenOrder.paymentMethod || input.paymentMethod) as CheckoutPaymentMethod,
        orderStatus: String(latestOpenOrder.status || 'CHECKOUT_CREATED'),
        paymentData: latestOpenOrder.paymentData || null,
        raw: latestOpenOrder.providerResponse || latestOpenOrder,
      };
    }
    const now = iso();
    const ref = latestOpenOrder ? this.db.collection('billingOrders').doc(String(latestOpenOrder.id)) : this.db.collection('billingOrders').doc();
    const nsu = String(latestOpenOrder?.orderNsu || orderNsu());
    const description = `${plan.name} Blu - ${plan.billingInterval === 'year' ? 'anual' : 'mensal'}`;
    await ref.set({
      id: ref.id,
      orderNsu: nsu,
      companyId: input.companyId,
      subscriptionId: subscription.id,
      planId: plan.id,
      type: input.type,
      status: 'CREATED',
      amountInCents,
      baseAmountInCents,
      discountAppliedInCents,
      discountPercent,
      discountFixedInCents,
      currency: 'BRL',
      description,
      provider: this.config.providerId,
      paymentMethod: input.paymentMethod,
      providerInvoiceSlug: '',
      providerTransactionNsu: '',
      captureMethod: '',
      installments: 1,
      receiptUrl: '',
      paymentData: null,
      expiresAt: iso(addDays(new Date(), 3)),
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.userId,
    }, { merge: true });
    if (amountInCents <= 0) {
      await ref.update({
        status: 'PAID',
        updatedAt: iso(),
        providerResponse: { freeAccess: true },
        paymentData: null,
      });
      await this.db.collection('subscriptions').doc(String(subscription.id)).set({
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStartedAt: now,
        currentPeriodEndsAt: null,
        nextBillingDate: null,
        updatedAt: now,
      }, { merge: true });
      await this.db.collection('companies').doc(String(input.companyId)).set({
        subscriptionId: subscription.id,
        accessStatus: 'ACTIVE',
        updatedAt: now,
      }, { merge: true });
      await this.audit(input.companyId, subscription.id, ref.id, '', 'checkoutCreated', 'USER', input.userId, null, { planId: plan.id, amountInCents: 0, baseAmountInCents, discountAppliedInCents, paymentMethod: input.paymentMethod, freeAccess: true });
      return {
        orderId: ref.id,
        orderNsu: nsu,
        amountInCents: 0,
        planName: plan.name,
        paymentMethod: input.paymentMethod,
        orderStatus: 'PAID',
        paymentData: null,
        raw: { freeAccess: true },
      };
    }
    if (['credit_card', 'debit_card'].includes(input.paymentMethod) && !input.cardToken) {
      await ref.update({ status: 'CHECKOUT_CREATED', updatedAt: iso(), providerResponse: { pendingCardToken: true } });
      await this.audit(input.companyId, subscription.id, ref.id, '', 'checkoutCreated', 'USER', input.userId, null, { planId: plan.id, amountInCents, baseAmountInCents, discountAppliedInCents, paymentMethod: input.paymentMethod, pendingCardToken: true });
      return { orderId: ref.id, orderNsu: nsu, amountInCents, planName: plan.name, paymentMethod: input.paymentMethod, orderStatus: 'AWAITING_CARD_TOKEN', requiresCardToken: true, raw: { pendingCardToken: true } };
    }
    const checkout = await this.provider.createCheckout({
      handle: this.config.handle,
      redirectUrl: this.config.redirectUrl,
      webhookUrl: this.config.webhookUrl,
      orderNsu: input.orderNsu || nsu,
      amountInCents,
      description,
      paymentMethod: input.paymentMethod,
      cardToken: input.cardToken,
      customer: {
        name: customerName,
        email: String(billingCompany.email || billingCompany.companyEmail || rootCompany.email || rootCompany.companyEmail || platformCustomer.ownerEmail || userProfile.email || input.userEmail || '').trim(),
        phoneNumber: companyPhone || String(input.userPhone || '').replace(/\D/g, ''),
        cpfCnpj: companyCpfCnpj,
        address: companyAddress,
      },
    });
    await ref.update({
      status: checkout.orderStatus || 'CHECKOUT_CREATED',
      updatedAt: iso(),
      providerResponse: clean(checkout.raw),
      paymentData: clean(checkout.paymentData || null),
      providerInvoiceSlug: String(checkout.paymentData?.invoiceSlug || ''),
      providerTransactionNsu: String(checkout.paymentData?.transactionNsu || ''),
      receiptUrl: String(checkout.paymentData?.receiptUrl || ''),
      paymentMethod: checkout.paymentMethod || input.paymentMethod,
    });
    if (checkout.orderStatus === 'PAID') {
      await this.applyPayment(ref, {
        id: ref.id,
        orderNsu: checkout.orderNsu,
        companyId: input.companyId,
        subscriptionId: subscription.id,
        planId: plan.id,
        amountInCents,
        status: checkout.orderStatus || 'PAID',
      }, {
        success: true,
        paid: true,
        orderNsu: checkout.orderNsu,
        amountInCents,
        paidAmountInCents: amountInCents,
        captureMethod: input.paymentMethod,
        installments: 1,
        raw: checkout.raw,
      }, { transactionNsu: checkout.paymentData?.transactionNsu, slug: checkout.paymentData?.invoiceSlug, actorId: input.userId });
    }
    await this.audit(input.companyId, subscription.id, ref.id, '', 'checkoutCreated', 'USER', input.userId, null, { planId: plan.id, amountInCents, baseAmountInCents, discountAppliedInCents, paymentMethod: input.paymentMethod });
    return {
      orderId: ref.id,
      orderNsu: checkout.orderNsu || input.orderNsu || nsu,
      amountInCents,
      planName: plan.name,
      paymentMethod: checkout.paymentMethod || input.paymentMethod,
      orderStatus: checkout.orderStatus,
      paymentData: checkout.paymentData,
      raw: checkout.raw,
    };
  }

  async recordWebhookEvent(event: NormalizedWebhookEvent, payloadHash: string) {
    const order = await this.db.collection('billingOrders').where('orderNsu', '==', event.orderNsu).limit(1).get();
    if (order.empty) throw billingErrors.orderNotFound();
    const orderData = order.docs[0].data();
    if (orderData.provider !== this.config.providerId) throw billingErrors.orderNotFound();
    if (Number(orderData.amountInCents) !== Number(event.amountInCents)) throw billingErrors.amountMismatch();
    const eventId = event.eventKey.replace(/[^a-zA-Z0-9:_-]/g, '_');
    const ref = this.db.collection('billingWebhookEvents').doc(eventId);
    await ref.set({
      id: ref.id,
      provider: this.config.providerId,
      eventKey: event.eventKey,
      transactionNsu: event.transactionNsu,
      orderNsu: event.orderNsu,
      invoiceSlug: event.invoiceSlug,
      payloadHash,
      payload: clean(event.raw),
      processingStatus: 'RECEIVED',
      attempts: admin.firestore.FieldValue.increment(1),
      receivedAt: iso(),
      orderId: order.docs[0].id,
      companyId: orderData.companyId,
      subscriptionId: orderData.subscriptionId,
    }, { merge: true });
    return { eventId: ref.id };
  }

  async verifyAndApplyPayment(input: {orderNsu: string; transactionNsu?: string; slug?: string; actorId?: string}) {
    const orderQuery = await this.db.collection('billingOrders').where('orderNsu', '==', input.orderNsu).limit(1).get();
    if (orderQuery.empty) throw billingErrors.orderNotFound();
    const orderRef = orderQuery.docs[0].ref;
    const order = orderQuery.docs[0].data();
    const checked = await this.provider.checkPayment({ handle: this.config.handle, orderNsu: input.orderNsu, transactionNsu: input.transactionNsu, slug: input.slug });
    if (!checked.success || !checked.paid) throw billingErrors.paymentNotConfirmed();
    await this.applyPayment(orderRef, order, checked, input);
    return { status: 'PAID', orderId: orderRef.id, subscriptionId: order.subscriptionId };
  }

  async processWebhookEvent(eventId: string) {
    const eventRef = this.db.collection('billingWebhookEvents').doc(eventId);
    const eventSnapshot = await eventRef.get();
    if (!eventSnapshot.exists) return;
    const event = eventSnapshot.data() || {};
    if (event.processingStatus === 'PROCESSED') return;
    try {
      const result = await this.verifyAndApplyPayment({
        orderNsu: String(event.orderNsu),
        transactionNsu: String(event.transactionNsu),
        slug: String(event.invoiceSlug),
        actorId: 'webhook:pagarme',
      });
      await eventRef.update({ processingStatus: 'PROCESSED', processedAt: iso(), result });
    } catch (error) {
      await eventRef.update({ processingStatus: 'ERROR', processedAt: iso(), errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' });
      throw error;
    }
  }

  private async applyPayment(orderRef: admin.firestore.DocumentReference, order: admin.firestore.DocumentData, checked: PaymentCheckResult, input: {transactionNsu?: string; slug?: string; actorId?: string}) {
    const paymentId = `${this.config.providerId}_${input.transactionNsu || input.slug || orderRef.id}`;
    const paymentRef = this.db.collection('payments').doc(paymentId);
    await this.db.runTransaction(async (transaction) => {
      const [paymentSnapshot, orderSnapshot] = await Promise.all([transaction.get(paymentRef), transaction.get(orderRef)]);
      if (paymentSnapshot.exists) return;
      const latestOrder = orderSnapshot.data() || order;
      if (Number(latestOrder.amountInCents) !== Number(checked.amountInCents || latestOrder.amountInCents)) throw billingErrors.amountMismatch();
      const now = new Date();
      const periodStart = now;
      const periodEnd = addMonths(periodStart, 1);
      transaction.set(paymentRef, {
        id: paymentRef.id,
        orderId: orderRef.id,
        orderNsu: latestOrder.orderNsu,
        companyId: latestOrder.companyId,
        subscriptionId: latestOrder.subscriptionId,
        provider: this.config.providerId,
        providerTransactionNsu: String(input.transactionNsu || latestOrder.providerTransactionNsu || ''),
        providerInvoiceSlug: String(input.slug || latestOrder.providerInvoiceSlug || ''),
        expectedAmountInCents: latestOrder.amountInCents,
        amountInCents: checked.amountInCents || latestOrder.amountInCents,
        paidAmountInCents: checked.paidAmountInCents || checked.amountInCents || latestOrder.amountInCents,
        captureMethod: checked.captureMethod || latestOrder.captureMethod || '',
        installments: checked.installments || 1,
        receiptUrl: latestOrder.receiptUrl || '',
        status: 'PAID',
        paidAt: iso(now),
        createdAt: iso(now),
        updatedAt: iso(now),
      });
      transaction.update(orderRef, {
        status: 'PAID',
        providerTransactionNsu: String(input.transactionNsu || latestOrder.providerTransactionNsu || ''),
        providerInvoiceSlug: String(input.slug || latestOrder.providerInvoiceSlug || ''),
        captureMethod: checked.captureMethod || '',
        installments: checked.installments || 1,
        paidAt: iso(now),
        updatedAt: iso(now),
      });
      transaction.update(this.db.collection('subscriptions').doc(String(latestOrder.subscriptionId)), {
        status: 'ACTIVE',
        planId: latestOrder.planId,
        provider: this.config.providerId,
        currentPeriodStartedAt: iso(periodStart),
        currentPeriodEndsAt: iso(periodEnd),
        nextBillingDate: iso(periodEnd),
        gracePeriodEndsAt: null,
        suspendedAt: null,
        lastPaymentId: paymentRef.id,
        updatedAt: iso(now),
      });
      transaction.set(this.db.collection('companies').doc(String(latestOrder.companyId)), {
        subscriptionId: latestOrder.subscriptionId,
        accessStatus: 'ACTIVE',
        updatedAt: iso(now),
      }, { merge: true });
      transaction.set(this.db.collection('billingAuditLogs').doc(), {
        companyId: latestOrder.companyId,
        subscriptionId: latestOrder.subscriptionId,
        orderId: orderRef.id,
        paymentId: paymentRef.id,
        action: 'paymentConfirmed',
        actorType: String(input.actorId || '').startsWith('webhook') ? 'PROVIDER_WEBHOOK' : 'USER',
        actorId: input.actorId || '',
        before: { orderStatus: latestOrder.status },
        after: { subscriptionStatus: 'ACTIVE', planId: latestOrder.planId },
        createdAt: iso(now),
      });
    });
  }

  async summary(companyId: string) {
    const [subscriptionQuery, companySnapshot, platformCustomerSnapshot] = await Promise.all([
      this.db.collection('subscriptions').where('customerCompanyId', '==', companyId).limit(1).get(),
      this.db.collection('companies').doc(companyId).get(),
      this.db.collection('platformCustomers').doc(companyId).get(),
    ]);
    const companyData = companySnapshot.exists ? companySnapshot.data() || {} : {};
    const platformCustomerData = platformCustomerSnapshot.exists ? platformCustomerSnapshot.data() || {} : {};
    const rawSubscription = subscriptionQuery.empty ? null : { id: subscriptionQuery.docs[0].id, ...subscriptionQuery.docs[0].data() };
    const subscription = rawSubscription
      ? { ...rawSubscription, status: normalizeStatus((rawSubscription as { status?: unknown }).status) }
      : (
          companySnapshot.exists || platformCustomerSnapshot.exists
            ? {
                id: String(companyData.subscriptionId || platformCustomerData.subscriptionId || `sub-${companyId}`),
                customerCompanyId: companyId,
                planId: String(companyData.subscription?.plan || platformCustomerData.planId || ''),
                status: normalizeStatus(companyData.accessStatus || platformCustomerData.accessStatus || platformCustomerData.status),
                provider: this.config.providerId,
                trialStartedAt: platformCustomerData.trialStartedAt || null,
                trialEndsAt: platformCustomerData.trialEndsAt || null,
                currentPeriodStartedAt: platformCustomerData.trialStartedAt || null,
                currentPeriodEndsAt: platformCustomerData.trialEndsAt || null,
                nextBillingDate: platformCustomerData.trialEndsAt || null,
                gracePeriodEndsAt: null,
                canceledAt: null,
                cancelAtPeriodEnd: false,
                suspendedAt: null,
                lastPaymentId: null,
              }
            : null
        );
    const plan = subscription?.planId ? await this.getPlan(String((subscription as {planId?: string}).planId)).catch(() => null) : null;
    const usage = subscription?.id ? await new PlanEntitlementService(this.db).getUsageSummary(companyId, String((subscription as {id?: string}).id)) : null;
    const orders = await this.db.collection('billingOrders').where('companyId', '==', companyId).limit(50).get();
    const payments = await this.db.collection('payments').where('companyId', '==', companyId).limit(50).get();
    return {
      subscription,
      plan,
      usage,
      orders: orders.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      payments: payments.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      remaining: plan && usage ? new PlanEntitlementService(this.db).enforceEntitlements(plan, usage) : null,
      graceDays: this.config.graceDays,
      serverTime: iso(),
    };
  }

  async audit(companyId: string, subscriptionId: string, orderId: string, paymentId: string, action: string, actorType: string, actorId: string, before: unknown, after: unknown) {
    await this.db.collection('billingAuditLogs').add({ companyId, subscriptionId, orderId, paymentId, action, actorType, actorId, before, after, createdAt: iso() });
  }
}
