"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceScheduling = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const serviceSchedulingPolicy_1 = require("./serviceSchedulingPolicy");
const db = () => admin.firestore();
const now = () => new Date().toISOString();
const cleanText = (value, max = 500) => String(value || '').trim().slice(0, max);
async function access(uid, companyId, action) {
    if (!companyId)
        throw new functions.https.HttpsError('invalid-argument', 'Empresa não informada.');
    const [company, membership, legacy] = await Promise.all([
        db().collection('companies').doc(companyId).get(),
        db().collection('companyMemberships').doc(`${companyId}_${uid}`).get(),
        db().collection('companyUsers').doc(`${companyId}_${uid}`).get(),
    ]);
    const companyData = company.data() || {};
    const link = membership.data() || legacy.data() || {};
    const role = cleanText(link.role).toLowerCase();
    const owner = companyId === uid || companyId === `company-${uid}` || companyData.ownerUserId === uid || companyData.createdBy === uid;
    const adminRole = role.includes('administr') || role.includes('propriet');
    const allowed = owner || (link.status !== 'revoked' && link.status !== 'suspended' && (adminRole || link.permissions?.services?.[action] === true));
    if (!allowed)
        throw new functions.https.HttpsError('permission-denied', 'Você não possui permissão para esta ação no módulo de serviços.');
}
const list = async (name, companyId) => {
    const snapshot = await db().collection(name).where('companyId', '==', companyId).get();
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};
exports.serviceScheduling = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const uid = context.auth.uid;
    const companyId = cleanText(payload?.companyId, 160);
    const action = cleanText(payload?.action, 80);
    await access(uid, companyId, action === 'get_foundation' ? 'view' : action.includes('settings') || action.includes('hours') ? 'manageSettings' : payload?.id ? 'edit' : 'create');
    if (action === 'get_foundation') {
        const [definitions, products, categories, professionals, clients, appointments, resources, packages, commissions, settings] = await Promise.all([
            list('serviceDefinitions', companyId), list('products', companyId), list('serviceCategories', companyId),
            list('teamMembers', companyId), list('clients', companyId), list('serviceAppointments', companyId),
            list('serviceResources', companyId), list('servicePackages', companyId), list('serviceCommissions', companyId),
            db().collection('serviceSettings').doc(companyId).get(),
        ]);
        const productsById = new Map(products.map((item) => [item.id, item]));
        return { services: definitions.map((definition) => ({ ...definition, product: productsById.get(definition.productId) || null })), categories, professionals, clients, appointments, resources, packages, commissions, settings: settings.exists ? { id: settings.id, ...settings.data() } : null };
    }
    const timestamp = now();
    if (action === 'save_service') {
        const input = payload?.value || {};
        const name = cleanText(input.name, 160);
        const draft = input.publicationStatus === 'draft';
        if (!draft && !name)
            throw new functions.https.HttpsError('invalid-argument', 'Informe o nome do serviço antes de publicar.');
        const definitionRef = payload?.id ? db().collection('serviceDefinitions').doc(cleanText(payload.id, 160)) : db().collection('serviceDefinitions').doc();
        await db().runTransaction(async (tx) => {
            const previous = await tx.get(definitionRef);
            if (previous.exists && previous.data()?.companyId !== companyId)
                throw new functions.https.HttpsError('not-found', 'Serviço não encontrado.');
            const productRef = previous.exists && previous.data()?.productId ? db().collection('products').doc(previous.data().productId) : db().collection('products').doc();
            const product = { companyId, type: 'service', name, category: cleanText(input.category, 120) || 'Serviços', description: cleanText(input.description, 3000), notes: cleanText(input.description, 3000), salePriceCents: Math.max(0, Math.round(Number(input.priceCents || 0))), promotionalPriceCents: Math.max(0, Math.round(Number(input.promotionalPriceCents || 0))), images: Array.isArray(input.images) ? input.images.slice(0, 3) : [], unit: 'serv', publicationStatus: draft ? 'draft' : 'published', active: !draft, salesChannels: { bluStore: !draft && Boolean(input.publishOnEcommerce) }, updatedAt: timestamp, updatedBy: uid, createdAt: previous.data()?.createdAt || timestamp, createdBy: previous.data()?.createdBy || uid };
            const definition = { companyId, productId: productRef.id, slug: cleanText(input.slug || (name || definitionRef.id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 160), categoryId: cleanText(input.categoryId, 160), durationMinutes: (0, serviceSchedulingPolicy_1.normalizeMinutes)(input.durationMinutes), bufferBeforeMinutes: Math.max(0, (0, serviceSchedulingPolicy_1.normalizeMinutes)(input.bufferBeforeMinutes, 0)), bufferAfterMinutes: Math.max(0, (0, serviceSchedulingPolicy_1.normalizeMinutes)(input.bufferAfterMinutes, 0)), slotIntervalMinutes: (0, serviceSchedulingPolicy_1.normalizeMinutes)(input.slotIntervalMinutes, 30), capacityMode: ['FIXED', 'RESOURCE_BASED', 'PROFESSIONAL_BASED', 'HYBRID'].includes(input.capacityMode) ? input.capacityMode : 'FIXED', simultaneousCapacity: Math.max(1, Math.min(100, Math.round(Number(input.simultaneousCapacity || 1)))), minimumAdvanceMinutes: Math.max(0, Math.round(Number(input.minimumAdvanceMinutes || 0))), maximumAdvanceDays: Math.max(1, Math.min(730, Math.round(Number(input.maximumAdvanceDays || 90)))), onlineBookingEnabled: Boolean(input.onlineBookingEnabled), requiresConfirmation: Boolean(input.requiresConfirmation), paymentMode: ['PAY_ON_SITE', 'FULL_PREPAYMENT', 'DEPOSIT_FIXED', 'DEPOSIT_PERCENTAGE'].includes(input.paymentMode) ? input.paymentMode : 'PAY_ON_SITE', depositValue: Math.max(0, Number(input.depositValue || 0)), publishOnEcommerce: !draft && Boolean(input.publishOnEcommerce), publicationStatus: draft ? 'draft' : 'published', active: !draft, updatedAt: timestamp, updatedBy: uid, createdAt: previous.data()?.createdAt || timestamp, createdBy: previous.data()?.createdBy || uid };
            tx.set(productRef, product, { merge: true });
            tx.set(definitionRef, definition, { merge: true });
            tx.set(db().collection('auditLogs').doc(), { companyId, userId: uid, action: previous.exists ? 'SERVICE_UPDATED' : 'SERVICE_CREATED', entity: 'serviceDefinitions', entityId: definitionRef.id, before: previous.data() || null, after: definition, createdAt: timestamp });
        });
        return { id: definitionRef.id };
    }
    const saveSimple = async (collectionName, value) => {
        const ref = payload?.id ? db().collection(collectionName).doc(cleanText(payload.id, 160)) : db().collection(collectionName).doc();
        const snapshot = await ref.get();
        if (snapshot.exists && snapshot.data()?.companyId !== companyId)
            throw new functions.https.HttpsError('not-found', 'Registro não encontrado.');
        await ref.set({ ...value, companyId, createdAt: snapshot.data()?.createdAt || timestamp, createdBy: snapshot.data()?.createdBy || uid, updatedAt: timestamp, updatedBy: uid }, { merge: true });
        await db().collection('auditLogs').add({ companyId, userId: uid, action: `${collectionName.toUpperCase()}_SAVED`, entity: collectionName, entityId: ref.id, createdAt: timestamp });
        return { id: ref.id };
    };
    if (action === 'save_category') {
        const name = cleanText(payload?.value?.name, 120);
        if (!name)
            throw new functions.https.HttpsError('invalid-argument', 'Informe o nome da categoria.');
        return saveSimple('serviceCategories', { name, description: cleanText(payload?.value?.description, 500), parentId: cleanText(payload?.value?.parentId, 160), active: payload?.value?.active !== false, displayOrder: Number(payload?.value?.displayOrder || 0) });
    }
    if (action === 'save_location') {
        const name = cleanText(payload?.value?.name, 160);
        if (!name)
            throw new functions.https.HttpsError('invalid-argument', 'Informe o nome da unidade.');
        return saveSimple('serviceLocations', { name, code: cleanText(payload?.value?.code, 60), timezone: cleanText(payload?.value?.timezone || 'America/Fortaleza', 80), address: payload?.value?.address || {}, active: payload?.value?.active !== false });
    }
    if (action === 'save_special_hours') {
        const locationId = cleanText(payload?.value?.locationId, 160);
        const date = cleanText(payload?.value?.date, 10);
        const location = await db().collection('serviceLocations').doc(locationId).get();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !location.exists || location.data()?.companyId !== companyId) {
            throw new functions.https.HttpsError('invalid-argument', 'Informe uma data e uma unidade válidas.');
        }
        return saveSimple('serviceSpecialHours', { locationId, date, kind: ['open', 'closed'].includes(payload?.value?.kind) ? payload.value.kind : 'closed', intervals: (0, serviceSchedulingPolicy_1.normalizeIntervals)(payload?.value?.intervals), reason: cleanText(payload?.value?.reason, 300) });
    }
    if (action === 'save_hours') {
        const locationId = cleanText(payload?.value?.locationId, 160);
        const location = await db().collection('serviceLocations').doc(locationId).get();
        if (!location.exists || location.data()?.companyId !== companyId) {
            throw new functions.https.HttpsError('invalid-argument', 'Unidade inválida para esta empresa.');
        }
        const days = Array.isArray(payload?.value?.days) ? payload.value.days : [];
        const batch = db().batch();
        for (const day of days) {
            const intervals = (0, serviceSchedulingPolicy_1.normalizeIntervals)(day.intervals);
            if ((0, serviceSchedulingPolicy_1.intervalsOverlap)(intervals))
                throw new functions.https.HttpsError('invalid-argument', 'Existem horários sobrepostos.');
            batch.set(db().collection('serviceBusinessHours').doc(`${companyId}_${locationId}_${Number(day.weekday)}`), { companyId, locationId, weekday: Number(day.weekday), closed: Boolean(day.closed), intervals, updatedAt: timestamp, updatedBy: uid }, { merge: true });
        }
        batch.set(db().collection('auditLogs').doc(), { companyId, userId: uid, action: 'SERVICE_HOURS_CHANGED', entity: 'serviceBusinessHours', entityId: locationId, createdAt: timestamp });
        await batch.commit();
        return { locationId };
    }
    if (action === 'save_settings') {
        const value = payload?.value || {};
        const weeklyHours = Array.isArray(value.weeklyHours) ? value.weeklyHours.slice(0, 7).map((day) => ({ weekday: Number(day.weekday), closed: Boolean(day.closed), intervals: (0, serviceSchedulingPolicy_1.normalizeIntervals)(day.intervals) })) : [];
        if (weeklyHours.some((day) => (0, serviceSchedulingPolicy_1.intervalsOverlap)(day.intervals)))
            throw new functions.https.HttpsError('invalid-argument', 'Existem horários sobrepostos.');
        await db().collection('serviceSettings').doc(companyId).set({ companyId, defaultSlotIntervalMinutes: (0, serviceSchedulingPolicy_1.normalizeMinutes)(value.defaultSlotIntervalMinutes, 30), defaultDurationMinutes: (0, serviceSchedulingPolicy_1.normalizeMinutes)(value.defaultDurationMinutes, 60), minimumAdvanceMinutes: Math.max(0, Number(value.minimumAdvanceMinutes || 0)), maximumAdvanceDays: Math.max(1, Number(value.maximumAdvanceDays || 90)), lateToleranceMinutes: Math.max(0, Number(value.lateToleranceMinutes || 10)), timezone: cleanText(value.timezone || 'America/Fortaleza', 80), automaticConfirmation: Boolean(value.automaticConfirmation), onlineBookingEnabled: Boolean(value.onlineBookingEnabled), weeklyHours, updatedAt: timestamp, updatedBy: uid }, { merge: true });
        return { id: companyId };
    }
    const entityActions = {
        save_appointment: 'serviceAppointments', save_resource: 'serviceResources',
        save_package: 'servicePackages', save_commission: 'serviceCommissions',
    };
    if (entityActions[action]) {
        const value = payload?.value || {};
        if (!cleanText(value.name || value.title || value.clientName || value.professionalName, 160)) {
            throw new functions.https.HttpsError('invalid-argument', 'Informe os dados principais do registro.');
        }
        const safeValue = { ...value };
        delete safeValue.companyId;
        delete safeValue.createdBy;
        delete safeValue.updatedBy;
        return saveSimple(entityActions[action], safeValue);
    }
    throw new functions.https.HttpsError('invalid-argument', 'Ação inválida.');
});
//# sourceMappingURL=serviceScheduling.js.map