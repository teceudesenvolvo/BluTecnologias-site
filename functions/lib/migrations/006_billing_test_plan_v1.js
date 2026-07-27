"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateBillingTestPlanV1 = void 0;
/**
 * Migration 006 — cria um plano público de teste com cobrança simbólica de R$ 1,00.
 * Aplique em ambiente controlado via Firebase Admin.
 */
const admin = require("firebase-admin");
async function migrateBillingTestPlanV1(actorId) {
    const db = admin.firestore();
    const marker = db.collection('schemaMigrations').doc(`global_006_billing_test_plan_v1`);
    if ((await marker.get()).exists)
        return { applied: false };
    const now = new Date().toISOString();
    const ref = db.collection('plans').doc('test-1-real');
    const snapshot = await ref.get();
    const before = snapshot.exists ? snapshot.data() || null : null;
    const plan = {
        id: 'test-1-real',
        name: 'Plano Teste Blu',
        slug: 'test-1-real',
        description: 'Plano de validação para testar a jornada de compra com cobrança simbólica de R$ 1,00.',
        priceInCents: 100,
        billingInterval: 'month',
        trialDays: 7,
        limits: {
            companies: 1,
            activeContracts: 1,
            storageBytes: 1024 * 1024 * 1024,
            users: 1,
            aiCredits: 0,
            savedSearches: 0,
            activeAutomations: 0,
            customAlerts: 0,
            apiRequests: 0,
            certificates: 0,
            bankAccounts: 1,
        },
        active: true,
        public: true,
        displayOrder: 0,
        updatedAt: now,
        updatedBy: actorId,
        createdAt: before?.createdAt || now,
        createdBy: before?.createdBy || actorId,
    };
    await ref.set(plan, { merge: true });
    await marker.set({
        name: 'billing_test_plan_v1',
        version: 6,
        appliedAt: now,
        appliedBy: actorId,
        sourceDocument: ref.path,
    });
    return { applied: true, id: ref.id };
}
exports.migrateBillingTestPlanV1 = migrateBillingTestPlanV1;
//# sourceMappingURL=006_billing_test_plan_v1.js.map