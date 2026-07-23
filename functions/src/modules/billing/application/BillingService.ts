import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  BillingOrderType,
  BillingPlan,
  billingErrors,
  BillingProvider,
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

export class BillingService {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly provider: BillingProvider,
    private readonly config: {
      providerId: 'infinitepay';
      handle: string;
      redirectUrl: string;
      webhookUrl: string;
      graceDays: number;
    },
  ) {}

  async getPlan(planId: string): Promise<BillingPlan> {
    const snapshot = await this.db.collection('plans').doc(planId).get();
    if (!snapshot.exists) throw billingErrors.planNotFound();
    const plan = { id: snapshot.id, ...snapshot.data() } as BillingPlan;
    if (!plan.active) throw billingErrors.planInactive();
    if (!Number.isSafeInteger(Number(plan.priceInCents)) || Number(plan.priceInCents) <= 0) throw billingErrors.planInactive();
    return plan;
  }

  async getOrCreateSubscription(companyId: string, planId: string, userId: string) {
    const existing = await this.db.collection('subscriptions').where('customerCompanyId', '==', companyId).limit(1).get();
    if (!existing.empty) return { id: existing.docs[0].id, ...existing.docs[0].data() };
    const now = new Date();
    const ref = this.db.collection('subscriptions').doc();
    const trialDays = 7;
    const subscription = {
      id: ref.id,
      customerCompanyId: companyId,
      planId,
      status: 'TRIALING' as SubscriptionStatus,
      provider: this.config.providerId,
      trialStartedAt: iso(now),
      trialEndsAt: iso(addDays(now, trialDays)),
      currentPeriodStartedAt: iso(now),
      currentPeriodEndsAt: iso(addDays(now, trialDays)),
      nextBillingDate: iso(addDays(now, trialDays)),
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
    await this.db.collection('companies').doc(companyId).set({ subscriptionId: ref.id, accessStatus: 'TRIALING', updatedAt: iso() }, { merge: true });
    return subscription;
  }

  async createCheckout(input: {companyId: string; userId: string; userEmail?: string; userName?: string; planId: string; type: BillingOrderType}) {
    const plan = await this.getPlan(input.planId);
    if (plan.slug === 'enterprise') throw billingErrors.invalidPlanChange('Plano Enterprise exige contratação assistida.');
    const subscription = await this.getOrCreateSubscription(input.companyId, plan.id, input.userId);
    const now = iso();
    const ref = this.db.collection('billingOrders').doc();
    const nsu = orderNsu();
    const description = `${plan.name} Blu - ${plan.billingInterval === 'year' ? 'anual' : 'mensal'}`;
    await ref.set({
      id: ref.id,
      orderNsu: nsu,
      companyId: input.companyId,
      subscriptionId: subscription.id,
      planId: plan.id,
      type: input.type,
      status: 'CREATED',
      amountInCents: Number(plan.priceInCents),
      currency: 'BRL',
      description,
      checkoutUrl: '',
      provider: this.config.providerId,
      providerInvoiceSlug: '',
      providerTransactionNsu: '',
      captureMethod: '',
      installments: 1,
      receiptUrl: '',
      expiresAt: iso(addDays(new Date(), 3)),
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.userId,
    });
    const checkout = await this.provider.createCheckout({
      handle: this.config.handle,
      redirectUrl: this.config.redirectUrl,
      webhookUrl: this.config.webhookUrl,
      orderNsu: nsu,
      amountInCents: Number(plan.priceInCents),
      description,
      customer: { name: input.userName, email: input.userEmail },
    });
    await ref.update({ checkoutUrl: checkout.checkoutUrl, status: 'CHECKOUT_CREATED', updatedAt: iso(), providerResponse: clean(checkout.raw) });
    await this.audit(input.companyId, subscription.id, ref.id, '', 'checkoutCreated', 'USER', input.userId, null, { planId: plan.id, amountInCents: plan.priceInCents });
    return { orderId: ref.id, orderNsu: nsu, checkoutUrl: checkout.checkoutUrl, amountInCents: plan.priceInCents, planName: plan.name };
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

  async verifyAndApplyPayment(input: {orderNsu: string; transactionNsu: string; slug: string; actorId?: string}) {
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
        actorId: 'webhook:infinitepay',
      });
      await eventRef.update({ processingStatus: 'PROCESSED', processedAt: iso(), result });
    } catch (error) {
      await eventRef.update({ processingStatus: 'ERROR', processedAt: iso(), errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' });
      throw error;
    }
  }

  private async applyPayment(orderRef: admin.firestore.DocumentReference, order: admin.firestore.DocumentData, checked: PaymentCheckResult, input: {transactionNsu: string; slug: string; actorId?: string}) {
    const paymentId = `${this.config.providerId}_${input.transactionNsu}`;
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
        providerTransactionNsu: input.transactionNsu,
        providerInvoiceSlug: input.slug,
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
        providerTransactionNsu: input.transactionNsu,
        providerInvoiceSlug: input.slug,
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
    const subscriptionQuery = await this.db.collection('subscriptions').where('customerCompanyId', '==', companyId).limit(1).get();
    const subscription = subscriptionQuery.empty ? null : { id: subscriptionQuery.docs[0].id, ...subscriptionQuery.docs[0].data() };
    const plan = subscription ? await this.getPlan(String((subscription as {planId?: string}).planId)).catch(() => null) : null;
    const usage = subscription ? await new PlanEntitlementService(this.db).getUsageSummary(companyId, String((subscription as {id?: string}).id)) : null;
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
