"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyBillingMaintenance = exports.processBillingWebhookEvent = exports.infinitePayWebhook = exports.billingPaymentCheck = exports.billingPublicPlans = exports.billingSummary = exports.billingCheckout = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
const crypto = require("crypto");
const billingTypes_1 = require("../domain/billingTypes");
const InfinitePayBillingProvider_1 = require("../infrastructure/InfinitePayBillingProvider");
const BillingService_1 = require("../application/BillingService");
const corsHandler = cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'] });
const db = () => admin.firestore();
const env = (name, fallback = '') => process.env[name] || fallback;
const apiBaseUrl = () => env('INFINITEPAY_API_BASE_URL', 'https://api.checkout.infinitepay.io').replace(/\/$/, '');
const appPublicUrl = () => env('APP_PUBLIC_URL', 'http://localhost:5173').replace(/\/$/, '');
const publicFunctionUrl = () => env('APP_FUNCTIONS_PUBLIC_URL', appPublicUrl()).replace(/\/$/, '');
const webhookUrl = () => env('INFINITEPAY_WEBHOOK_URL', `${publicFunctionUrl()}/api/webhooks/infinitepay`);
const redirectUrl = () => env('INFINITEPAY_REDIRECT_URL', `${appPublicUrl()}/#/admin/assinatura/retorno`);
const infinitePayHandle = () => env('INFINITEPAY_HANDLE');
const billingService = () => new BillingService_1.BillingService(db(), new InfinitePayBillingProvider_1.InfinitePayBillingProvider(apiBaseUrl()), {
    providerId: 'infinitepay',
    handle: infinitePayHandle(),
    redirectUrl: redirectUrl(),
    webhookUrl: webhookUrl(),
    graceDays: Number(env('BLU_BILLING_GRACE_DAYS', '7')),
});
const json = (res, status, body) => res.status(status).json(body);
const requireAuth = async (req) => {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token)
        throw new billingTypes_1.BillingDomainError('UnauthenticatedError', 'Faça login para continuar.');
    const decoded = await admin.auth().verifyIdToken(token);
    const membership = await db().collection('companyUsers').where('userId', '==', decoded.uid).limit(1).get();
    const companyId = membership.empty ? `company-${decoded.uid}` : String(membership.docs[0].data().companyId);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name, companyId };
};
const handleError = (res, error) => {
    if (error instanceof billingTypes_1.BillingDomainError)
        return json(res, error.code.includes('NotFound') ? 404 : error.code.includes('Unauthenticated') ? 401 : 400, { code: error.code, message: error.message });
    console.error('billing error:', error);
    return json(res, 500, { code: 'BillingInternalError', message: 'Não foi possível processar a solicitação de cobrança.' });
};
exports.billingCheckout = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        if (req.method !== 'POST')
            return json(res, 405, { message: 'Método não permitido.' });
        try {
            if (!infinitePayHandle())
                throw billingTypes_1.billingErrors.providerUnavailable();
            const user = await requireAuth(req);
            const planId = String(req.body?.planId || '');
            const type = String(req.body?.billingOrderType || 'FIRST_SUBSCRIPTION');
            const allowedTypes = ['FIRST_SUBSCRIPTION', 'RENEWAL', 'UPGRADE', 'DOWNGRADE', 'REACTIVATION', 'EXTRA_CAPACITY', 'IMPLEMENTATION', 'MANUAL_CHARGE'];
            if (!planId || !allowedTypes.includes(type))
                throw billingTypes_1.billingErrors.invalidPlanChange();
            const result = await billingService().createCheckout({ companyId: user.companyId, userId: user.uid, userEmail: user.email, userName: user.name, planId, type });
            return json(res, 200, result);
        }
        catch (error) {
            return handleError(res, error);
        }
    });
});
exports.billingSummary = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        if (req.method !== 'GET')
            return json(res, 405, { message: 'Método não permitido.' });
        try {
            const user = await requireAuth(req);
            return json(res, 200, await billingService().summary(user.companyId));
        }
        catch (error) {
            return handleError(res, error);
        }
    });
});
exports.billingPublicPlans = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        if (req.method !== 'GET')
            return json(res, 405, { message: 'Método não permitido.' });
        const snapshot = await db().collection('plans').where('active', '==', true).where('public', '==', true).get();
        return json(res, 200, { plans: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)) });
    });
});
exports.billingPaymentCheck = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        if (req.method !== 'POST')
            return json(res, 405, { message: 'Método não permitido.' });
        try {
            await requireAuth(req);
            const result = await billingService().verifyAndApplyPayment({
                orderNsu: String(req.body?.order_nsu || req.body?.orderNsu || ''),
                transactionNsu: String(req.body?.transaction_nsu || req.body?.transactionNsu || ''),
                slug: String(req.body?.slug || req.body?.invoice_slug || ''),
                actorId: 'customer:return-page',
            });
            return json(res, 200, result);
        }
        catch (error) {
            return handleError(res, error);
        }
    });
});
exports.infinitePayWebhook = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST')
            return json(res, 405, { message: 'Método não permitido.' });
        try {
            const payloadHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
            const event = await new InfinitePayBillingProvider_1.InfinitePayBillingProvider(apiBaseUrl()).processWebhook(req.body, Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, String(value)])));
            const result = await billingService().recordWebhookEvent(event, payloadHash);
            return json(res, 200, { accepted: true, ...result });
        }
        catch (error) {
            if (error instanceof billingTypes_1.BillingDomainError)
                return handleError(res, error);
            return json(res, 400, { accepted: false, message: error instanceof Error ? error.message : 'Webhook inválido.' });
        }
    });
});
exports.processBillingWebhookEvent = functions.firestore.document('billingWebhookEvents/{eventId}').onCreate(async (snapshot) => {
    await billingService().processWebhookEvent(snapshot.id);
});
exports.dailyBillingMaintenance = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    const now = new Date();
    const today = now.toISOString();
    const subscriptions = await db().collection('subscriptions').where('status', 'in', ['TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'PAYMENT_PENDING']).get();
    const batch = db().batch();
    subscriptions.docs.forEach((doc) => {
        const data = doc.data();
        const nextBilling = String(data.nextBillingDate || data.trialEndsAt || '');
        const graceEnds = String(data.gracePeriodEndsAt || '');
        if (nextBilling && nextBilling < today && ['TRIALING', 'ACTIVE', 'PAYMENT_PENDING'].includes(String(data.status))) {
            const grace = new Date(now);
            grace.setDate(grace.getDate() + Number(env('BLU_BILLING_GRACE_DAYS', '7')));
            batch.update(doc.ref, { status: 'GRACE_PERIOD', gracePeriodEndsAt: grace.toISOString(), updatedAt: today });
            batch.set(db().collection('companies').doc(String(data.customerCompanyId)), { accessStatus: 'GRACE_PERIOD', updatedAt: today }, { merge: true });
        }
        else if (graceEnds && graceEnds < today && String(data.status) === 'GRACE_PERIOD') {
            batch.update(doc.ref, { status: 'SUSPENDED', suspendedAt: today, updatedAt: today });
            batch.set(db().collection('companies').doc(String(data.customerCompanyId)), { accessStatus: 'SUSPENDED', updatedAt: today }, { merge: true });
        }
    });
    await batch.commit();
});
//# sourceMappingURL=billingFunctions.js.map