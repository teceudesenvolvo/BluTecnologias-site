import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {normalizeStoreSlug, publicProductSlug, validateStoreSlug} from './ecommercePolicy';

const db = () => admin.firestore();
const now = () => new Date().toISOString();

async function assertStoreAdmin(uid: string, companyId: string) {
  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Empresa não informada.');
  const [company, membership, legacy] = await Promise.all([
    db().collection('companies').doc(companyId).get(),
    db().collection('companyMemberships').doc(`${companyId}_${uid}`).get(),
    db().collection('companyUsers').doc(`${companyId}_${uid}`).get(),
  ]);
  const companyData = company.data() || {};
  const access = membership.data() || legacy.data() || {};
  const role = String(access.role || '').toLowerCase();
  const owner = companyId === uid || companyId === `company-${uid}` || companyData.ownerUserId === uid || companyData.createdBy === uid;
  if (!owner && !(access.status !== 'revoked' && (role.includes('administr') || role.includes('propriet') || access.permissions?.ecommerce?.edit === true))) {
    throw new functions.https.HttpsError('permission-denied', 'Você não administra o e-commerce desta empresa.');
  }
  return companyData;
}

async function reservedSlugs() {
  const settings = await db().collection('platformSettings').doc('ecommerce').get().catch(() => null);
  return Array.isArray(settings?.data()?.reservedSlugs) ? settings!.data()!.reservedSlugs.map(String) : [];
}

export const ecommerceStore = functions.https.onCall(async (payload, context) => {
  const action = String(payload?.action || '');
  if (action === 'public_store') {
    const requestedSlug = normalizeStoreSlug(payload?.slug);
    const slugRef = db().collection('storeSlugs').doc(requestedSlug);
    const slugDoc = await slugRef.get();
    if (!slugDoc.exists) throw new functions.https.HttpsError('not-found', 'Loja não encontrada.');
    const slugData = slugDoc.data() || {};
    if (slugData.redirectTo) return {redirectTo: slugData.redirectTo};
    const store = await db().collection('ecommerceStores').doc(String(slugData.storeId || slugData.companyId)).get();
    const storeData = store.data() || {};
    if (!store.exists || storeData.status !== 'active' || storeData.companyId !== slugData.companyId) throw new functions.https.HttpsError('not-found', 'Loja indisponível.');
    const products = await db().collection('products').where('companyId', '==', storeData.companyId).where('active', '==', true).get();
    const catalog = products.docs.filter((item) => item.data().type !== 'service' && item.data().salesChannels?.bluStore === true).map((item) => {
      const value = item.data();
      return {id: item.id, slug: value.publicSlug || publicProductSlug(value.name, item.id), name: value.name, description: value.notes || '', category: value.category || '', priceCents: Number(value.salePriceCents || 0), images: Array.isArray(value.images) ? value.images.slice(0, 3) : [], availableQuantity: Math.max(0, Number(value.stockQuantity || 0) - Number(value.reservedQuantity || 0)), unit: value.unit || 'un'};
    });
    return {store: {id: store.id, slug: storeData.storeSlug, name: storeData.name, description: storeData.description || '', logoUrl: storeData.logoUrl || '', theme: storeData.theme || {}, paymentMethods: storeData.paymentMethods || {}, shipping: storeData.shipping || {}, seo: storeData.seo || {}}, products: catalog};
  }

  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
  const uid = context.auth.uid; const companyId = String(payload?.companyId || '');
  const company = await assertStoreAdmin(uid, companyId);
  if (action === 'get_admin') {
    const [store, products] = await Promise.all([
      db().collection('ecommerceStores').doc(companyId).get(),
      db().collection('products').where('companyId', '==', companyId).get(),
    ]);
    return {store: store.exists ? {id: store.id, ...store.data()} : null, products: products.docs.map((item) => {const value = item.data(); return {id:item.id,name:value.name,type:value.type || 'product',active:value.active !== false,priceCents:Number(value.salePriceCents || 0),stockQuantity:Number(value.stockQuantity || 0),images:Array.isArray(value.images)?value.images.slice(0,3):[],published:value.salesChannels?.bluStore === true};})};
  }
  if (action === 'check_slug') {
    const validation = validateStoreSlug(payload?.slug, await reservedSlugs());
    if (!validation.valid) return {...validation, available: false};
    const existing = await db().collection('storeSlugs').doc(validation.slug).get();
    return {...validation, available: !existing.exists || existing.data()?.companyId === companyId};
  }
  if (action === 'save_store') {
    const validation = validateStoreSlug(payload?.store?.storeSlug, await reservedSlugs());
    if (!validation.valid) throw new functions.https.HttpsError('invalid-argument', validation.reason);
    const storeRef = db().collection('ecommerceStores').doc(companyId); const newSlugRef = db().collection('storeSlugs').doc(validation.slug);
    await db().runTransaction(async (tx) => {
      const [storeSnapshot, slugSnapshot] = await Promise.all([tx.get(storeRef), tx.get(newSlugRef)]);
      if (slugSnapshot.exists && slugSnapshot.data()?.companyId !== companyId) throw new functions.https.HttpsError('already-exists', 'Este endereço já está sendo utilizado.');
      const previous = storeSnapshot.data() || {}; const previousSlug = normalizeStoreSlug(previous.storeSlug);
      const timestamp = now();
      if (previousSlug && previousSlug !== validation.slug) {
        tx.set(db().collection('storeSlugs').doc(previousSlug), {companyId, storeId: companyId, redirectTo: validation.slug, status: 'redirect', updatedAt: timestamp}, {merge: true});
        tx.set(db().collection('storeSlugHistory').doc(), {companyId, storeId: companyId, oldSlug: previousSlug, newSlug: validation.slug, changedBy: uid, createdAt: timestamp});
      }
      tx.set(newSlugRef, {companyId, storeId: companyId, slug: validation.slug, status: 'active', redirectTo: null, updatedAt: timestamp, createdAt: slugSnapshot.data()?.createdAt || timestamp}, {merge: true});
      const input = payload.store || {};
      tx.set(storeRef, {companyId, storeSlug: validation.slug, name: String(input.name || company.tradeName || company.name || company.legalName || 'Minha loja'), description: String(input.description || ''), logoUrl: String(input.logoUrl || company.logoUrl || ''), status: ['draft','active','suspended'].includes(input.status) ? input.status : 'draft', paymentMethods: {pix: Boolean(input.paymentMethods?.pix), creditCard: Boolean(input.paymentMethods?.creditCard), boleto: Boolean(input.paymentMethods?.boleto)}, maxInstallments: Math.min(12, Math.max(1, Number(input.maxInstallments || 1))), shipping: input.shipping || {}, theme: input.theme || {}, seo: input.seo || {}, recipient: previous.recipient || {provider:'pagarme',status:'not_started',onboardingStatus:'not_started'}, meta: previous.meta || {status:'not_connected'}, updatedAt: timestamp, updatedBy: uid, createdAt: previous.createdAt || timestamp, createdBy: previous.createdBy || uid}, {merge: true});
      tx.set(db().collection('auditLogs').doc(), {companyId, userId: uid, action: previousSlug && previousSlug !== validation.slug ? 'STORE_SLUG_CHANGED' : 'STORE_SAVED', entity: 'ecommerceStores', entityId: companyId, metadata: {storeSlug: validation.slug, previousSlug}, createdAt: timestamp});
    });
    return {storeId: companyId, storeSlug: validation.slug};
  }
  if (action === 'update_product_channel') {
    const productId = String(payload?.productId || ''); const productRef = db().collection('products').doc(productId); const snapshot = await productRef.get();
    if (!snapshot.exists || snapshot.data()?.companyId !== companyId) throw new functions.https.HttpsError('not-found', 'Produto não encontrado.');
    const published = Boolean(payload?.published); const timestamp = now();
    await productRef.set({salesChannels: {...(snapshot.data()?.salesChannels || {}), bluStore: published}, publicSlug: snapshot.data()?.publicSlug || publicProductSlug(snapshot.data()?.name, productId), updatedAt: timestamp, updatedBy: uid}, {merge: true});
    await db().collection('salesChannelEvents').add({companyId, productId, channel:'blu_store', event:published?'PRODUCT_PUBLISHED':'PRODUCT_UNPUBLISHED', status:'pending', createdAt:timestamp, createdBy:uid});
    return {productId, published};
  }
  throw new functions.https.HttpsError('invalid-argument', 'Ação inválida.');
});
