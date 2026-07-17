"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateFinancialSettingsV1 = void 0;
/**
 * Migration 001 — Financial settings v1.
 * Execute with Firebase Admin credentials in a controlled environment.
 * Idempotent: the marker prevents a second application for the same company.
 */
const admin = require("firebase-admin");
async function migrateFinancialSettingsV1(companyId, actorId) {
    const db = admin.firestore();
    const marker = db.collection('schemaMigrations').doc(`${companyId}_001_financial_settings_v1`);
    if ((await marker.get()).exists)
        return { applied: false };
    const legacy = await db.collection('financialSettings').doc(companyId).get();
    const data = legacy.data() || {};
    const batch = db.batch();
    for (const account of (data.bankAccounts || [])) {
        const ref = db.collection('bankAccounts').doc();
        batch.set(ref, { ...account, companyId, status: 'active', createdBy: actorId, createdAt: new Date().toISOString(), migrationId: '001_financial_settings_v1' });
    }
    batch.set(marker, { companyId, version: 1, name: 'financial_settings_v1', appliedBy: actorId, appliedAt: new Date().toISOString(), sourceDocument: legacy.exists ? legacy.ref.path : null });
    await batch.commit();
    return { applied: true };
}
exports.migrateFinancialSettingsV1 = migrateFinancialSettingsV1;
//# sourceMappingURL=001_financial_settings_v1.js.map