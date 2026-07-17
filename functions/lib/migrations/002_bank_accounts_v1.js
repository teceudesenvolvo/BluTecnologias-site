"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateBankAccountsV1 = void 0;
/** Migration 002 — normaliza contas bancárias legadas. Idempotente por tenant. */
const admin = require("firebase-admin");
const cents = (value) => Math.round(Number(value || 0) * 100);
async function migrateBankAccountsV1(companyId, actorId) { const db = admin.firestore(), marker = db.collection('schemaMigrations').doc(`${companyId}_002_bank_accounts_v1`); if ((await marker.get()).exists)
    return { applied: false }; const settings = await db.collection('financialSettings').doc(companyId).get(); const batch = db.batch(), now = new Date().toISOString(); for (const legacy of (settings.data()?.bankAccounts || [])) {
    const ref = db.collection('bankAccounts').doc(), accountNumber = String(legacy.accountNumber || '');
    batch.set(ref, { companyId, name: legacy.name || legacy.bankName || 'Conta bancária', institution: legacy.bankName || '', bankCode: legacy.bankCode || '', agency: legacy.agency || '', accountNumber: accountNumber ? `****${accountNumber.slice(-4)}` : '', digit: legacy.digit || '', type: 'checking', holderName: legacy.holderName || '', holderDocument: '', initialBalanceCents: cents(legacy.initialBalance), initialBalanceDate: legacy.initialBalanceDate || now.slice(0, 10), currentBalanceCents: cents(legacy.initialBalance), blockedBalanceCents: 0, creditLimitCents: 0, status: 'active', isPrimary: false, usedForReceipts: true, usedForPayments: true, notes: 'Migrada de financialSettings', createdAt: now, updatedAt: now, createdBy: actorId, updatedBy: actorId, version: 1, migrationId: '002_bank_accounts_v1' });
    batch.set(db.collection('bankAccountSecrets').doc(ref.id), { companyId, accountNumber, holderDocument: '', updatedAt: now, updatedBy: actorId });
} batch.set(marker, { companyId, version: 2, name: 'bank_accounts_v1', appliedAt: now, appliedBy: actorId }); await batch.commit(); return { applied: true }; }
exports.migrateBankAccountsV1 = migrateBankAccountsV1;
//# sourceMappingURL=002_bank_accounts_v1.js.map