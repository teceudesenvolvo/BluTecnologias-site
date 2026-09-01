import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';

const membership = async (uid: string) => {
  const result = await admin.firestore().collection('companyUsers').where('userId', '==', uid).limit(1).get();
  return result.empty ? { companyId: `company-${uid}` } : result.docs[0].data() as { companyId: string };
};

const companyMembership = async (uid: string, companyId: string) => {
  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Empresa do PDV não informada.');
  const firestore = admin.firestore();
  const [company, current, legacy, legacyByUser] = await Promise.all([
    firestore.collection('companies').doc(companyId).get(),
    firestore.collection('companyMemberships').doc(`${companyId}_${uid}`).get(),
    firestore.collection('companyUsers').doc(`${companyId}_${uid}`).get(),
    firestore.collection('companyUsers').where('userId', '==', uid).get(),
  ]);
  const isOwner = company.exists && (company.data()?.ownerUserId === uid || company.data()?.createdBy === uid || companyId === uid || companyId === `company-${uid}`);
  const activeLegacyMembership = legacyByUser.docs.some(item => item.data().companyId === companyId && item.data().status !== 'inactive' && item.data().status !== 'revoked');
  const active = (current.exists && current.data()?.status === 'active') || (legacy.exists && legacy.data()?.status !== 'inactive' && legacy.data()?.status !== 'revoked') || activeLegacyMembership;
  if (!isOwner && !active) throw new functions.https.HttpsError('permission-denied', 'Você não possui acesso a esta empresa.');
  return { companyId };
};

const registerSummary = async (register: FirebaseFirestore.DocumentSnapshot) => {
  const data = register.data() || {};
  const [sales, movements] = await Promise.all([
    admin.firestore().collection('pointOfSaleSales').where('registerId', '==', register.id).get(),
    admin.firestore().collection('pointOfSaleRegisterMovements').where('registerId', '==', register.id).get(),
  ]);
  const completed = sales.docs.map(item => item.data()).filter(item => item.status === 'completed');
  const paymentTotalsCents = completed.reduce<Record<string, number>>((totals, sale) => {
    const method = String(sale.paymentMethod || 'other');
    totals[method] = (totals[method] || 0) + Number(sale.netAmountCents || 0);
    return totals;
  }, {});
  const cashSalesCents = paymentTotalsCents.cash || 0;
  const movementValues = movements.docs.map(item => ({ id: item.id, ...item.data() }));
  const supplyCents = movementValues.filter((item: any) => item.type === 'supply').reduce((sum: number, item: any) => sum + Number(item.amountCents || 0), 0);
  const withdrawalCents = movementValues.filter((item: any) => item.type === 'withdrawal').reduce((sum: number, item: any) => sum + Number(item.amountCents || 0), 0);
  return {
    id: register.id,
    ...data,
    saleCount: completed.length,
    paymentTotalsCents,
    cashSalesCents,
    supplyCents,
    withdrawalCents,
    movements: movementValues.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt))),
    expectedCashCents: Number(data.openingAmountCents || 0) + cashSalesCents + supplyCents - withdrawalCents,
  };
};

export const managePointOfSaleRegister = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
  const companyId = String(payload?.companyId || '');
  await companyMembership(context.auth.uid, companyId);
  const action = String(payload?.action || 'status');
  const firestore = admin.firestore();
  const requestedRegisterId = String(payload?.registerId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  const openSnapshot = await firestore.collection('pointOfSaleRegisters')
    .where('operatorId', '==', context.auth.uid).get();
  const openRegister = openSnapshot.docs.find(item => item.data().companyId === companyId && item.data().status === 'open');

  if (action === 'status') return openRegister ? registerSummary(openRegister) : null;
  if (action === 'open') {
    if (requestedRegisterId) {
      const existing = await firestore.collection('pointOfSaleRegisters').doc(requestedRegisterId).get();
      if (existing.exists) {
        if (existing.data()?.companyId !== companyId || existing.data()?.operatorId !== context.auth.uid) throw new functions.https.HttpsError('permission-denied', 'O identificador do caixa pertence a outra operação.');
        return registerSummary(existing);
      }
    }
    if (openRegister) throw new functions.https.HttpsError('already-exists', 'Este usuário já possui um caixa aberto nesta empresa.');
    const openingAmountCents = Number(payload?.openingAmountCents || 0);
    if (!Number.isSafeInteger(openingAmountCents) || openingAmountCents < 0) throw new functions.https.HttpsError('invalid-argument', 'O saldo inicial é inválido.');
    const now = new Date().toISOString();
    const ref = requestedRegisterId ? firestore.collection('pointOfSaleRegisters').doc(requestedRegisterId) : firestore.collection('pointOfSaleRegisters').doc();
    const value = { companyId, operatorId: context.auth.uid, operatorName: String(context.auth.token.name || context.auth.token.email || 'Operador'), status: 'open', openingAmountCents, openedAt: now, openedBy: context.auth.uid, createdAt: now, updatedAt: now };
    await ref.set(value);
    await firestore.collection('financialAuditLogs').add({ companyId, action: 'openRegister', entityType: 'pointOfSaleRegister', entityId: ref.id, userId: context.auth.uid, createdAt: now, before: null, after: value });
    return { id: ref.id, ...value, saleCount: 0, paymentTotalsCents: {}, cashSalesCents: 0, expectedCashCents: openingAmountCents };
  }
  if (action === 'close') {
    const requestedRegister = requestedRegisterId ? await firestore.collection('pointOfSaleRegisters').doc(requestedRegisterId).get() : null;
    const targetRegister = requestedRegister?.exists ? requestedRegister : openRegister;
    if (!targetRegister) throw new functions.https.HttpsError('failed-precondition', 'Este usuário não possui caixa aberto.');
    if (targetRegister.data()?.companyId !== companyId || targetRegister.data()?.operatorId !== context.auth.uid) throw new functions.https.HttpsError('permission-denied', 'Este caixa pertence a outro operador ou empresa.');
    if (targetRegister.data()?.status === 'closed') return registerSummary(targetRegister);
    const summary = await registerSummary(targetRegister);
    const countedCashCents = Number(payload?.countedCashCents);
    if (!Number.isSafeInteger(countedCashCents) || countedCashCents < 0) throw new functions.https.HttpsError('invalid-argument', 'Informe o valor contado no caixa.');
    const now = new Date().toISOString();
    const differenceCents = countedCashCents - Number(summary.expectedCashCents || 0);
    await firestore.runTransaction(async tx => {
      const fresh = await tx.get(targetRegister.ref);
      if (!fresh.exists || fresh.data()?.status !== 'open' || fresh.data()?.operatorId !== context.auth!.uid) throw new functions.https.HttpsError('failed-precondition', 'O caixa já foi fechado ou pertence a outro operador.');
      tx.update(targetRegister.ref, { status: 'closed', closedAt: now, closedBy: context.auth!.uid, countedCashCents, differenceCents, expectedCashCents: summary.expectedCashCents, cashSalesCents: summary.cashSalesCents, paymentTotalsCents: summary.paymentTotalsCents, saleCount: summary.saleCount, closingNotes: String(payload?.notes || ''), updatedAt: now });
      tx.set(firestore.collection('financialAuditLogs').doc(), { companyId, action: 'closeRegister', entityType: 'pointOfSaleRegister', entityId: targetRegister.id, userId: context.auth!.uid, createdAt: now, before: fresh.data(), after: { countedCashCents, differenceCents, expectedCashCents: summary.expectedCashCents, saleCount: summary.saleCount } });
    });
    return { ...summary, status: 'closed', countedCashCents, differenceCents, closedAt: now };
  }
  if (['supply', 'withdrawal'].includes(action)) {
    if (!openRegister) throw new functions.https.HttpsError('failed-precondition', 'Abra o caixa antes de registrar a movimentação.');
    const amountCents = Number(payload?.amountCents || 0);
    const reason = String(payload?.reason || '').trim().slice(0, 500);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new functions.https.HttpsError('invalid-argument', 'Informe um valor maior que zero.');
    if (!reason) throw new functions.https.HttpsError('invalid-argument', 'Informe o motivo da movimentação.');
    const now = new Date().toISOString(), ref = firestore.collection('pointOfSaleRegisterMovements').doc();
    const value = { companyId, registerId: openRegister.id, type: action, amountCents, reason, operatorId: context.auth.uid, operatorName: String(openRegister.data()?.operatorName || context.auth.token.email || 'Operador'), createdAt: now, createdBy: context.auth.uid };
    await firestore.runTransaction(async tx => {
      const fresh = await tx.get(openRegister.ref);
      if (!fresh.exists || fresh.data()?.status !== 'open' || fresh.data()?.operatorId !== context.auth!.uid) throw new functions.https.HttpsError('failed-precondition', 'O caixa não está disponível para este operador.');
      tx.set(ref, value);
      tx.set(firestore.collection('financialAuditLogs').doc(), { companyId, action: action === 'supply' ? 'registerSupply' : 'registerWithdrawal', entityType: 'pointOfSaleRegister', entityId: openRegister.id, userId: context.auth!.uid, createdAt: now, before: null, after: value });
    });
    return { movement: { id: ref.id, ...value }, register: await registerSummary(openRegister) };
  }
  if (['temporary_exit', 'resume'].includes(action)) {
    if (!openRegister) throw new functions.https.HttpsError('failed-precondition', 'Nenhum caixa aberto foi encontrado.');
    const now = new Date().toISOString(), locked = action === 'temporary_exit';
    await openRegister.ref.set({ temporarilyLocked: locked, temporaryExitAt: locked ? now : null, resumedAt: locked ? null : now, updatedAt: now }, { merge: true });
    await firestore.collection('financialAuditLogs').add({ companyId, action: locked ? 'temporaryRegisterExit' : 'resumeRegister', entityType: 'pointOfSaleRegister', entityId: openRegister.id, userId: context.auth.uid, createdAt: now, before: null, after: { temporarilyLocked: locked } });
    return registerSummary(await openRegister.ref.get());
  }
  if (action === 'history') {
    const snapshots = await firestore.collection('pointOfSaleRegisters').where('operatorId', '==', context.auth.uid).get();
    const values = await Promise.all(snapshots.docs.filter(item => item.data().companyId === companyId).map(item => registerSummary(item)));
    return values.sort((a: any, b: any) => String(b.openedAt).localeCompare(String(a.openedAt))).slice(0, 30);
  }
  throw new functions.https.HttpsError('invalid-argument', 'Operação de caixa inválida.');
});

const escapeHtml = (value: unknown) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

type PagarmeResponse = Record<string, any>;

const pagarmeRequest = async (path: string, method: 'GET' | 'POST', body?: unknown): Promise<PagarmeResponse> => {
  const snapshot = await admin.firestore().collection('billingProviders').doc('pagarme').get();
  const config = snapshot.data() || {};
  const secretKey = String(config.secretKey || config.handle || process.env.PAGARME_SECRET_KEY || '').trim();
  if (!config.enabled || !secretKey) throw new functions.https.HttpsError('failed-precondition', 'Configure e habilite o Pagar.me no Blu HQ.');
  const hostname = secretKey.startsWith('sk_test_') ? 'sdx-api.pagar.me' : 'api.pagar.me';
  const content = body === undefined ? '' : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname, path: `/core/v5${path}`, method, headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`, Accept: 'application/json', 'Content-Type': 'application/json',
      ...(content ? { 'Content-Length': Buffer.byteLength(content) } : {}),
    }, timeout: 15000 }, response => {
      let raw = '';
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        let parsed: any = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { message: raw }; }
        if ((response.statusCode || 500) >= 400) return reject(new functions.https.HttpsError('internal', `Pagar.me recusou o pagamento (HTTP ${response.statusCode}).`, parsed));
        resolve(parsed);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Tempo limite do Pagar.me excedido.')));
    request.on('error', error => reject(new functions.https.HttpsError('unavailable', 'O Pagar.me está temporariamente indisponível.', error.message)));
    if (content) request.write(content);
    request.end();
  });
};

const posPaymentStatus = (order: PagarmeResponse) => {
  const charge = Array.isArray(order.charges) ? order.charges[0] || {} : {}, transaction = charge.last_transaction || {};
  const value = String(charge.status || order.status || transaction.status || '').toLowerCase();
  return ['paid', 'captured', 'succeeded'].includes(value) ? 'paid' : ['failed', 'canceled', 'cancelled'].includes(value) ? 'failed' : 'pending';
};

export const createPointOfSalePayment = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
  const companyId = String(payload?.companyId || '');
  await companyMembership(context.auth.uid, companyId);
  if (String(payload?.paymentMethod || '') !== 'pix') throw new functions.https.HttpsError('invalid-argument', 'Este fluxo aceita somente Pix.');
  const items = Array.isArray(payload?.items) ? payload.items.slice(0, 100) : [], clientId = String(payload?.clientId || '');
  if (!items.length || !clientId) throw new functions.https.HttpsError('invalid-argument', 'Informe cliente e itens.');
  const firestore = admin.firestore();
  const [companySnap, clientSnap, providerSnap, ...productSnaps] = await Promise.all([
    firestore.collection('companies').doc(companyId).get(), firestore.collection('clients').doc(clientId).get(), firestore.collection('billingProviders').doc('pagarme').get(),
    ...items.map((item: any) => firestore.collection('products').doc(String(item.productId || '')).get()),
  ]);
  if (!companySnap.exists || !clientSnap.exists || clientSnap.data()?.companyId !== companyId) throw new functions.https.HttpsError('not-found', 'Empresa ou cliente não encontrado.');
  let gross = 0;
  const orderItems = items.map((item: any, index: number) => {
    const product = productSnaps[index].data(), quantityMilli = Number(item.quantityMilli), unitPriceCents = Number(item.unitPriceCents);
    if (!productSnaps[index].exists || product?.companyId !== companyId) throw new functions.https.HttpsError('not-found', 'Produto não encontrado.');
    if (!Number.isSafeInteger(quantityMilli) || quantityMilli <= 0 || !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) throw new functions.https.HttpsError('invalid-argument', 'Quantidade ou preço inválido.');
    const quantity = Math.max(1, Math.round(quantityMilli / 1000)), amount = Math.round(unitPriceCents * quantityMilli / 1000);
    gross += amount;
    return { code: productSnaps[index].id.slice(0, 52), description: String(product.name || 'Produto').slice(0, 256), amount: Math.max(1, Math.round(amount / quantity)), quantity };
  });
  const discount = Number(payload?.discountCents || 0), total = gross - discount;
  if (!Number.isSafeInteger(discount) || discount < 0 || total <= 0) throw new functions.https.HttpsError('invalid-argument', 'Valor da venda inválido.');
  const provider = providerSnap.data() || {}, company = companySnap.data() || {}, client = clientSnap.data() || {};
  const companyRecipientId = String(company.pagarmeRecipientId || company.paymentRecipientId || '').trim(), bluRecipientId = String(provider.bluRecipientId || provider.defaultRecipientId || '').trim();
  if (!companyRecipientId || !bluRecipientId) throw new functions.https.HttpsError('failed-precondition', 'Cadastre os recebedores Pagar.me da empresa e da Blu antes de usar o split.');
  const feeBps = Math.min(10000, Math.max(0, Number(provider.posSplitFeeBps ?? 15)));
  const bluAmount = feeBps > 0 ? Math.max(1, Math.round(total * feeBps / 10000)) : 0;
  const companyAmount = total - bluAmount;
  if (companyAmount <= 0) throw new functions.https.HttpsError('failed-precondition', 'O valor da venda é insuficiente para aplicar o split.');
  const intentRef = firestore.collection('pointOfSalePaymentIntents').doc(), document = String(client.cnpj || client.organizationCnpj || client.document || '').replace(/\D/g, '');
  const order = await pagarmeRequest('/orders', 'POST', {
    code: `blu-pos-${intentRef.id}`.slice(0, 52), items: orderItems,
    customer: { name: String(client.razaoSocial || client.name || 'Cliente'), email: String(client.financialContact || client.email || ''), type: document.length === 14 ? 'company' : 'individual', document },
    payments: [{ payment_method: 'pix', pix: { expires_in: 900, additional_information: [{ name: 'Venda', value: String(payload?.saleNumber || intentRef.id) }] }, split: [
      { type: 'flat', amount: companyAmount, recipient_id: companyRecipientId, options: { liable: true, charge_processing_fee: true, charge_remainder_fee: true } },
      ...(bluAmount > 0 ? [{ type: 'flat', amount: bluAmount, recipient_id: bluRecipientId, options: { liable: false, charge_processing_fee: false, charge_remainder_fee: false } }] : []),
    ] }], closed: true, metadata: { blu_pos_intent_id: intentRef.id, company_id: companyId },
  });
  const transaction = order.charges?.[0]?.last_transaction || {}, now = new Date().toISOString();
  const value = { companyId, clientId, registerId: String(payload?.registerId || ''), saleNumber: String(payload?.saleNumber || ''), amountCents: total, bluFeeCents: bluAmount, companyAmountCents: companyAmount, feeBps, provider: 'pagarme', providerOrderId: String(order.id || ''), providerChargeId: String(order.charges?.[0]?.id || ''), status: posPaymentStatus(order), qrCode: String(transaction.qr_code || ''), qrCodeUrl: String(transaction.qr_code_url || ''), expiresAt: transaction.expires_at || null, createdAt: now, updatedAt: now, createdBy: context.auth.uid };
  await intentRef.set(value);
  return { id: intentRef.id, status: value.status, qrCode: value.qrCode, qrCodeUrl: value.qrCodeUrl, expiresAt: value.expiresAt, amountCents: total, bluFeeCents: bluAmount };
});

export const checkPointOfSalePayment = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
  const id = String(payload?.paymentIntentId || ''), ref = admin.firestore().collection('pointOfSalePaymentIntents').doc(id), snapshot = await ref.get();
  if (!snapshot.exists) throw new functions.https.HttpsError('not-found', 'Pagamento não encontrado.');
  const intent = snapshot.data() || {};
  await companyMembership(context.auth.uid, String(intent.companyId || ''));
  const order = await pagarmeRequest(`/orders/${encodeURIComponent(String(intent.providerOrderId || ''))}`, 'GET');
  const status = posPaymentStatus(order), now = new Date().toISOString();
  await ref.set({ status, checkedAt: now, updatedAt: now, providerSnapshot: { status: order.status || '', chargeStatus: order.charges?.[0]?.status || '' } }, { merge: true });
  return { id, status, amountCents: Number(intent.amountCents || 0) };
});

export const managePointOfSalePaymentSettings = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
  const companyId = String(payload?.companyId || '');
  await companyMembership(context.auth.uid, companyId);
  const firestore = admin.firestore(), companyRef = firestore.collection('companies').doc(companyId), companySnap = await companyRef.get();
  if (!companySnap.exists) throw new functions.https.HttpsError('not-found', 'Empresa não encontrada.');
  const company = companySnap.data() || {}, memberships = await firestore.collection('companyUsers').where('userId', '==', context.auth.uid).get();
  const membershipData = memberships.docs.find(item => item.data().companyId === companyId)?.data() || {};
  const role = String(membershipData.role || membershipData.userType || '').toLowerCase();
  const canManage = company.ownerUserId === context.auth.uid || company.createdBy === context.auth.uid || companyId === `company-${context.auth.uid}` || ['owner', 'admin', 'administrator', 'administrador', 'proprietário', 'proprietario'].includes(role);
  const current = {
    pagarmeRecipientId: String(company.pagarmeRecipientId || company.paymentRecipientId || ''),
    tefEnabled: Boolean(company.posPayments?.tef?.enabled),
    tefProvider: String(company.posPayments?.tef?.provider || ''),
    tefTerminalId: String(company.posPayments?.tef?.terminalId || ''),
    tefStatus: String(company.posPayments?.tef?.status || 'awaiting_homologation'),
    canManage,
  };
  if (String(payload?.action || 'get') === 'get') return current;
  if (!canManage) throw new functions.https.HttpsError('permission-denied', 'Somente o administrador da empresa pode alterar os meios de pagamento do PDV.');
  const value = payload?.value || {}, now = new Date().toISOString();
  const next = {
    pagarmeRecipientId: String(value.pagarmeRecipientId || '').trim().slice(0, 120),
    tefEnabled: Boolean(value.tefEnabled),
    tefProvider: String(value.tefProvider || '').trim().slice(0, 80),
    tefTerminalId: String(value.tefTerminalId || '').trim().slice(0, 120),
    tefStatus: 'awaiting_homologation',
    canManage: true,
  };
  await companyRef.set({
    pagarmeRecipientId: next.pagarmeRecipientId,
    posPayments: { pix: { enabled: Boolean(next.pagarmeRecipientId), provider: 'pagarme' }, tef: { enabled: next.tefEnabled, provider: next.tefProvider, terminalId: next.tefTerminalId, status: next.tefStatus } },
    updatedAt: now,
    updatedBy: context.auth.uid,
  }, { merge: true });
  await firestore.collection('financialAuditLogs').add({ companyId, action: 'updatePosPaymentSettings', entityType: 'company', entityId: companyId, userId: context.auth.uid, createdAt: now, before: current, after: next });
  return next;
});

export const completePublicSale = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
  const requestedCompanyId = String(payload?.companyId || '');
  const member = requestedCompanyId ? await companyMembership(context.auth.uid, requestedCompanyId) : await membership(context.auth.uid);
  const items = Array.isArray(payload?.items) ? payload.items.slice(0, 100) : [];
  const clientId = String(payload?.clientId || '');
  const key = String(payload?.idempotencyKey || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  const requestedSaleId = String(payload?.saleId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  if (!clientId || !key || !items.length) throw new functions.https.HttpsError('invalid-argument', 'Cliente, itens e chave da operação são obrigatórios.');
  const firestore = admin.firestore();
  const saleRef = requestedSaleId ? firestore.collection('pointOfSaleSales').doc(requestedSaleId) : firestore.collection('pointOfSaleSales').doc();
  const marker = firestore.collection('idempotencyKeys').doc(`${member.companyId}_pdv_${key}`);
  const clientRef = firestore.collection('clients').doc(clientId);
  const registerId = String(payload?.registerId || '');
  if (!registerId) throw new functions.https.HttpsError('failed-precondition', 'Abra o caixa antes de concluir uma venda.');
  const registerRef = firestore.collection('pointOfSaleRegisters').doc(registerId);
  const productRefs: FirebaseFirestore.DocumentReference[] = items.map((item: any) => firestore.collection('products').doc(String(item.productId || '')));
  const paymentMethod = String(payload?.paymentMethod || 'invoice');
  const paymentIntentId = String(payload?.paymentIntentId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  const paymentIntentRef = paymentIntentId ? firestore.collection('pointOfSalePaymentIntents').doc(paymentIntentId) : null;
  const completedSaleId = await firestore.runTransaction(async tx => {
    const markerSnap = await tx.get(marker);
    if (markerSnap.exists) return String(markerSnap.data()?.entityId || '');
    const reads = await Promise.all([
      tx.get(clientRef),
      tx.get(registerRef),
      ...productRefs.map(ref => tx.get(ref)),
      ...(paymentIntentRef ? [tx.get(paymentIntentRef)] : []),
    ]);
    const clientSnap = reads[0];
    const registerSnap = reads[1];
    const productSnaps = reads.slice(2, 2 + productRefs.length);
    const paymentIntentSnap = paymentIntentRef ? reads[2 + productRefs.length] : null;
    if (!clientSnap.exists || clientSnap.data()?.companyId !== member.companyId) throw new functions.https.HttpsError('not-found', 'Cliente ou órgão não encontrado.');
    if (!registerSnap.exists || registerSnap.data()?.companyId !== member.companyId || registerSnap.data()?.operatorId !== context.auth!.uid || registerSnap.data()?.status !== 'open') throw new functions.https.HttpsError('failed-precondition', 'O caixa deste usuário não está aberto.');
    let gross = 0, taxes = 0;
    const now = new Date().toISOString();
    const normalized = items.map((item: any, index: number) => {
      const snap = productSnaps[index], product = snap.data();
      if (!snap.exists || product?.companyId !== member.companyId) throw new functions.https.HttpsError('not-found', 'Um produto não foi encontrado.');
      const quantityMilli = Number(item.quantityMilli), unitPriceCents = Number(item.unitPriceCents);
      if (!Number.isSafeInteger(quantityMilli) || quantityMilli <= 0 || !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) throw new functions.https.HttpsError('invalid-argument', 'Quantidade ou preço inválido.');
      const totalCents = Math.round(unitPriceCents * quantityMilli / 1000), taxCents = Math.round(totalCents * Number(product.taxPercent || 0) / 100);
      gross += totalCents; taxes += taxCents;
      if ((product.type || 'product') === 'product') {
        const current = Math.round(Number(product.stockQuantity || 0) * 1000);
        if (current < quantityMilli && !payload?.allowNegativeStock) throw new functions.https.HttpsError('failed-precondition', `Estoque insuficiente para ${product.name}.`);
        tx.update(productRefs[index], { stockQuantity: (current - quantityMilli) / 1000, lastStockUpdateAt: now, updatedAt: now, updatedBy: context.auth!.uid });
      }
      return { productId: snap.id, name: String(product.name || ''), barcode: String(product.barcode || ''), sku: String(product.sku || ''), quantityMilli, unit: String(product.unit || 'un'), unitPriceCents, totalCents, taxPercent: Number(product.taxPercent || 0), taxCents, ncm: String(product.ncm || ''), cfop: String(product.cfop || '') };
    });
    const discount = Number(payload?.discountCents || 0);
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > gross) throw new functions.https.HttpsError('invalid-argument', 'O desconto informado é inválido.');
    const net = gross - discount, client = clientSnap.data()!;
    let paid = paymentMethod === 'cash' ? true : Boolean(payload?.paid);
    if (paymentMethod === 'pix') {
      if (!paymentIntentRef || !paymentIntentSnap?.exists) throw new functions.https.HttpsError('failed-precondition', 'Gere e confirme o PIX antes de concluir a venda.');
      const intent = paymentIntentSnap.data() || {};
      if (intent.companyId !== member.companyId || intent.clientId !== clientId) throw new functions.https.HttpsError('permission-denied', 'Este PIX pertence a outra empresa ou cliente.');
      if (intent.status !== 'paid') throw new functions.https.HttpsError('failed-precondition', 'O pagamento PIX ainda não foi confirmado pelo Pagar.me.');
      if (Number(intent.amountCents || 0) !== net) throw new functions.https.HttpsError('failed-precondition', 'O valor confirmado no PIX é diferente do total atual da venda. Gere um novo QR Code.');
      if (intent.consumedAt && intent.saleId !== saleRef.id) throw new functions.https.HttpsError('already-exists', 'Este pagamento PIX já foi utilizado em outra venda.');
      paid = true;
      tx.update(paymentIntentRef, { consumedAt: now, saleId: saleRef.id, updatedAt: now });
    }
    const cashReceivedCents = paymentMethod === 'cash' ? Number(payload?.cashReceivedCents) : 0;
    if (paymentMethod === 'cash' && (!Number.isSafeInteger(cashReceivedCents) || cashReceivedCents < net)) throw new functions.https.HttpsError('invalid-argument', 'O valor recebido em dinheiro deve cobrir o total da venda.');
    const changeCents = paymentMethod === 'cash' ? cashReceivedCents - net : 0;
    const cardType = paymentMethod === 'card' ? String(payload?.cardType || 'credit') : '';
    const installments = paymentMethod === 'card' && cardType === 'credit' ? Number(payload?.installments || 1) : 1;
    if (paymentMethod === 'card' && !['credit', 'debit'].includes(cardType)) throw new functions.https.HttpsError('invalid-argument', 'Selecione crédito ou débito.');
    if (!Number.isSafeInteger(installments) || installments < 1 || installments > 12) throw new functions.https.HttpsError('invalid-argument', 'Quantidade de parcelas inválida.');
    const saleNumber = String(payload?.number || `PDV-${Date.now()}`), issueDate = String(payload?.issueDate || now.slice(0, 10));
    const common = { companyId: member.companyId, registerId, operatorId: context.auth!.uid, operatorName: String(registerSnap.data()?.operatorName || context.auth!.token.email || 'Operador'), saleId: saleRef.id, saleNumber, clientId, clientName: String(client.razaoSocial || client.name || ''), clientDocument: String(client.cnpj || client.organizationCnpj || ''), contractId: String(payload?.contractId || ''), contractName: String(payload?.contractName || ''), grossAmountCents: gross, discountCents: discount, taxAmountCents: taxes, netAmountCents: net, paymentMethod, paymentIntentId, cashReceivedCents, changeCents, cardType, installments, paymentCapture: paymentMethod === 'card' ? 'pinpad_pending' : paymentMethod === 'pix' ? 'pagarme_pix' : 'manual', issueDate, items: normalized, createdAt: now, updatedAt: now, createdBy: context.auth!.uid, updatedBy: context.auth!.uid };
    tx.set(saleRef, { ...common, status: paid ? 'completed' : 'pending', notes: String(payload?.notes || ''), fiscalRequested: Boolean(payload?.fiscalRequested), emailRequested: Boolean(payload?.sendEmail) });
    const movement = firestore.collection('financialTransactions').doc();
    tx.set(movement, { ...common, kind: 'income', description: `Venda ${saleNumber} - ${common.clientName}`, date: issueDate, dueDate: String(payload?.dueDate || issueDate), competence: issueDate.slice(0, 7), status: paid ? 'received' : 'pending', settledAmountCents: paid ? net : 0, balanceAmountCents: paid ? 0 : net, originType: 'pointOfSale', originId: saleRef.id, dreImpact: true, reconciled: false, version: 1 });
    let fiscalDocumentId = '';
    if (payload?.fiscalRequested) {
      const fiscal = firestore.collection('fiscalDocuments').doc(); fiscalDocumentId = fiscal.id;
      tx.set(fiscal, { ...common, number: '', series: '', accessKey: '', type: normalized.every((item: any) => String(item.ncm || '') === '') ? 'nfse' : 'nfe', status: 'draft', issuerName: String(payload?.issuerName || ''), recipientName: common.clientName, recipientDocument: common.clientDocument, organizationId: clientId, organizationName: common.clientName, description: `Venda ${saleNumber}`, withholdingAmountCents: 0, receiptUrls: [], version: 1, fiscalProvider: 'tecnospeed_plugnotas', providerStatus: 'awaiting_configuration', providerDocumentId: '', providerProtocol: '', integrationId: `blu-pdv-${saleRef.id}`, pdfUrl: '', xmlUrl: '', notes: 'Documento preparado pelo PDV. A autorização fiscal depende da contratação e configuração do PlugNotas/TecnoSpeed.' });
      tx.update(saleRef, { fiscalDocumentId: fiscal.id });
    }
    if (payload?.sendEmail && String(client.email || client.financialContact || '')) {
      const lines = normalized.map((x: any) => `<tr><td>${escapeHtml(x.name)}</td><td>${x.quantityMilli / 1000} ${escapeHtml(x.unit)}</td><td>R$ ${(x.totalCents / 100).toFixed(2)}</td></tr>`).join('');
      tx.set(firestore.collection('mail_queue').doc(), { companyId: member.companyId, userId: context.auth!.uid, to: String(client.financialContact || client.email), message: { subject: `Venda ${saleNumber} - Blu`, html: `<h2>Comprovante da venda ${escapeHtml(saleNumber)}</h2><p>Órgão/cliente: ${escapeHtml(common.clientName)}</p><table>${lines}</table><p><b>Total: R$ ${(net / 100).toFixed(2)}</b></p><p>Este comprovante não substitui documento fiscal.</p>`, text: `Venda ${saleNumber} - ${common.clientName} - Total R$ ${(net / 100).toFixed(2)}` }, createdAt: now });
    }
    tx.set(marker, { companyId: member.companyId, type: 'pointOfSale', entityId: saleRef.id, createdAt: now });
    tx.set(firestore.collection('financialAuditLogs').doc(), { companyId: member.companyId, action: 'completeSale', entityType: 'pointOfSale', entityId: saleRef.id, userId: context.auth!.uid, createdAt: now, before: null, after: { saleNumber, gross, discount, net, fiscalDocumentId, itemCount: normalized.length } });
    return saleRef.id;
  });
  return { id: completedSaleId || saleRef.id };
});
