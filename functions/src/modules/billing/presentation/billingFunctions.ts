import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as crypto from 'crypto';
import { BillingOrderType, billingErrors, BillingDomainError } from '../domain/billingTypes';
import { InfinitePayBillingProvider } from '../infrastructure/InfinitePayBillingProvider';
import { BillingService } from '../application/BillingService';

const corsHandler = cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'] });
const db = () => admin.firestore();

const env = (name: string, fallback = '') => process.env[name] || fallback;
const apiBaseUrl = () => env('INFINITEPAY_API_BASE_URL', 'https://api.checkout.infinitepay.io').replace(/\/$/, '');
const appPublicUrl = () => env('APP_PUBLIC_URL', 'http://localhost:5173').replace(/\/$/, '');
const publicFunctionUrl = () => env('APP_FUNCTIONS_PUBLIC_URL', appPublicUrl()).replace(/\/$/, '');
const webhookUrl = () => env('INFINITEPAY_WEBHOOK_URL', `${publicFunctionUrl()}/api/webhooks/infinitepay`);
const redirectUrl = () => env('INFINITEPAY_REDIRECT_URL', `${appPublicUrl()}/#/admin/assinatura/retorno`);
const infinitePayHandle = () => env('INFINITEPAY_HANDLE');

const billingService = () => new BillingService(db(), new InfinitePayBillingProvider(apiBaseUrl()), {
  providerId: 'infinitepay',
  handle: infinitePayHandle(),
  redirectUrl: redirectUrl(),
  webhookUrl: webhookUrl(),
  graceDays: Number(env('BLU_BILLING_GRACE_DAYS', '7')),
});

const json = (res: functions.Response, status: number, body: unknown) => res.status(status).json(body);

const requireAuth = async (req: functions.Request) => {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new BillingDomainError('UnauthenticatedError', 'Faça login para continuar.');
  const decoded = await admin.auth().verifyIdToken(token);
  const membership = await db().collection('companyUsers').where('userId', '==', decoded.uid).limit(1).get();
  const companyId = membership.empty ? `company-${decoded.uid}` : String(membership.docs[0].data().companyId);
  return { uid: decoded.uid, email: decoded.email, name: decoded.name, companyId };
};

const handleError = (res: functions.Response, error: unknown) => {
  if (error instanceof BillingDomainError) return json(res, error.code.includes('NotFound') ? 404 : error.code.includes('Unauthenticated') ? 401 : 400, { code: error.code, message: error.message });
  console.error('billing error:', error);
  return json(res, 500, { code: 'BillingInternalError', message: 'Não foi possível processar a solicitação de cobrança.' });
};

export const billingCheckout = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { message: 'Método não permitido.' });
    try {
      if (!infinitePayHandle()) throw billingErrors.providerUnavailable();
      const user = await requireAuth(req);
      const planId = String(req.body?.planId || '');
      const type = String(req.body?.billingOrderType || 'FIRST_SUBSCRIPTION') as BillingOrderType;
      const allowedTypes: BillingOrderType[] = ['FIRST_SUBSCRIPTION', 'RENEWAL', 'UPGRADE', 'DOWNGRADE', 'REACTIVATION', 'EXTRA_CAPACITY', 'IMPLEMENTATION', 'MANUAL_CHARGE'];
      if (!planId || !allowedTypes.includes(type)) throw billingErrors.invalidPlanChange();
      const result = await billingService().createCheckout({ companyId: user.companyId, userId: user.uid, userEmail: user.email, userName: user.name, planId, type });
      return json(res, 200, result);
    } catch (error) {
      return handleError(res, error);
    }
  });
});

export const billingSummary = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'GET') return json(res, 405, { message: 'Método não permitido.' });
    try {
      const user = await requireAuth(req);
      return json(res, 200, await billingService().summary(user.companyId));
    } catch (error) {
      return handleError(res, error);
    }
  });
});

export const billingPublicPlans = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'GET') return json(res, 405, { message: 'Método não permitido.' });
    const snapshot = await db().collection('plans').where('active', '==', true).where('public', '==', true).get();
    return json(res, 200, { plans: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)) });
  });
});

export const billingPaymentCheck = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { message: 'Método não permitido.' });
    try {
      await requireAuth(req);
      const result = await billingService().verifyAndApplyPayment({
        orderNsu: String(req.body?.order_nsu || req.body?.orderNsu || ''),
        transactionNsu: String(req.body?.transaction_nsu || req.body?.transactionNsu || ''),
        slug: String(req.body?.slug || req.body?.invoice_slug || ''),
        actorId: 'customer:return-page',
      });
      return json(res, 200, result);
    } catch (error) {
      return handleError(res, error);
    }
  });
});

export const infinitePayWebhook = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') return json(res, 405, { message: 'Método não permitido.' });
    try {
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
      const event = await new InfinitePayBillingProvider(apiBaseUrl()).processWebhook(req.body, Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, String(value)])));
      const result = await billingService().recordWebhookEvent(event, payloadHash);
      return json(res, 200, { accepted: true, ...result });
    } catch (error) {
      if (error instanceof BillingDomainError) return handleError(res, error);
      return json(res, 400, { accepted: false, message: error instanceof Error ? error.message : 'Webhook inválido.' });
    }
  });
});

export const processBillingWebhookEvent = functions.firestore.document('billingWebhookEvents/{eventId}').onCreate(async (snapshot) => {
  await billingService().processWebhookEvent(snapshot.id);
});

export const dailyBillingMaintenance = functions.pubsub.schedule('every 24 hours').onRun(async () => {
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
    } else if (graceEnds && graceEnds < today && String(data.status) === 'GRACE_PERIOD') {
      batch.update(doc.ref, { status: 'SUSPENDED', suspendedAt: today, updatedAt: today });
      batch.set(db().collection('companies').doc(String(data.customerCompanyId)), { accessStatus: 'SUSPENDED', updatedAt: today }, { merge: true });
    }
  });
  await batch.commit();
});
