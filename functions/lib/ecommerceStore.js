"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceStore = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const crypto_1 = require("crypto");
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
function normalizeLocation(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function normalizedShipping(value = {}) {
    const modes = ['correios', 'own', 'fixed'];
    const list = (items) => Array.isArray(items) ? items.map((item) => String(item).trim()).filter(Boolean).slice(0, 100) : [];
    return { enabled: Boolean(value.enabled), mode: modes.includes(value.mode) ? value.mode : 'fixed', originPostalCode: String(value.originPostalCode || '').replace(/\D/g, '').slice(0, 8), fixedFeeCents: Math.max(0, Number(value.fixedFeeCents || 0)), freeOverCents: Math.max(0, Number(value.freeOverCents || 0)), estimatedDays: Math.max(0, Math.min(60, Number(value.estimatedDays || 0))), coverage: { states: list(value.coverage?.states).map((item) => item.toUpperCase()), cities: list(value.coverage?.cities), neighborhoods: list(value.coverage?.neighborhoods) }, correios: { services: list(value.correios?.services), contractCode: String(value.correios?.contractCode || ''), credentialsStatus: String(value.correios?.credentialsStatus || 'not_configured'), fallbackFeeCents: Math.max(0, Number(value.correios?.fallbackFeeCents || 0)) } };
}
exports.ecommerceStore = functions.https.onCall(async (payload, context) => {
    const action = String(payload?.action || '');
    if (action === 'book_service') {
        const requestedSlug = (0, ecommercePolicy_1.normalizeStoreSlug)(payload?.slug);
        const slugDoc = await db().collection('storeSlugs').doc(requestedSlug).get();
        const slugData = slugDoc.data() || {};
        if (!slugDoc.exists || slugData.redirectTo)
            throw new functions.https.HttpsError('not-found', 'Loja não encontrada.');
        const store = await db().collection('ecommerceStores').doc(String(slugData.storeId || slugData.companyId)).get();
        const storeData = store.data() || {};
        if (!store.exists || storeData.status !== 'active')
            throw new functions.https.HttpsError('not-found', 'Loja indisponível.');
        const productId = String(payload?.productId || '');
        const definitions = await db().collection('serviceDefinitions').where('companyId', '==', storeData.companyId).where('productId', '==', productId).limit(1).get();
        const definition = definitions.docs[0];
        const service = definition?.data() || {};
        const product = await db().collection('products').doc(productId).get();
        if (!definition || !product.exists || product.data()?.type !== 'service' || product.data()?.salesChannels?.bluStore !== true || !service.onlineBookingEnabled)
            throw new functions.https.HttpsError('failed-precondition', 'Este serviço não aceita agendamento online.');
        const date = String(payload?.date || '');
        const startTime = String(payload?.startTime || '');
        const name = String(payload?.name || '').trim();
        const email = String(payload?.email || '').trim().toLowerCase();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !name || !/^\S+@\S+\.\S+$/.test(email))
            throw new functions.https.HttpsError('invalid-argument', 'Preencha nome, e-mail, data e horário.');
        const appointment = db().collection('serviceAppointments').doc();
        const paymentRequired = service.paymentMode !== 'PAY_ON_SITE';
        const status = paymentRequired ? 'awaiting_payment' : service.requiresConfirmation ? 'requested' : 'confirmed';
        await appointment.set({ companyId: storeData.companyId, storeId: store.id, source: 'ECOMMERCE', serviceId: definition.id, productId, title: String(product.data()?.name || 'Serviço'), clientName: name, clientEmail: email, clientPhone: String(payload?.phone || '').replace(/\D/g, '').slice(0, 13), notes: String(payload?.notes || '').trim().slice(0, 1000), date, startTime, durationMinutes: Number(service.durationMinutes || 60), priceCents: Number(product.data()?.salePriceCents || 0), paymentMode: String(service.paymentMode || 'PAY_ON_SITE'), paymentMethod: paymentRequired ? String(payload?.paymentMethod || 'pix') : 'pay_on_site', paymentStatus: paymentRequired ? 'pending' : 'pay_on_site', status, createdAt: now(), updatedAt: now() });
        await db().collection('notifications').add({ companyId: storeData.companyId, type: 'SERVICE_BOOKING_REQUESTED', title: 'Novo agendamento pela loja', message: `${name} solicitou ${String(product.data()?.name || 'um serviço')} para ${date} às ${startTime}.`, entityType: 'serviceAppointments', entityId: appointment.id, read: false, createdAt: now() });
        return { appointmentId: appointment.id, status };
    }
    if (action === 'register_customer') {
        const requestedSlug = (0, ecommercePolicy_1.normalizeStoreSlug)(payload?.slug);
        const slugDoc = await db().collection('storeSlugs').doc(requestedSlug).get();
        const slugData = slugDoc.data() || {};
        if (!slugDoc.exists || slugData.redirectTo)
            throw new functions.https.HttpsError('not-found', 'Loja não encontrada.');
        const store = await db().collection('ecommerceStores').doc(String(slugData.storeId || slugData.companyId)).get();
        const storeData = store.data() || {};
        if (!store.exists || storeData.status !== 'active' || storeData.companyId !== slugData.companyId)
            throw new functions.https.HttpsError('not-found', 'Loja indisponível.');
        const input = payload?.customer || {};
        const email = String(input.email || '').trim().toLowerCase();
        const name = String(input.name || '').trim();
        const document = String(input.document || '').replace(/\D/g, '').slice(0, 14);
        const phone = String(input.phone || '').replace(/\D/g, '').slice(0, 13);
        if (!name || !/^\S+@\S+\.\S+$/.test(email))
            throw new functions.https.HttpsError('invalid-argument', 'Informe nome e e-mail válidos.');
        if (!input.acceptedPrivacy)
            throw new functions.https.HttpsError('failed-precondition', 'É necessário aceitar o uso dos dados para concluir o cadastro.');
        const address = (value = {}) => ({ postalCode: String(value.postalCode || '').replace(/\D/g, '').slice(0, 8), street: String(value.street || '').trim().slice(0, 160), number: String(value.number || '').trim().slice(0, 20), complement: String(value.complement || '').trim().slice(0, 100), neighborhood: String(value.neighborhood || '').trim().slice(0, 100), city: String(value.city || '').trim().slice(0, 100), state: String(value.state || '').trim().toUpperCase().slice(0, 2) });
        const mainAddress = address(input.address);
        const billingSameAsAddress = input.billingSameAsAddress !== false;
        const customerId = (0, crypto_1.createHash)('sha256').update(`${storeData.companyId}:${email}`).digest('hex');
        const ref = db().collection('storeCustomers').doc(customerId);
        const previous = await ref.get();
        await ref.set({ companyId: storeData.companyId, storeId: store.id, personType: input.personType === 'company' ? 'company' : 'individual', name, email, phone, document, address: mainAddress, billingSameAsAddress, billingAddress: billingSameAsAddress ? mainAddress : address(input.billingAddress), acceptedPrivacyAt: previous.data()?.acceptedPrivacyAt || now(), updatedAt: now(), createdAt: previous.data()?.createdAt || now() }, { merge: true });
        return { customerId };
    }
    if (action === 'quote_delivery') {
        const requestedSlug = (0, ecommercePolicy_1.normalizeStoreSlug)(payload?.slug);
        const slugDoc = await db().collection('storeSlugs').doc(requestedSlug).get();
        const slugData = slugDoc.data() || {};
        if (!slugDoc.exists || slugData.redirectTo)
            throw new functions.https.HttpsError('not-found', 'Loja não encontrada.');
        const store = await db().collection('ecommerceStores').doc(String(slugData.storeId || slugData.companyId)).get();
        const storeData = store.data() || {};
        if (!store.exists || storeData.status !== 'active')
            throw new functions.https.HttpsError('not-found', 'Loja indisponível.');
        const shipping = normalizedShipping(storeData.shipping);
        if (!shipping.enabled)
            return { available: false, feeCents: 0, estimatedDays: 0, method: 'disabled', message: 'Esta loja não oferece entrega para o endereço.' };
        const address = { state: String(payload?.state || '').trim().toUpperCase(), city: normalizeLocation(payload?.city), neighborhood: normalizeLocation(payload?.neighborhood), postalCode: String(payload?.postalCode || '').replace(/\D/g, '').slice(0, 8) };
        if (address.postalCode.length !== 8)
            return { available: false, feeCents: 0, estimatedDays: 0, method: shipping.mode, message: 'Informe um CEP válido.' };
        const allowed = (values, current) => !values.length || values.map(normalizeLocation).includes(normalizeLocation(current));
        const covered = allowed(shipping.coverage.states, address.state) && allowed(shipping.coverage.cities, address.city) && allowed(shipping.coverage.neighborhoods, address.neighborhood);
        if (!covered)
            return { available: false, feeCents: 0, estimatedDays: 0, method: shipping.mode, message: 'Endereço fora da área de entrega configurada.' };
        const subtotal = Math.max(0, Number(payload?.subtotalCents || 0));
        if (shipping.freeOverCents > 0 && subtotal >= shipping.freeOverCents)
            return { available: true, feeCents: 0, estimatedDays: shipping.estimatedDays, method: shipping.mode, message: 'Frete grátis disponível.' };
        if (shipping.mode === 'correios' && shipping.correios.credentialsStatus !== 'active' && !shipping.correios.fallbackFeeCents)
            return { available: false, feeCents: 0, estimatedDays: 0, method: 'correios', message: 'A cotação dos Correios ainda não foi ativada pela loja.' };
        const feeCents = shipping.mode === 'correios' ? shipping.correios.fallbackFeeCents : shipping.fixedFeeCents;
        return { available: true, feeCents, estimatedDays: shipping.estimatedDays, method: shipping.mode, message: 'Entrega disponível para este endereço.' };
    }
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
        const [products, definitions, companySnapshot] = await Promise.all([
            db().collection('products').where('companyId', '==', storeData.companyId).where('active', '==', true).get(),
            db().collection('serviceDefinitions').where('companyId', '==', storeData.companyId).where('active', '==', true).get(),
            db().collection('companies').doc(String(storeData.companyId)).get(),
        ]);
        const serviceByProduct = new Map(definitions.docs.map((item) => [String(item.data().productId), { definitionId: item.id, ...item.data() }]));
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
        const catalogMode = ['products', 'services', 'both'].includes(storeData.catalogMode) ? storeData.catalogMode : 'both';
        const catalog = products.docs.filter((item) => {
            const value = item.data();
            const isService = value.type === 'service';
            if (catalogMode === 'products' && isService)
                return false;
            if (catalogMode === 'services' && !isService)
                return false;
            return value.salesChannels?.bluStore === true;
        }).map((item) => {
            const value = item.data();
            const service = value.type === 'service';
            const definition = serviceByProduct.get(item.id);
            return { id: item.id, type: value.type || 'product', slug: value.publicSlug || (0, ecommercePolicy_1.publicProductSlug)(value.name, item.id), name: value.name, description: value.description || value.notes || '', features: Array.isArray(value.features) ? value.features.slice(0, 30) : [], sizes: Array.isArray(value.sizes) ? value.sizes.slice(0, 30) : [], colors: Array.isArray(value.colors) ? value.colors.slice(0, 30) : [], numbers: Array.isArray(value.numbers) ? value.numbers.slice(0, 30) : [], relatedProductIds: Array.isArray(value.relatedProductIds) ? value.relatedProductIds.slice(0, 20) : [], category: value.category || (service ? 'Serviços' : ''), priceCents: Number(value.salePriceCents || 0), images: Array.isArray(value.images) ? value.images.slice(0, 3) : [], availableQuantity: service ? (definition?.onlineBookingEnabled ? 999 : 0) : Math.max(0, Number(value.stockQuantity || 0) - Number(value.reservedQuantity || 0)), unit: value.unit || (service ? 'serv' : 'un'), service: definition ? { definitionId: definition.definitionId, durationMinutes: Number(definition.durationMinutes || 60), minimumAdvanceMinutes: Number(definition.minimumAdvanceMinutes || 0), maximumAdvanceDays: Number(definition.maximumAdvanceDays || 90), requiresConfirmation: Boolean(definition.requiresConfirmation), paymentMode: String(definition.paymentMode || 'PAY_ON_SITE'), onlineBookingEnabled: Boolean(definition.onlineBookingEnabled) } : undefined };
        });
        return { store: { id: store.id, slug: storeData.storeSlug, name: storeData.name || publicInfo.tradeName, description: storeData.description || '', headerMessage: storeData.headerMessage || '', logoUrl: company.logoUrl || storeData.logoUrl || '', catalogMode, publicInfo, theme: storeData.theme || {}, paymentMethods: storeData.paymentMethods || {}, shipping: storeData.shipping || {}, seo: storeData.seo || {} }, products: catalog };
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
            tx.set(storeRef, { companyId, publicCompanyId: String(input.publicCompanyId || identity.id || ''), storeSlug: validation.slug, name: !requestedName || requestedName === 'Minha empresa' ? companyName : requestedName, description: String(input.description || ''), headerMessage: String(input.headerMessage || ''), logoUrl: String(identity.logoUrl || input.logoUrl || ''), catalogMode: ['products', 'services', 'both'].includes(input.catalogMode) ? input.catalogMode : 'both', administrator, onboarding: { completed: Boolean(input.onboarding?.completed), completedAt: input.onboarding?.completed ? (previous.onboarding?.completedAt || timestamp) : null }, status: ['draft', 'active', 'suspended'].includes(input.status) ? input.status : 'draft', paymentMethods: { pix: Boolean(input.paymentMethods?.pix), creditCard: Boolean(input.paymentMethods?.creditCard), boleto: Boolean(input.paymentMethods?.boleto) }, maxInstallments: Math.min(12, Math.max(1, Number(input.maxInstallments || 1))), shipping: normalizedShipping(input.shipping), theme: input.theme || {}, seo: input.seo || {}, recipient: previous.recipient || { provider: 'pagarme', status: 'not_started', onboardingStatus: 'not_started' }, meta: previous.meta || { status: 'not_connected' }, updatedAt: timestamp, updatedBy: uid, createdAt: previous.createdAt || timestamp, createdBy: previous.createdBy || uid }, { merge: true });
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
        const store = await db().collection('ecommerceStores').doc(companyId).get();
        const catalogMode = store.exists && ['products', 'services', 'both'].includes(store.data()?.catalogMode) ? store.data()?.catalogMode : 'both';
        const isService = snapshot.data()?.type === 'service';
        if (payload?.published && ((catalogMode === 'products' && isService) || (catalogMode === 'services' && !isService))) {
            throw new functions.https.HttpsError('failed-precondition', 'Este tipo de item não está habilitado para a loja.');
        }
        const published = Boolean(payload?.published);
        const timestamp = now();
        await productRef.set({ salesChannels: { ...(snapshot.data()?.salesChannels || {}), bluStore: published }, publicSlug: snapshot.data()?.publicSlug || (0, ecommercePolicy_1.publicProductSlug)(snapshot.data()?.name, productId), updatedAt: timestamp, updatedBy: uid }, { merge: true });
        await db().collection('salesChannelEvents').add({ companyId, productId, channel: 'blu_store', event: published ? 'PRODUCT_PUBLISHED' : 'PRODUCT_UNPUBLISHED', status: 'pending', createdAt: timestamp, createdBy: uid });
        return { productId, published };
    }
    throw new functions.https.HttpsError('invalid-argument', 'Ação inválida.');
});
//# sourceMappingURL=ecommerceStore.js.map