"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateProjectsV1 = void 0;
/** Migration 004 — prepara projetos a partir dos contratos legados dos clientes. */
const admin = require("firebase-admin");
async function migrateProjectsV1(companyId, actorId) { const db = admin.firestore(), marker = db.collection('schemaMigrations').doc(`${companyId}_004_projects_v1`); if ((await marker.get()).exists)
    return { applied: false }; const clients = await db.collection('clients').where('companyId', '==', companyId).get(), now = new Date().toISOString(), batch = db.batch(); let count = 0; for (const client of clients.docs)
    for (const contract of (client.data().contracts || [])) {
        const exists = await db.collection('projects').where('companyId', '==', companyId).where('contractId', '==', String(contract.id)).limit(1).get();
        if (!exists.empty)
            continue;
        const ref = db.collection('projects').doc();
        batch.set(ref, { companyId, code: `PRJ-${String(++count).padStart(4, '0')}`, name: contract.title || `Projeto do contrato ${contract.id}`, description: 'Criado a partir de contrato legado', type: 'publicContract', clientId: client.id, clientName: client.data().razaoSocial || client.data().name || '', organizationCnpj: client.data().cnpj || '', contractId: String(contract.id), contractName: contract.title || '', opportunityId: '', opportunityName: '', responsibleUserId: '', responsibleName: '', memberIds: [], startDate: contract.startDate || now.slice(0, 10), endDate: contract.endDate || '', status: 'planning', costCenterId: '', costCenterName: '', budgetCents: Math.round(Number(contract.value || 0) * 100), expectedRevenueCents: Math.round(Number(contract.value || 0) * 100), expectedCostCents: 0, expectedMarginCents: Math.round(Number(contract.value || 0) * 100), progressPercent: 0, notes: 'Migration 004', createdAt: now, updatedAt: now, createdBy: actorId, updatedBy: actorId, version: 1, migrationId: '004_projects_v1' });
    } batch.set(marker, { companyId, version: 4, name: 'projects_v1', appliedAt: now, appliedBy: actorId, records: count }); await batch.commit(); return { applied: true, records: count }; }
exports.migrateProjectsV1 = migrateProjectsV1;
//# sourceMappingURL=004_projects_v1.js.map