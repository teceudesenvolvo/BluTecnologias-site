"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCostCentersV1 = void 0;
/** Migration 003 — cria centros a partir das referências legadas dos lançamentos. */
const admin = require("firebase-admin");
async function migrateCostCentersV1(companyId, actorId) { const db = admin.firestore(), marker = db.collection('schemaMigrations').doc(`${companyId}_003_cost_centers_v1`); if ((await marker.get()).exists)
    return { applied: false }; const movements = await db.collection('financialTransactions').where('companyId', '==', companyId).get(), names = [...new Set(movements.docs.map(x => String(x.data().costCenterName || '').trim()).filter(Boolean))], now = new Date().toISOString(), batch = db.batch(); for (const [name, index] of names.entries()) {
    const ref = db.collection('costCenters').doc();
    batch.set(ref, { companyId, code: `LEG-${String(index + 1).padStart(3, '0')}`, name, description: 'Centro criado a partir de movimentações legadas', parentId: null, responsibleUserId: '', responsibleName: '', type: 'other', budgetCents: 0, budgetPeriod: 'annual', startDate: now.slice(0, 10), endDate: '', status: 'active', allowsEntries: true, notes: 'Migration 003', createdAt: now, updatedAt: now, createdBy: actorId, updatedBy: actorId, version: 1, migrationId: '003_cost_centers_v1' });
} batch.set(marker, { companyId, version: 3, name: 'cost_centers_v1', appliedAt: now, appliedBy: actorId, records: names.length }); await batch.commit(); return { applied: true, records: names.length }; }
exports.migrateCostCentersV1 = migrateCostCentersV1;
//# sourceMappingURL=003_cost_centers_v1.js.map