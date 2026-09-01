"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceStore = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const ecommercePolicy_1 = require("./ecommercePolicy");
const db = () => admin.firestore();
const now = () => new Date().toISOString();
async function assertStoreAdmin(uid, companyId) {
    if (!companyId)
        throw new functions.https.HttpsError('invalid-argument', 'Empresa não informada.');
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
    return Array.isArray(settings?.data()?.reservedSlugs) ? settings.data().reservedSlugs.map(String) : [];
}
async function legalCompanies(companyId) {
    const settings = await db().collection('companies').doc(companyId).collection('settings').doc('legalEntities').get().catch(() => null);
    return Array.isArray(settings?.data()?.companies) ? settings.data().companies : [];
}
async function publicCompanyIdentity(companyId, root = {}, preferredId = '') {
    const companies = await legalCompanies(companyId);
    const selected = companies.find((item) => String(item?.id || '') === String(preferredId || root.primaryBillingCompanyId || root.billingCompanyId || '')) || companies[0] || {};
    return { ...root, ...selected };
}
exports.ecommerceStore = functions.https.onCall(async (payload, context) => {
    const action = String(payload?.action || '');
    if (action === 'public_store') {
        const requestedSlug = (0, ecommercePolicy_1.normalizeStoreSlug)(payload?.slug);
        const slugRef = db().collection('storeSlugs').doc(requestedSlug);
        const slugDoc = await slugRef.get();
        if (!slugDoc.exists)
            throw new functions.https.HttpsError('not-found', 'Loja não encontrada.');
        const slugData = slugDoc.data() || {};
        if (slugData.redirectTo)
            return { redirectTo: slugData.redirectTo };
        const store = await db().collection('ecommerceStores').doc(String(slugData.storeId || slugData.companyId)).get();
        const storeData = store.data() || {};
        if (!store.exists || storeData.status !== 'active' || storeData.companyId !== slugData.companyId)
            throw new functions.https.HttpsError('not-found', 'Loja indisponível.');
        const [products, companySnapshot] = await Promise.all([
            db().collection('products').where('companyId', '==', storeData.companyId).where('active', '==', true).get(),
            db().collection('companies').doc(String(storeData.companyId)).get(),
        ]);
        const company = await publicCompanyIdentity(String(storeData.companyId), companySnapshot.data() || {}, String(storeData.publicCompanyId || ''));
        const publicInfo = {
            legalName: String(company.razaoSocial || company.legalName || company.name || ''),
            tradeName: String(company.nomeFantasia || company.tradeName || company.razaoSocial || company.name || ''),
            document: String(company.cnpj || company.document || ''),
            city: String(company.municipio || company.city || ''),
            state: String(company.uf || company.state || ''),
            phone: String(company.telefoneCelular || company.phone || ''),
            email: String(company.email || ''),
        };
        const catalog = products.docs.filter((item) => item.data().type !== 'service' && item.data().salesChannels?.bluStore === true).map((item) => {
            const value = item.data();
            return { id: item.id, slug: value.publicSlug || (0, ecommercePolicy_1.publicProductSlug)(value.name, item.id), name: value.name, description: value.notes || '', category: value.category || '', priceCents: Number(value.salePriceCents || 0), images: Array.isArray(value.images) ? value.images.slice(0, 3) : [], availableQuantity: Math.max(0, Number(value.stockQuantity || 0) - Number(value.reservedQuantity || 0)), unit: value.unit || 'un' };
        });
        return { store: { id: store.id, slug: storeData.storeSlug, name: storeData.name || publicInfo.tradeName, description: storeData.description || '', headerMessage: storeData.headerMessage || '', logoUrl: company.logoUrl || storeData.logoUrl || '', publicInfo, theme: storeData.theme || {}, paymentMethods: storeData.paymentMethods || {}, shipping: storeData.shipping || {}, seo: storeData.seo || {} }, products: catalog };
    }
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const uid = context.auth.uid;
    const companyId = String(payload?.companyId || '');
    const company = await assertStoreAdmin(uid, companyId);
    if (action === 'get_admin') {
        const [store, products] = await Promise.all([
            db().collection('ecommerceStores').doc(companyId).get(),
            db().collection('products').where('companyId', '==', companyId).get(),
        ]);
        const storeData = store.data() || {};
        const companies = await legalCompanies(companyId);
        const identity = await publicCompanyIdentity(companyId, company, String(storeData.publicCompanyId || ''));
        const companyName = String(identity.nomeFantasia || identity.tradeName || identity.razaoSocial || identity.legalName || identity.name || 'Minha loja');
        const publicCompanies = companies.map((item) => ({ id: String(item.id || item.cnpj || ''), legalName: String(item.razaoSocial || item.legalName || item.name || ''), tradeName: String(item.nomeFantasia || item.tradeName || item.razaoSocial || item.name || ''), document: String(item.cnpj || item.document || ''), logoUrl: String(item.logoUrl || ''), city: String(item.municipio || item.city || ''), state: String(item.uf || item.state || ''), email: String(item.email || ''), phone: String(item.telefoneCelular || item.phone || '') }));
        return { store: store.exists ? { id: store.id, ...storeData, name: storeData.name || companyName, logoUrl: identity.logoUrl || storeData.logoUrl || '' } : null, companies: publicCompanies, products: products.docs.map((item) => { const value = item.data(); return { id: item.id, name: value.name, type: value.type || 'product', active: value.active !== false, priceCents: Number(value.salePriceCents || 0), stockQuantity: Number(value.stockQuantity || 0), images: Array.isArray(value.images) ? value.images.slice(0, 3) : [], published: value.salesChannels?.bluStore === true }; }) };
    }
    if (action === 'check_slug') {
        const validation = (0, ecommercePolicy_1.validateStoreSlug)(payload?.slug, await reservedSlugs());
        if (!validation.valid)
            return { ...validation, available: false };
        const existing = await db().collection('storeSlugs').doc(validation.slug).get();
        return { ...validation, available: !existing.exists || existing.data()?.companyId === companyId };
    }
    if (action === 'save_store') {
        const input = payload.store || {};
        const identity = await publicCompanyIdentity(companyId, company, String(input.publicCompanyId || ''));
        const validation = (0, ecommercePolicy_1.validateStoreSlug)(payload?.store?.storeSlug, await reservedSlugs());
        if (!validation.valid)
            throw new functions.https.HttpsError('invalid-argument', validation.reason);
        const storeRef = db().collection('ecommerceStores').doc(companyId);
        const newSlugRef = db().collection('storeSlugs').doc(validation.slug);
        await db().runTransaction(async (tx) => {
            const [storeSnapshot, slugSnapshot] = await Promise.all([tx.get(storeRef), tx.get(newSlugRef)]);
            if (slugSnapshot.exists && slugSnapshot.data()?.companyId !== companyId)
                throw new functions.https.HttpsError('already-exists', 'Este endereço já está sendo utilizado.');
            const previous = storeSnapshot.data() || {};
            const previousSlug = (0, ecommercePolicy_1.normalizeStoreSlug)(previous.storeSlug);
            const timestamp = now();
            if (previousSlug && previousSlug !== validation.slug) {
                tx.set(db().collection('storeSlugs').doc(previousSlug), { companyId, storeId: companyId, redirectTo: validation.slug, status: 'redirect', updatedAt: timestamp }, { merge: true });
                tx.set(db().collection('storeSlugHistory').doc(), { companyId, storeId: companyId, oldSlug: previousSlug, newSlug: validation.slug, changedBy: uid, createdAt: timestamp });
            }
            tx.set(newSlugRef, { companyId, storeId: companyId, slug: validation.slug, status: 'active', redirectTo: null, updatedAt: timestamp, createdAt: slugSnapshot.data()?.createdAt || timestamp }, { merge: true });
            const companyName = String(identity.nomeFantasia || identity.tradeName || identity.razaoSocial || identity.legalName || identity.name || 'Minha loja');
            const requestedName = String(input.name || '').trim();
            const authEmail = String(context.auth?.token?.email || '').trim().toLowerCase();
            const requestedAdmin = input.administrator || {};
            const administrator = { userId: authEmail && authEmail === String(requestedAdmin.email || authEmail).trim().toLowerCase() ? uid : String(requestedAdmin.userId || ''), name: String(requestedAdmin.name || context.auth?.token?.name || authEmail || 'Administrador'), email: String(requestedAdmin.email || authEmail).trim().toLowerCase(), role: 'ecommerce_admin', status: authEmail && authEmail === String(requestedAdmin.email || authEmail).trim().toLowerCase() ? 'active' : 'pending' };
            tx.set(storeRef, { companyId, publicCompanyId: String(input.publicCompanyId || identity.id || ''), storeSlug: validation.slug, name: !requestedName || requestedName === 'Minha empresa' ? companyName : requestedName, description: String(input.description || ''), headerMessage: String(input.headerMessage || ''), logoUrl: String(identity.logoUrl || input.logoUrl || ''), administrator, onboarding: { completed: Boolean(input.onboarding?.completed), completedAt: input.onboarding?.completed ? (previous.onboarding?.completedAt || timestamp) : null }, status: ['draft', 'active', 'suspended'].includes(input.status) ? input.status : 'draft', paymentMethods: { pix: Boolean(input.paymentMethods?.pix), creditCard: Boolean(input.paymentMethods?.creditCard), boleto: Boolean(input.paymentMethods?.boleto) }, maxInstallments: Math.min(12, Math.max(1, Number(input.maxInstallments || 1))), shipping: input.shipping || {}, theme: input.theme || {}, seo: input.seo || {}, recipient: previous.recipient || { provider: 'pagarme', status: 'not_started', onboardingStatus: 'not_started' }, meta: previous.meta || { status: 'not_connected' }, updatedAt: timestamp, updatedBy: uid, createdAt: previous.createdAt || timestamp, createdBy: previous.createdBy || uid }, { merge: true });
            if (administrator.status === 'pending' && administrator.email && administrator.email !== previous.administrator?.email) {
                const invitationId = `${companyId}_ecommerce_${administrator.email.replace(/[^a-z0-9]/g, '_')}`;
                tx.set(db().collection('teamInvitations').doc(invitationId), { email: administrator.email, name: administrator.name, role: 'Administrador do E-commerce', userType: 'ecommerce_admin', companyIds: [companyId], status: 'pending', createdBy: uid, createdAt: timestamp, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }, { merge: true });
            }
            tx.set(db().collection('auditLogs').doc(), { companyId, userId: uid, action: previousSlug && previousSlug !== validation.slug ? 'STORE_SLUG_CHANGED' : 'STORE_SAVED', entity: 'ecommerceStores', entityId: companyId, metadata: { storeSlug: validation.slug, previousSlug }, createdAt: timestamp });
        });
        return { storeId: companyId, storeSlug: validation.slug };
    }
    if (action === 'update_product_channel') {
        const productId = String(payload?.productId || '');
        const productRef = db().collection('products').doc(productId);
        const snapshot = await productRef.get();
        if (!snapshot.exists || snapshot.data()?.companyId !== companyId)
            throw new functions.https.HttpsError('not-found', 'Produto não encontrado.');
        const published = Boolean(payload?.published);
        const timestamp = now();
        await productRef.set({ salesChannels: { ...(snapshot.data()?.salesChannels || {}), bluStore: published }, publicSlug: snapshot.data()?.publicSlug || (0, ecommercePolicy_1.publicProductSlug)(snapshot.data()?.name, productId), updatedAt: timestamp, updatedBy: uid }, { merge: true });
        await db().collection('salesChannelEvents').add({ companyId, productId, channel: 'blu_store', event: published ? 'PRODUCT_PUBLISHED' : 'PRODUCT_UNPUBLISHED', status: 'pending', createdAt: timestamp, createdBy: uid });
        return { productId, published };
    }
    throw new functions.https.HttpsError('invalid-argument', 'Ação inválida.');
});
//# sourceMappingURL=ecommerceStore.js.map