"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyBillingMaintenance = exports.processBillingWebhookEvent = exports.pagarmeWebhook = exports.infinitePayWebhook = exports.billingPaymentCheck = exports.billingAdminPlans = exports.billingGatewayPublic = exports.billingPublicPlans = exports.billingSummary = exports.billingCheckout = void 0;
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
const apiBaseUrl = (handle = '', environment = '') => {
    const configured = env('PAGARME_API_BASE_URL', '').trim();
    if (configured)
        return configured.replace(/\/$/, '');
    const key = String(handle || '').trim();
    if (key.startsWith('sk_test_'))
        return 'https://sdx-api.pagar.me/core/v5';
    if (key.startsWith('sk_'))
        return 'https://api.pagar.me/core/v5';
    const envValue = String(environment || '').trim().toLowerCase();
    if (envValue === 'sandbox' || envValue === 'hmlg' || envValue === 'homologation' || envValue === 'test')
        return 'https://sdx-api.pagar.me/core/v5';
    if (envValue === 'production' || envValue === 'prod' || envValue === 'productional')
        return 'https://api.pagar.me/core/v5';
    return 'https://api.pagar.me/core/v5';
};
const appPublicUrl = () => env('APP_PUBLIC_URL', 'https://blutecnologias-site.web.app').replace(/\/$/, '');
const publicFunctionUrl = () => env('APP_FUNCTIONS_PUBLIC_URL', 'https://us-central1-blutecnologias-site.cloudfunctions.net').replace(/\/$/, '');
const webhookUrl = () => env('PAGARME_WEBHOOK_URL', `${publicFunctionUrl()}/pagarmeWebhook`);
const redirectUrl = () => env('PAGARME_REDIRECT_URL', `${appPublicUrl()}/#/admin/assinatura/retorno`);
const normalizePaymentMethods = (methods) => (Array.isArray(methods) ? methods : ['credit_card', 'boleto', 'debit_card'])
    .map((method) => String(method).toLowerCase())
    .filter((method) => ['credit_card', 'boleto', 'debit_card'].includes(method));
const firstString = (...values) => values.map((value) => String(value || '').trim()).find(Boolean) || '';
const pagarmeProvider = async () => {
    const snapshot = await db().collection('billingProviders').doc('pagarme').get().catch(() => null);
    const providerData = snapshot?.exists ? snapshot.data() || {} : {};
    const savedHandle = firstString(providerData.secretKey, providerData.handle, providerData.apiKey, providerData.secret_key, env('PAGARME_SECRET_KEY'), env('PAGARME_API_KEY'));
    const savedPublicKey = firstString(providerData.publicKey, providerData.publishableKey, providerData.publicApiKey, providerData.clientKey, providerData.public_key, env('VITE_PAGARME_PUBLIC_KEY'), env('PAGARME_PUBLIC_KEY'));
    const handle = savedHandle.startsWith('pk_') ? '' : savedHandle;
    const publicKey = savedPublicKey || (savedHandle.startsWith('pk_') ? savedHandle : '');
    const environment = String(providerData.environment || providerData.env || env('PAGARME_ENVIRONMENT') || 'production').trim().toLowerCase();
    return { handle, publicKey, environment };
};
const billingService = async () => {
    const provider = await pagarmeProvider();
    return new BillingService_1.BillingService(db(), new InfinitePayBillingProvider_1.PagarmeBillingProvider(apiBaseUrl(provider.handle, provider.environment)), {
        providerId: 'pagarme',
        handle: provider.handle,
        redirectUrl: redirectUrl(),
        webhookUrl: webhookUrl(),
        graceDays: Number(env('BLU_BILLING_GRACE_DAYS', '5')),
    });
};
const json = (res, status, body) => res.status(status).json(body);
const requireAuth = async (req) => {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token)
        throw new billingTypes_1.BillingDomainError('UnauthenticatedError', 'Faça login para continuar.');
    const decoded = await admin.auth().verifyIdToken(token);
    const membership = await db().collection('companyUsers').where('userId', '==', decoded.uid).limit(1).get();
    const membershipData = membership.empty ? {} : membership.docs[0].data();
    const companyId = membership.empty ? `company-${decoded.uid}` : String(membershipData.companyId);
    const userSnapshot = await db().collection('users').doc(decoded.uid).get().catch(() => null);
    const userData = userSnapshot?.exists ? userSnapshot.data() || {} : {};
    const billingCompanyId = String(userData.billingCompanyId || userData.primaryBillingCompanyId || companyId);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name, phone: String(membershipData.phone || ''), companyId, billingCompanyId };
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
            const provider = await pagarmeProvider();
            const handle = provider.handle;
            if (!handle)
                throw new billingTypes_1.BillingDomainError('ProviderUnavailableError', 'Gateway Pagar.me sem handle configurado. Defina PAGARME_SECRET_KEY ou billingProviders/pagarme.handle no BluHQ.');
            const user = await requireAuth(req);
            let planId = String(req.body?.planId || '');
            if (!planId) {
                const subscriptionSnapshot = await db().collection('subscriptions').where('customerCompanyId', '==', user.companyId).limit(1).get();
                planId = String(subscriptionSnapshot.docs[0]?.data()?.planId || '');
            }
            if (!planId) {
                const companySnapshot = await db().collection('companies').doc(user.companyId).get();
                const companyData = companySnapshot.exists ? companySnapshot.data() || {} : {};
                const platformCustomerSnapshot = await db().collection('platformCustomers').doc(user.companyId).get();
                const platformCustomerData = platformCustomerSnapshot.exists ? platformCustomerSnapshot.data() || {} : {};
                planId = String(companyData?.subscription?.plan || platformCustomerData?.planId || '');
            }
            const type = String(req.body?.billingOrderType || 'FIRST_SUBSCRIPTION');
            const paymentMethod = String(req.body?.paymentMethod || 'credit_card');
            const allowedPaymentMethods = ['credit_card', 'boleto', 'debit_card'];
            const allowedTypes = ['FIRST_SUBSCRIPTION', 'RENEWAL', 'UPGRADE', 'DOWNGRADE', 'REACTIVATION', 'EXTRA_CAPACITY', 'IMPLEMENTATION', 'MANUAL_CHARGE'];
            if (!planId || !allowedTypes.includes(type) || !allowedPaymentMethods.includes(paymentMethod))
                throw billingTypes_1.billingErrors.invalidPlanChange('Nenhum plano válido foi encontrado para cobrança.');
            const result = await (await billingService()).createCheckout({
                companyId: user.companyId,
                billingCompanyId: user.billingCompanyId,
                userId: user.uid,
                userEmail: user.email,
                userName: user.name,
                userPhone: user.phone,
                planId,
                type,
                paymentMethod,
            });
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
            return json(res, 200, await (await billingService()).summary(user.companyId));
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
        const plans = snapshot.docs.length
            ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), paymentMethods: normalizePaymentMethods(doc.data()?.paymentMethods) }))
            : [];
        const merged = [...plans];
        billingTypes_1.DEFAULT_BILLING_PLANS
            .filter((plan) => plan.slug !== 'test-1-real' && plan.slug !== 'enterprise' && plan.public !== false && plan.active !== false)
            .forEach((plan) => {
            if (!merged.some((item) => String(item.id) === plan.id || String(item.slug) === plan.slug)) {
                merged.push({ ...plan, paymentMethods: normalizePaymentMethods(plan.paymentMethods) });
            }
        });
        const sorted = merged.sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
        return json(res, 200, { plans: sorted });
    });
});
exports.billingGatewayPublic = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        if (req.method !== 'GET')
            return json(res, 405, { message: 'Método não permitido.' });
        const provider = await pagarmeProvider();
        return json(res, 200, {
            providerId: 'pagarme',
            publicKey: provider.publicKey,
            enabled: Boolean(provider.publicKey),
            environment: provider.environment,
        });
    });
});
exports.billingAdminPlans = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        const method = String(req.method || 'GET').toUpperCase();
        if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method))
            return json(res, 405, { message: 'Método não permitido.' });
        try {
            const user = method === 'GET' ? null : await requireAuth(req);
            const adminEmail = String(user?.email || '').toLowerCase();
            if (method !== 'GET' && adminEmail !== 'admin@blutecnologias.com.br') {
                throw new billingTypes_1.BillingDomainError('PermissionDenied', 'Apenas o administrador da Blu pode alterar os planos públicos.');
            }
            if (method === 'GET') {
                const snapshot = await db().collection('plans').orderBy('displayOrder', 'asc').get();
                const plans = snapshot.docs.length
                    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), paymentMethods: normalizePaymentMethods(doc.data()?.paymentMethods) }))
                    : [];
                const merged = [...plans];
                billingTypes_1.DEFAULT_BILLING_PLANS.forEach((plan) => {
                    if (!merged.some((item) => String(item.id) === plan.id || String(item.slug) === plan.slug)) {
                        merged.push({ ...plan, paymentMethods: normalizePaymentMethods(plan.paymentMethods) });
                    }
                });
                return json(res, 200, { plans: merged.sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)) });
            }
            const payload = (req.body || {});
            const action = String(payload.action || payload.mode || 'save').toLowerCase();
            const plan = payload.plan || payload.value || payload;
            const id = String(plan?.id || payload.id || '').trim();
            if (!id)
                throw new billingTypes_1.BillingDomainError('InvalidArgument', 'Informe o identificador do plano.');
            if (action === 'seed') {
                const existing = await db().collection('plans').limit(1).get();
                if (!existing.empty) {
                    return json(res, 200, { seeded: false, plans: existing.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
                }
                const batch = db().batch();
                const now = new Date().toISOString();
                billingTypes_1.DEFAULT_BILLING_PLANS.forEach((item) => {
                    const reference = db().collection('plans').doc(String(item.id));
                    batch.set(reference, { ...item, createdAt: now, updatedAt: now }, { merge: true });
                });
                await batch.commit();
                return json(res, 200, { seeded: true, plans: billingTypes_1.DEFAULT_BILLING_PLANS });
            }
            const normalized = {
                ...plan,
                id,
                slug: String(plan.slug || id),
                name: String(plan.name || '').trim(),
                description: String(plan.description || '').trim(),
                priceInCents: Number(plan.priceInCents || 0),
                billingInterval: String(plan.billingInterval || 'month'),
                intervalCount: Number.isFinite(Number(plan.intervalCount)) ? Number(plan.intervalCount) : 1,
                trialDays: Number(plan.trialDays || 0),
                businessTypes: (Array.isArray(plan.businessTypes) ? plan.businessTypes : ['comercio'])
                    .map((item) => String(item).toLowerCase())
                    .filter((item) => ['comercio', 'servicos'].includes(item))
                    .slice(0, 1),
                modules: [...new Set((Array.isArray(plan.modules) ? plan.modules : [])
                        .map((item) => String(item).trim())
                        .filter(Boolean))],
                featuresByBusinessType: {
                    comercio: (Array.isArray(plan?.featuresByBusinessType?.comercio) ? plan.featuresByBusinessType.comercio : [])
                        .map((item) => String(item).trim()).filter(Boolean),
                    servicos: (Array.isArray(plan?.featuresByBusinessType?.servicos) ? plan.featuresByBusinessType.servicos : [])
                        .map((item) => String(item).trim()).filter(Boolean),
                },
                recommended: plan.recommended === true,
                badge: String(plan.badge || '').trim().slice(0, 60),
                billingType: String(plan.billingType || 'prepaid'),
                cycles: plan.cycles === null ? null : Number.isFinite(Number(plan.cycles)) ? Number(plan.cycles) : null,
                startAt: plan.startAt || null,
                paymentMethods: Array.isArray(plan.paymentMethods) ? plan.paymentMethods : ['credit_card', 'boleto', 'debit_card'],
                installments: Array.isArray(plan.installments) ? plan.installments.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0).slice(0, 1) : [1],
                limits: {
                    companies: plan?.limits?.companies ?? null,
                    activeContracts: plan?.limits?.activeContracts ?? null,
                    storageBytes: plan?.limits?.storageBytes ?? null,
                    users: plan?.limits?.users ?? null,
                    aiCredits: plan?.limits?.aiCredits ?? null,
                    savedSearches: plan?.limits?.savedSearches ?? null,
                    activeAutomations: plan?.limits?.activeAutomations ?? null,
                    customAlerts: plan?.limits?.customAlerts ?? null,
                    apiRequests: plan?.limits?.apiRequests ?? null,
                    certificates: plan?.limits?.certificates ?? null,
                    bankAccounts: plan?.limits?.bankAccounts ?? null,
                },
                active: plan?.active !== false,
                public: plan?.public !== false,
                displayOrder: Number.isFinite(Number(plan.displayOrder)) ? Number(plan.displayOrder) : 0,
                createdAt: String(plan.createdAt || new Date().toISOString()),
                updatedAt: new Date().toISOString(),
            };
            await db().collection('plans').doc(id).set(normalized, { merge: true });
            return json(res, 200, { saved: true, plan: normalized });
        }
        catch (error) {
            return handleError(res, error);
        }
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
            const result = await (await billingService()).verifyAndApplyPayment({
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
            const event = await new InfinitePayBillingProvider_1.PagarmeBillingProvider(apiBaseUrl()).processWebhook(req.body, Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, String(value)])));
            const result = await (await billingService()).recordWebhookEvent(event, payloadHash);
            return json(res, 200, { accepted: true, ...result });
        }
        catch (error) {
            if (error instanceof billingTypes_1.BillingDomainError)
                return handleError(res, error);
            return json(res, 400, { accepted: false, message: error instanceof Error ? error.message : 'Webhook inválido.' });
        }
    });
});
exports.pagarmeWebhook = exports.infinitePayWebhook;
exports.processBillingWebhookEvent = functions.firestore.document('billingWebhookEvents/{eventId}').onCreate(async (snapshot) => {
    await (await billingService()).processWebhookEvent(snapshot.id);
});
exports.dailyBillingMaintenance = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    const now = new Date();
    const today = now.toISOString();
    const subscriptions = await db().collection('subscriptions').where('status', 'in', ['TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'PAYMENT_PENDING']).get();
    const batch = db().batch();
    for (const doc of subscriptions.docs) {
        const data = doc.data();
        const platformCustomerSnapshot = await db().collection('platformCustomers').doc(String(data.customerCompanyId)).get();
        const effectivePlanId = String(platformCustomerSnapshot.data()?.planId || data.planId || '');
        const planSnapshot = effectivePlanId ? await db().collection('plans').doc(effectivePlanId).get() : null;
        const planPriceInCents = planSnapshot?.exists ? Number(planSnapshot.data()?.priceInCents || 0) : null;
        if (planPriceInCents !== null && planPriceInCents <= 0) {
            batch.set(doc.ref, {
                planId: effectivePlanId,
                status: 'ACTIVE',
                trialStartedAt: null,
                trialEndsAt: null,
                currentPeriodEndsAt: null,
                nextBillingDate: null,
                gracePeriodEndsAt: null,
                suspendedAt: null,
                updatedAt: today,
            }, { merge: true });
            batch.set(db().collection('companies').doc(String(data.customerCompanyId)), { accessStatus: 'ACTIVE', updatedAt: today }, { merge: true });
            batch.set(db().collection('platformCustomers').doc(String(data.customerCompanyId)), { accessStatus: 'ACTIVE', status: 'ACTIVE', updatedAt: today }, { merge: true });
            continue;
        }
        const nextBilling = String(data.nextBillingDate || data.trialEndsAt || '');
        const graceEnds = String(data.gracePeriodEndsAt || '');
        if (nextBilling && nextBilling < today && ['TRIALING', 'ACTIVE', 'PAYMENT_PENDING'].includes(String(data.status))) {
            const grace = new Date(now);
            grace.setDate(grace.getDate() + Number(env('BLU_BILLING_GRACE_DAYS', '5')));
            batch.update(doc.ref, { status: 'GRACE_PERIOD', gracePeriodEndsAt: grace.toISOString(), updatedAt: today });
            batch.set(db().collection('companies').doc(String(data.customerCompanyId)), { accessStatus: 'GRACE_PERIOD', updatedAt: today }, { merge: true });
        }
        else if (graceEnds && graceEnds < today && String(data.status) === 'GRACE_PERIOD') {
            batch.update(doc.ref, { status: 'SUSPENDED', suspendedAt: today, updatedAt: today });
            batch.set(db().collection('companies').doc(String(data.customerCompanyId)), { accessStatus: 'SUSPENDED', updatedAt: today }, { merge: true });
        }
    }
    await batch.commit();
});
//# sourceMappingURL=billingFunctions.js.map