"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandReconciliation = exports.importBankStatement = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const getMembership = async (uid) => {
    const snapshot = await admin.firestore().collection('companyUsers').where('userId', '==', uid).limit(1).get();
    return { companyId: snapshot.empty ? `company-${uid}` : String(snapshot.docs[0].data().companyId) };
};
exports.importBankStatement = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const membership = await getMembership(context.auth.uid);
    const accountId = String(payload?.bankAccountId || '');
    const fileHash = String(payload?.fileHash || '');
    const rows = Array.isArray(payload?.items) ? payload.items.slice(0, 2000) : [];
    if (!accountId || !fileHash || !rows.length) {
        throw new functions.https.HttpsError('invalid-argument', 'Extrato inválido.');
    }
    const account = await admin.firestore().collection('bankAccounts').doc(accountId).get();
    if (!account.exists || account.data()?.companyId !== membership.companyId) {
        throw new functions.https.HttpsError('not-found', 'Conta não encontrada.');
    }
    const previousImport = await admin.firestore().collection('bankStatementImports')
        .where('companyId', '==', membership.companyId)
        .where('fileHash', '==', fileHash)
        .limit(1)
        .get();
    if (!previousImport.empty) {
        throw new functions.https.HttpsError('already-exists', 'Este arquivo já foi importado.');
    }
    const importRef = admin.firestore().collection('bankStatementImports').doc();
    const batch = admin.firestore().batch();
    const now = new Date().toISOString();
    const seen = new Set();
    let duplicateCount = 0;
    let itemCount = 0;
    for (const row of rows) {
        const date = String(row.date || '').slice(0, 10);
        const amountCents = Number(row.amountCents);
        const description = String(row.description || '').trim();
        const fingerprint = `${date}|${amountCents}|${description}|${row.document || ''}`;
        if (!date || !description || !Number.isSafeInteger(amountCents) || seen.has(fingerprint)) {
            duplicateCount += 1;
            continue;
        }
        seen.add(fingerprint);
        batch.set(admin.firestore().collection('bankStatementItems').doc(), {
            companyId: membership.companyId,
            statementImportId: importRef.id,
            bankAccountId: accountId,
            date,
            description,
            document: String(row.document || ''),
            amountCents,
            originalData: row.originalData || row,
            status: 'unreconciled',
            matchedAmountCents: 0,
            createdAt: now,
        });
        itemCount += 1;
    }
    batch.set(importRef, {
        companyId: membership.companyId,
        bankAccountId: accountId,
        fileName: String(payload.fileName || ''),
        fileHash,
        format: String(payload.format || 'csv'),
        periodStart: String(payload.periodStart || ''),
        periodEnd: String(payload.periodEnd || ''),
        itemCount,
        duplicateCount,
        importedAt: now,
        importedBy: context.auth.uid,
    });
    batch.set(admin.firestore().collection('reconciliationHistory').doc(), {
        companyId: membership.companyId,
        action: 'import',
        statementImportId: importRef.id,
        description: `Extrato importado: ${itemCount} itens, ${duplicateCount} duplicidades`,
        createdAt: now,
        createdBy: context.auth.uid,
    });
    await batch.commit();
    return { id: importRef.id, created: itemCount, duplicates: duplicateCount };
});
exports.commandReconciliation = functions.https.onCall(async (payload, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    const userId = context.auth.uid;
    const membership = await getMembership(userId);
    const action = String(payload?.action || '');
    const itemId = String(payload?.itemId || '');
    if (!itemId || !['link', 'ignore', 'undo', 'create'].includes(action)) {
        throw new functions.https.HttpsError('invalid-argument', 'Comando inválido.');
    }
    const itemRef = admin.firestore().collection('bankStatementItems').doc(itemId);
    const itemPreview = await itemRef.get();
    if (!itemPreview.exists || itemPreview.data()?.companyId !== membership.companyId) {
        throw new functions.https.HttpsError('not-found', 'Item do extrato não encontrado.');
    }
    const existing = await admin.firestore().collection('reconciliationLinks')
        .where('companyId', '==', membership.companyId)
        .where('statementItemId', '==', itemId)
        .get();
    const requestedIds = Array.isArray(payload?.transactionIds)
        ? payload.transactionIds.map(String)
        : payload?.transactionId ? [String(payload.transactionId)] : [];
    const linkedIds = existing.docs.map((document) => String(document.data().transactionId || '')).filter(Boolean);
    const transactionIds = action === 'undo' ? linkedIds : requestedIds;
    const transactionRefs = transactionIds.map((id) => admin.firestore().collection('financialTransactions').doc(id));
    await admin.firestore().runTransaction(async (transaction) => {
        const itemSnapshot = await transaction.get(itemRef);
        const transactionSnapshots = await Promise.all(transactionRefs.map((ref) => transaction.get(ref)));
        const item = itemSnapshot.data();
        const now = new Date().toISOString();
        if (action === 'ignore') {
            const reason = String(payload?.reason || '').trim();
            if (!reason)
                throw new functions.https.HttpsError('invalid-argument', 'Itens ignorados exigem justificativa.');
            existing.docs.forEach((document) => transaction.delete(document.ref));
            transaction.update(itemRef, { status: 'ignored', ignoredReason: reason, matchedAmountCents: 0, updatedAt: now });
        }
        else if (action === 'undo') {
            existing.docs.forEach((document) => transaction.delete(document.ref));
            transactionSnapshots.forEach((snapshot, index) => {
                if (snapshot.exists && snapshot.data()?.companyId === membership.companyId) {
                    transaction.update(transactionRefs[index], { reconciled: false, reconciliationId: null, updatedAt: now });
                }
            });
            transaction.update(itemRef, { status: 'unreconciled', matchedAmountCents: 0, updatedAt: now });
        }
        else {
            if (transactionSnapshots.some((snapshot) => !snapshot.exists || snapshot.data()?.companyId !== membership.companyId)) {
                throw new functions.https.HttpsError('not-found', 'Lançamento financeiro não encontrado.');
            }
            let refs = transactionRefs;
            let amounts = transactionSnapshots.map((snapshot, index) => Number(payload?.amounts?.[index]
                ?? snapshot.data()?.netAmountCents
                ?? snapshot.data()?.amountCents
                ?? Math.round(Number(snapshot.data()?.amount || 0) * 100)));
            if (action === 'create') {
                const createdRef = admin.firestore().collection('financialTransactions').doc();
                const amountCents = Math.abs(Number(item.amountCents));
                refs = [createdRef];
                amounts = [amountCents];
                transaction.set(createdRef, {
                    companyId: membership.companyId,
                    bankAccountId: item.bankAccountId,
                    kind: Number(item.amountCents) >= 0 ? 'income' : 'expense',
                    description: item.description,
                    amountCents,
                    grossAmountCents: amountCents,
                    netAmountCents: amountCents,
                    date: item.date,
                    dueDate: item.date,
                    competence: item.date.slice(0, 7),
                    status: Number(item.amountCents) >= 0 ? 'received' : 'paid',
                    reconciled: true,
                    reconciliationId: itemId,
                    originType: 'bankStatement',
                    originId: itemId,
                    dreImpact: true,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: userId,
                    updatedBy: userId,
                    version: 1,
                });
            }
            if (!refs.length)
                throw new functions.https.HttpsError('invalid-argument', 'Selecione ao menos um lançamento.');
            if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount <= 0)) {
                throw new functions.https.HttpsError('invalid-argument', 'Valor de vínculo inválido.');
            }
            const total = amounts.reduce((sum, amount) => sum + amount, 0);
            const expected = Math.abs(Number(item.amountCents));
            const status = total === expected ? 'reconciled' : total < expected ? 'partiallyReconciled' : 'divergent';
            existing.docs.forEach((document) => transaction.delete(document.ref));
            refs.forEach((ref, index) => {
                transaction.set(admin.firestore().collection('reconciliationLinks').doc(), {
                    companyId: membership.companyId,
                    statementItemId: itemId,
                    transactionId: ref.id,
                    amountCents: amounts[index],
                    confidence: Number(payload?.confidence || 0),
                    matchedFields: Array.isArray(payload?.matchedFields) ? payload.matchedFields : [],
                    createdAt: now,
                    createdBy: userId,
                });
                if (action !== 'create') {
                    transaction.update(ref, { reconciled: status === 'reconciled', reconciliationId: itemId, updatedAt: now });
                }
            });
            transaction.update(itemRef, { status, matchedAmountCents: total, notes: String(payload?.notes || ''), updatedAt: now });
        }
        transaction.set(admin.firestore().collection('reconciliationHistory').doc(), {
            companyId: membership.companyId,
            statementItemId: itemId,
            action,
            description: String(payload?.notes || payload?.reason || action),
            createdAt: now,
            createdBy: userId,
        });
        transaction.set(admin.firestore().collection('financialAuditLogs').doc(), {
            companyId: membership.companyId,
            action,
            entityType: 'bankReconciliation',
            entityId: itemId,
            userId,
            createdAt: now,
            before: item,
            after: { transactionIds },
        });
    });
    return { id: itemId };
});
//# sourceMappingURL=reconciliation.js.map