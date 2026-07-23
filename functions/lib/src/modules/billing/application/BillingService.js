"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const admin = require("firebase-admin");
const crypto = require("crypto");
const billingTypes_1 = require("../domain/billingTypes");
const PlanEntitlementService_1 = require("./PlanEntitlementService");
const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};
const addMonths = (date, months) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
};
const iso = (date = new Date()) => date.toISOString();
const orderNsu = () => `blu_ord_${crypto.randomBytes(12).toString('hex')}`;
const clean = (value) => JSON.parse(JSON.stringify(value));
class BillingService {
    db;
    provider;
    config;
    constructor(db, provider, config) {
        this.db = db;
        this.provider = provider;
        this.config = config;
    }
    async getPlan(planId) {
        const snapshot = await this.db.collection('plans').doc(planId).get();
        if (!snapshot.exists)
            throw billingTypes_1.billingErrors.planNotFound();
        const plan = { id: snapshot.id, ...snapshot.data() };
        if (!plan.active)
            throw billingTypes_1.billingErrors.planInactive();
        if (!Number.isSafeInteger(Number(plan.priceInCents)) || Number(plan.priceInCents) <= 0)
            throw billingTypes_1.billingErrors.planInactive();
        return plan;
    }
    async getOrCreateSubscription(companyId, planId, userId) {
        const existing = await this.db.collection('subscriptions').where('customerCompanyId', '==', companyId).limit(1).get();
        if (!existing.empty)
            return { id: existing.docs[0].id, ...existing.docs[0].data() };
        const now = new Date();
        const ref = this.db.collection('subscriptions').doc();
        const trialDays = 7;
        const subscription = {
            id: ref.id,
            customerCompanyId: companyId,
            planId,
            status: 'TRIALING',
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
    async createCheckout(input) {
        const plan = await this.getPlan(input.planId);
        if (plan.slug === 'enterprise')
            throw billingTypes_1.billingErrors.invalidPlanChange('Plano Enterprise exige contratação assistida.');
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
    async recordWebhookEvent(event, payloadHash) {
        const order = await this.db.collection('billingOrders').where('orderNsu', '==', event.orderNsu).limit(1).get();
        if (order.empty)
            throw billingTypes_1.billingErrors.orderNotFound();
        const orderData = order.docs[0].data();
        if (orderData.provider !== this.config.providerId)
            throw billingTypes_1.billingErrors.orderNotFound();
        if (Number(orderData.amountInCents) !== Number(event.amountInCents))
            throw billingTypes_1.billingErrors.amountMismatch();
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
    async verifyAndApplyPayment(input) {
        const orderQuery = await this.db.collection('billingOrders').where('orderNsu', '==', input.orderNsu).limit(1).get();
        if (orderQuery.empty)
            throw billingTypes_1.billingErrors.orderNotFound();
        const orderRef = orderQuery.docs[0].ref;
        const order = orderQuery.docs[0].data();
        const checked = await this.provider.checkPayment({ handle: this.config.handle, orderNsu: input.orderNsu, transactionNsu: input.transactionNsu, slug: input.slug });
        if (!checked.success || !checked.paid)
            throw billingTypes_1.billingErrors.paymentNotConfirmed();
        await this.applyPayment(orderRef, order, checked, input);
        return { status: 'PAID', orderId: orderRef.id, subscriptionId: order.subscriptionId };
    }
    async processWebhookEvent(eventId) {
        const eventRef = this.db.collection('billingWebhookEvents').doc(eventId);
        const eventSnapshot = await eventRef.get();
        if (!eventSnapshot.exists)
            return;
        const event = eventSnapshot.data() || {};
        if (event.processingStatus === 'PROCESSED')
            return;
        try {
            const result = await this.verifyAndApplyPayment({
                orderNsu: String(event.orderNsu),
                transactionNsu: String(event.transactionNsu),
                slug: String(event.invoiceSlug),
                actorId: 'webhook:infinitepay',
            });
            await eventRef.update({ processingStatus: 'PROCESSED', processedAt: iso(), result });
        }
        catch (error) {
            await eventRef.update({ processingStatus: 'ERROR', processedAt: iso(), errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' });
            throw error;
        }
    }
    async applyPayment(orderRef, order, checked, input) {
        const paymentId = `${this.config.providerId}_${input.transactionNsu}`;
        const paymentRef = this.db.collection('payments').doc(paymentId);
        await this.db.runTransaction(async (transaction) => {
            const [paymentSnapshot, orderSnapshot] = await Promise.all([transaction.get(paymentRef), transaction.get(orderRef)]);
            if (paymentSnapshot.exists)
                return;
            const latestOrder = orderSnapshot.data() || order;
            if (Number(latestOrder.amountInCents) !== Number(checked.amountInCents || latestOrder.amountInCents))
                throw billingTypes_1.billingErrors.amountMismatch();
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
    async summary(companyId) {
        const subscriptionQuery = await this.db.collection('subscriptions').where('customerCompanyId', '==', companyId).limit(1).get();
        const subscription = subscriptionQuery.empty ? null : { id: subscriptionQuery.docs[0].id, ...subscriptionQuery.docs[0].data() };
        const plan = subscription ? await this.getPlan(String(subscription.planId)).catch(() => null) : null;
        const usage = subscription ? await new PlanEntitlementService_1.PlanEntitlementService(this.db).getUsageSummary(companyId, String(subscription.id)) : null;
        const orders = await this.db.collection('billingOrders').where('companyId', '==', companyId).limit(50).get();
        const payments = await this.db.collection('payments').where('companyId', '==', companyId).limit(50).get();
        return {
            subscription,
            plan,
            usage,
            orders: orders.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            payments: payments.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            remaining: plan && usage ? new PlanEntitlementService_1.PlanEntitlementService(this.db).enforceEntitlements(plan, usage) : null,
            graceDays: this.config.graceDays,
            serverTime: iso(),
        };
    }
    async audit(companyId, subscriptionId, orderId, paymentId, action, actorType, actorId, before, after) {
        await this.db.collection('billingAuditLogs').add({ companyId, subscriptionId, orderId, paymentId, action, actorType, actorId, before, after, createdAt: iso() });
    }
}
exports.BillingService = BillingService;
//# sourceMappingURL=BillingService.js.map