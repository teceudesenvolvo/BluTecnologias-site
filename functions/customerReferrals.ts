import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
const validCnpj = (value: string) => {
  if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const check = (base: string) => {
    let weight = base.length - 7;
    const sum = [...base].reduce((total, digit) => { const next = total + Number(digit) * weight; weight = weight === 2 ? 9 : weight - 1; return next; }, 0);
    return sum % 11 < 2 ? 0 : 11 - sum % 11;
  };
  return check(value.slice(0, 12)) === Number(value[12]) && check(value.slice(0, 13)) === Number(value[13]);
};

export const customerReferralProgram = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Faça login.');
  const db = admin.firestore();
  const companyId = String(payload?.companyId || '');
  if (!companyId || companyId.includes('/')) throw new functions.https.HttpsError('invalid-argument', 'Empresa inválida.');
  const root = context.auth.token.email === 'admin@blutecnologias.com.br';
  const company = await db.collection('companies').doc(companyId).get();
  if (!root && company.data()?.ownerUserId !== context.auth.uid && companyId !== `company-${context.auth.uid}` && companyId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Somente o proprietário pode gerenciar indicações.');
  }
  const records = db.collection('customerReferrals');
  if (payload.action === 'register') {
    const name = String(payload.name || '').trim().slice(0, 150);
    const email = String(payload.email || '').trim().toLowerCase();
    const cnpj = digits(payload.cnpj);
    const businessType = payload.businessType;
    if (!validCnpj(cnpj)) throw new functions.https.HttpsError('invalid-argument', 'Informe um CNPJ válido para a empresa indicada.');
    if (!['comercio', 'servicos'].includes(businessType)) throw new functions.https.HttpsError('invalid-argument', 'Selecione comércio ou serviços.');
    if (cnpj === digits(company.data()?.document || company.data()?.cnpj)) throw new functions.https.HttpsError('invalid-argument', 'Não é permitido indicar a própria empresa.');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === context.auth.token.email) throw new functions.https.HttpsError('invalid-argument', 'Informe o nome e e-mail de outro cliente.');
    const id = `cnpj-${cnpj}`;
    await db.runTransaction(async tx => {
      const ref = records.doc(id);
      if ((await tx.get(ref)).exists) throw new functions.https.HttpsError('already-exists', 'Este CNPJ já foi indicado.');
      tx.create(ref, { companyId, name, email, cnpj, businessType, referralCode: admin.firestore().collection('unused').doc().id, status: 'pending', createdAt: new Date().toISOString(), createdBy: context.auth!.uid });
    });
  } else if (payload.action === 'close') {
    if (!root) throw new functions.https.HttpsError('permission-denied', 'O fechamento deve ser confirmado pela Blu.');
    const targetId = String(payload.targetCompanyId || '').trim();
    const id = String(payload.id || '');
    if (!targetId || targetId.includes('/') || !id || id.includes('/') || targetId === companyId) throw new functions.https.HttpsError('invalid-argument', 'Empresa indicada inválida.');
    await db.runTransaction(async tx => {
      const ref = records.doc(id);
      const lock = db.collection('customerReferralClosures').doc(targetId);
      const [record, target, existing] = await Promise.all([tx.get(ref), tx.get(db.collection('companies').doc(targetId)), tx.get(lock)]);
      if (!record.exists || record.data()?.companyId !== companyId || !target.exists) throw new functions.https.HttpsError('not-found', 'Indicação ou empresa não encontrada.');
      if (!record.data()?.cnpj || record.data()?.cnpj !== digits(target.data()?.document || target.data()?.cnpj)) throw new functions.https.HttpsError('failed-precondition', 'O CNPJ da empresa contratante não corresponde ao CNPJ indicado.');
      if (record.data()?.status === 'closed') return;
      if (existing.exists) throw new functions.https.HttpsError('already-exists', 'Empresa já contabilizada em outra indicação.');
      tx.create(lock, { referralId: id, companyId });
      tx.update(ref, { status: 'closed', targetCompanyId: targetId, closedAt: new Date().toISOString(), closedBy: context.auth!.uid });
    });
  } else if (payload.action !== 'list') throw new functions.https.HttpsError('invalid-argument', 'Ação inválida.');
  const snapshot = await records.where('companyId', '==', companyId).get();
  const listed = root ? await records.get() : snapshot;
  const items = listed.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  const count = snapshot.docs.filter(doc => doc.data().status === 'closed').length;
  return { items, discountPercent: count ? Math.min(100, count + 4) : 0 };
});
