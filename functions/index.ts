import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';
import * as https from 'https';

const financialConfigurationCollections: Record<string, string> = {
  categories: 'financialCategories', approvals: 'financialApprovalFlows', dre: 'dreAccounts',
  paymentMethods: 'financialConfigurationItems', collectionRules: 'financialConfigurationItems',
  taxes: 'financialConfigurationItems', numbering: 'financialConfigurationItems',
  permissions: 'financialConfigurationItems', preferences: 'financialConfigurationItems',
  integrations: 'financialConfigurationItems',
};
const financialAdministratorRoles = ['proprietário','proprietario','owner','administrador','administrator','financeiro'];
const configurationActions = ['create','update','inactivate'];

async function financialMembership(uid: string) {
  const membership = await admin.firestore().collection('companyUsers').where('userId','==',uid).limit(1).get();
  if (!membership.empty) return membership.docs[0].data() as {companyId:string;role?:string};
  return {companyId:`company-${uid}`,role:'proprietário'};
}

async function requireFinancialPermission(membership:{companyId:string;role?:string},permission:string){
  const role=String(membership.role||'').toLocaleLowerCase('pt-BR');
  if(['proprietário','proprietario','owner','administrador','administrator'].includes(role))return;
  const configured=await admin.firestore().collection('financialConfigurationItems').where('companyId','==',membership.companyId).where('section','==','permissions').get();
  const rule=configured.docs.map(item=>item.data()).find(item=>String(item.data?.role||'').toLocaleLowerCase('pt-BR')===role&&item.status==='active');
  const defaults:Record<string,string[]>={financeiro:['viewBankAccounts','viewBalances','createBankAccount','editBankAccount','inactivateBankAccount','transferBetweenAccounts','adjustBalance','importStatement','exportMovements','viewCostCenters','createCostCenter','editCostCenter','inactivateCostCenter','reorganizeCostCenters','defineCostCenterBudget','allocateCostCenters','viewFinancialResults','viewProjects','createProject','editProject','completeProject','cancelProject','reopenProject','linkProjectFinancials','viewProjectCosts','viewProjectMargin','manageProjectTeam'],financial:['viewBankAccounts','viewBalances','createBankAccount','editBankAccount','inactivateBankAccount','transferBetweenAccounts','adjustBalance','importStatement','exportMovements','viewCostCenters','createCostCenter','editCostCenter','inactivateCostCenter','reorganizeCostCenters','defineCostCenterBudget','allocateCostCenters','viewFinancialResults','viewProjects','createProject','editProject','completeProject','cancelProject','reopenProject','linkProjectFinancials','viewProjectCosts','viewProjectMargin','manageProjectTeam']};
  if(rule?.data?.[permission]===true||defaults[role]?.includes(permission))return;
  throw new functions.https.HttpsError('permission-denied','Seu perfil não possui esta permissão financeira.');
}

const maskBankValue=(value:string,visible=4)=>value?`${'*'.repeat(Math.max(0,value.length-visible))}${value.slice(-visible)}`:'';

export const mutateBankAccount=functions.https.onCall(async(payload,context)=>{
 if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');const action=String(payload?.action||'');if(!['create','update','inactivate'].includes(action))throw new functions.https.HttpsError('invalid-argument','Ação inválida.');
 const membership=await financialMembership(context.auth.uid);await requireFinancialPermission(membership,action==='create'?'createBankAccount':action==='update'?'editBankAccount':'inactivateBankAccount');const input=cleanFinancialValue(payload?.value||{})as Record<string,any>;const id=payload?.id?String(payload.id):undefined;const reference=id?admin.firestore().collection('bankAccounts').doc(id):admin.firestore().collection('bankAccounts').doc();
 if(action!=='inactivate'&&(!String(input.name||'').trim()||!String(input.institution||'').trim()))throw new functions.https.HttpsError('invalid-argument','Informe o nome e a instituição.');
 if(action==='update'&&id){const movements=await admin.firestore().collection('financialTransactions').where('companyId','==',membership.companyId).where('bankAccountId','==',id).limit(100).get();const first=movements.docs.map(x=>String(x.data().date||'')).filter(Boolean).sort()[0];if(first&&String(input.initialBalanceDate||'')>first)throw new functions.https.HttpsError('failed-precondition','O saldo inicial não pode ter data posterior à primeira movimentação.');}
 await admin.firestore().runTransaction(async transaction=>{const secretReference=admin.firestore().collection('bankAccountSecrets').doc(reference.id);const[snapshot,secretSnapshot]=await Promise.all([transaction.get(reference),transaction.get(secretReference)]);const before=snapshot.exists?snapshot.data()||null:null;if(action!=='create'&&!snapshot.exists)throw new functions.https.HttpsError('not-found','Conta não encontrada.');if(before&&before.companyId!==membership.companyId)throw new functions.https.HttpsError('permission-denied','Conta pertence a outra empresa.');const now=new Date().toISOString();if(action==='inactivate'){const after={...before,status:'inactive',updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1};transaction.set(reference,after);const audit=admin.firestore().collection('financialAuditLogs').doc();transaction.set(audit,{companyId:membership.companyId,action:'inactivate',entityType:'bankAccount',entityId:reference.id,userId:context.auth!.uid,createdAt:now,before,after});return;}
 const previousSecret=secretSnapshot.data()||{};const receivedAccount=String(input.accountNumber||'');const receivedDocument=String(input.holderDocument||'');const accountNumber=receivedAccount.includes('*')?String(previousSecret.accountNumber||''):receivedAccount;const holderDocument=receivedDocument.includes('*')?String(previousSecret.holderDocument||''):receivedDocument;const publicValue={...input,accountNumber:maskBankValue(accountNumber),holderDocument:maskBankValue(holderDocument),companyId:membership.companyId,currentBalanceCents:snapshot.exists?Number(before?.currentBalanceCents||0):Number(input.initialBalanceCents||0),updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1,...(!snapshot.exists?{createdAt:now,createdBy:context.auth!.uid}: {})};transaction.set(reference,publicValue,{merge:false});transaction.set(secretReference,{companyId:membership.companyId,accountNumber,holderDocument,updatedAt:now,updatedBy:context.auth!.uid},{merge:true});if(!snapshot.exists&&Number(input.initialBalanceCents||0)!==0){const movement=admin.firestore().collection('financialTransactions').doc();transaction.set(movement,{companyId:membership.companyId,bankAccountId:reference.id,kind:'balanceAdjustment',description:'Saldo inicial',amount:0,amountCents:Number(input.initialBalanceCents),date:String(input.initialBalanceDate),status:'completed',reconciled:true,dreImpact:false,createdAt:now,createdBy:context.auth!.uid});}const audit=admin.firestore().collection('financialAuditLogs').doc();transaction.set(audit,{companyId:membership.companyId,action:snapshot.exists?'update':'create',entityType:'bankAccount',entityId:reference.id,userId:context.auth!.uid,createdAt:now,before,after:publicValue});});return{id:reference.id};
});

export const transferBetweenBankAccounts=functions.https.onCall(async(payload,context)=>{if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');const membership=await financialMembership(context.auth.uid);await requireFinancialPermission(membership,'transferBetweenAccounts');const sourceId=String(payload?.sourceAccountId||''),destinationId=String(payload?.destinationAccountId||''),key=String(payload?.idempotencyKey||'');const amountCents=Number(payload?.amountCents);if(!sourceId||!destinationId||sourceId===destinationId||!key||!Number.isSafeInteger(amountCents)||amountCents<=0)throw new functions.https.HttpsError('invalid-argument','Transferência inválida.');const source=admin.firestore().collection('bankAccounts').doc(sourceId),destination=admin.firestore().collection('bankAccounts').doc(destinationId),idempotency=admin.firestore().collection('idempotencyKeys').doc(`${membership.companyId}_bankTransfer_${key}`),transfer=admin.firestore().collection('bankTransfers').doc();await admin.firestore().runTransaction(async tx=>{const[existing,sourceSnap,destinationSnap]=await Promise.all([tx.get(idempotency),tx.get(source),tx.get(destination)]);if(existing.exists)return;if(!sourceSnap.exists||!destinationSnap.exists)throw new functions.https.HttpsError('not-found','Conta não encontrada.');const from=sourceSnap.data()!,to=destinationSnap.data()!;if(from.companyId!==membership.companyId||to.companyId!==membership.companyId)throw new functions.https.HttpsError('permission-denied','Conta pertence a outra empresa.');if(from.status!=='active'||to.status!=='active')throw new functions.https.HttpsError('failed-precondition','As duas contas devem estar ativas.');if(Number(from.currentBalanceCents||0)+Number(from.creditLimitCents||0)<amountCents)throw new functions.https.HttpsError('failed-precondition','Saldo e limite insuficientes.');const now=new Date().toISOString(),date=String(payload?.date||now.slice(0,10)),description=String(payload?.description||'Transferência entre contas');tx.update(source,{currentBalanceCents:Number(from.currentBalanceCents||0)-amountCents,updatedAt:now,updatedBy:context.auth!.uid,version:Number(from.version||0)+1});tx.update(destination,{currentBalanceCents:Number(to.currentBalanceCents||0)+amountCents,updatedAt:now,updatedBy:context.auth!.uid,version:Number(to.version||0)+1});const common={companyId:membership.companyId,transferId:transfer.id,amount:0,amountCents,date,description,status:'completed',reconciled:false,dreImpact:false,createdAt:now,createdBy:context.auth!.uid};tx.set(admin.firestore().collection('financialTransactions').doc(),{...common,bankAccountId:sourceId,relatedBankAccountId:destinationId,kind:'transferOut'});tx.set(admin.firestore().collection('financialTransactions').doc(),{...common,bankAccountId:destinationId,relatedBankAccountId:sourceId,kind:'transferIn'});tx.set(transfer,{...common,sourceAccountId:sourceId,destinationAccountId:destinationId,receiptUrl:String(payload?.receiptUrl||''),notes:String(payload?.notes||'')});tx.set(idempotency,{companyId:membership.companyId,type:'bankTransfer',entityId:transfer.id,createdAt:now});tx.set(admin.firestore().collection('financialAuditLogs').doc(),{companyId:membership.companyId,action:'transfer',entityType:'bankTransfer',entityId:transfer.id,userId:context.auth!.uid,createdAt:now,before:null,after:{sourceAccountId:sourceId,destinationAccountId:destinationId,amountCents,date}});});return{id:transfer.id};});

export const adjustBankAccountBalance=functions.https.onCall(async(payload,context)=>{if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');const membership=await financialMembership(context.auth.uid);await requireFinancialPermission(membership,'adjustBalance');const id=String(payload?.accountId||''),amountCents=Number(payload?.amountCents),reason=String(payload?.reason||'').trim();if(!id||!reason||!Number.isSafeInteger(amountCents)||amountCents===0)throw new functions.https.HttpsError('invalid-argument','Ajuste inválido ou sem motivo.');const account=admin.firestore().collection('bankAccounts').doc(id);await admin.firestore().runTransaction(async tx=>{const snap=await tx.get(account);if(!snap.exists||snap.data()?.companyId!==membership.companyId)throw new functions.https.HttpsError('not-found','Conta não encontrada.');const before=snap.data()!,now=new Date().toISOString(),afterBalance=Number(before.currentBalanceCents||0)+amountCents;tx.update(account,{currentBalanceCents:afterBalance,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before.version||0)+1});tx.set(admin.firestore().collection('financialTransactions').doc(),{companyId:membership.companyId,bankAccountId:id,kind:'balanceAdjustment',description:'Ajuste manual de saldo',amount:0,amountCents,date:String(payload?.date||now.slice(0,10)),status:'completed',reconciled:false,dreImpact:false,adjustmentReason:reason,createdAt:now,createdBy:context.auth!.uid});tx.set(admin.firestore().collection('financialAuditLogs').doc(),{companyId:membership.companyId,action:'balanceAdjustment',entityType:'bankAccount',entityId:id,userId:context.auth!.uid,createdAt:now,before:{currentBalanceCents:before.currentBalanceCents},after:{currentBalanceCents:afterBalance,amountCents,reason}});});return{id};});

export const mutateCostCenter=functions.https.onCall(async(payload,context)=>{if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');const membership=await financialMembership(context.auth.uid),action=String(payload?.action||'');const permission=action==='create'?'createCostCenter':action==='update'?'editCostCenter':action==='inactivate'?'inactivateCostCenter':'reorganizeCostCenters';await requireFinancialPermission(membership,permission);if(!['create','update','inactivate','reparent'].includes(action))throw new functions.https.HttpsError('invalid-argument','Ação inválida.');const id=payload?.id?String(payload.id):undefined,reference=id?admin.firestore().collection('costCenters').doc(id):admin.firestore().collection('costCenters').doc(),input=cleanFinancialValue(payload?.value||{})as Record<string,any>;const all=await admin.firestore().collection('costCenters').where('companyId','==',membership.companyId).get(),centers=all.docs.map(x=>({id:x.id,...x.data()}));const requestedParent=action==='reparent'?(payload?.parentId?String(payload.parentId):null):(input.parentId?String(input.parentId):null);if(requestedParent===reference.id)throw new functions.https.HttpsError('failed-precondition','Um centro não pode ser pai de si mesmo.');if(requestedParent){let cursor:string|null=requestedParent;const visited=new Set<string>();while(cursor){if(cursor===reference.id)throw new functions.https.HttpsError('failed-precondition','A alteração criaria um ciclo na hierarquia.');if(visited.has(cursor))throw new functions.https.HttpsError('failed-precondition','A hierarquia existente possui um ciclo.');visited.add(cursor);const parent:any=centers.find((x:any)=>x.id===cursor);if(!parent)throw new functions.https.HttpsError('not-found','Centro de custo pai não encontrado.');cursor=parent.parentId||null;}}
 await admin.firestore().runTransaction(async tx=>{const snapshot=await tx.get(reference),before=snapshot.exists?snapshot.data()||null:null;if(action!=='create'&&!snapshot.exists)throw new functions.https.HttpsError('not-found','Centro de custo não encontrado.');if(before&&before.companyId!==membership.companyId)throw new functions.https.HttpsError('permission-denied','Registro pertence a outra empresa.');const now=new Date().toISOString();let after:any;if(action==='inactivate')after={...before,status:'inactive',updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1};else if(action==='reparent')after={...before,parentId:requestedParent,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1};else{if(!String(input.code||'').trim()||!String(input.name||'').trim()||!Number.isSafeInteger(Number(input.budgetCents)))throw new functions.https.HttpsError('invalid-argument','Código, nome e orçamento são obrigatórios.');after={...input,parentId:requestedParent,companyId:membership.companyId,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1,...(!snapshot.exists?{createdAt:now,createdBy:context.auth!.uid}:{})};}tx.set(reference,after,{merge:false});tx.set(admin.firestore().collection('financialAuditLogs').doc(),{companyId:membership.companyId,action,entityType:'costCenter',entityId:reference.id,userId:context.auth!.uid,createdAt:now,before,after});});return{id:reference.id};});

export const allocateFinancialTransaction=functions.https.onCall(async(payload,context)=>{if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');const membership=await financialMembership(context.auth.uid);await requireFinancialPermission(membership,'allocateCostCenters');const transactionId=String(payload?.transactionId||''),parts=Array.isArray(payload?.allocations)?payload.allocations:[];if(!transactionId||!parts.length||parts.reduce((s:number,x:any)=>s+Number(x.percentageBasisPoints||0),0)!==10000)throw new functions.https.HttpsError('invalid-argument','O rateio deve fechar exatamente em 100%.');const transactionRef=admin.firestore().collection('financialTransactions').doc(transactionId),existing=await admin.firestore().collection('financialAllocations').where('companyId','==',membership.companyId).where('transactionId','==',transactionId).get();await admin.firestore().runTransaction(async tx=>{const movement=await tx.get(transactionRef);if(!movement.exists||movement.data()?.companyId!==membership.companyId)throw new functions.https.HttpsError('not-found','Lançamento não encontrado.');const amountCents=Math.abs(Number(movement.data()?.amountCents||Math.round(Number(movement.data()?.amount||0)*100)));if(!Number.isSafeInteger(amountCents))throw new functions.https.HttpsError('failed-precondition','O lançamento não possui valor monetário válido.');const centerSnaps=await Promise.all(parts.map((x:any)=>tx.get(admin.firestore().collection('costCenters').doc(String(x.costCenterId)))));if(centerSnaps.some(x=>!x.exists||x.data()?.companyId!==membership.companyId||x.data()?.status!=='active'||!x.data()?.allowsEntries))throw new functions.https.HttpsError('failed-precondition','Um centro selecionado está inativo ou não permite lançamentos.');existing.docs.forEach(x=>tx.delete(x.ref));let allocated=0;parts.forEach((part:any,index:number)=>{const value=index===parts.length-1?amountCents-allocated:Math.floor(amountCents*Number(part.percentageBasisPoints)/10000);allocated+=value;tx.set(admin.firestore().collection('financialAllocations').doc(),{companyId:membership.companyId,transactionId,costCenterId:String(part.costCenterId),percentageBasisPoints:Number(part.percentageBasisPoints),amountCents:value,createdAt:new Date().toISOString(),createdBy:context.auth!.uid});});tx.update(transactionRef,{costCenterId:null,costCenterName:null,allocated:true,updatedAt:new Date().toISOString(),updatedBy:context.auth!.uid});tx.set(admin.firestore().collection('financialAuditLogs').doc(),{companyId:membership.companyId,action:'allocate',entityType:'financialTransaction',entityId:transactionId,userId:context.auth!.uid,createdAt:new Date().toISOString(),before:{allocations:existing.docs.map(x=>x.data())},after:{allocations:parts}});});return{id:transactionId};});

export const mutateFinancialProject=functions.https.onCall(async(payload,context)=>{if(!context.auth)throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');const membership=await financialMembership(context.auth.uid),action=String(payload?.action||'');if(!['create','update','complete','cancel','reopen'].includes(action))throw new functions.https.HttpsError('invalid-argument','Ação inválida.');await requireFinancialPermission(membership,action==='create'?'createProject':action==='update'?'editProject':action==='complete'?'completeProject':action==='cancel'?'cancelProject':'reopenProject');const id=payload?.id?String(payload.id):undefined,reference=id?admin.firestore().collection('projects').doc(id):admin.firestore().collection('projects').doc(),input=cleanFinancialValue(payload?.value||{})as Record<string,any>,members=Array.isArray(input.memberIds)?input.memberIds.map(String):[];if(action==='cancel'&&!String(payload?.reason||'').trim())throw new functions.https.HttpsError('invalid-argument','Informe a justificativa do cancelamento.');const existingMembers=id?await admin.firestore().collection('projectMembers').where('companyId','==',membership.companyId).where('projectId','==',id).get():null;
 await admin.firestore().runTransaction(async tx=>{const snapshot=await tx.get(reference),before=snapshot.exists?snapshot.data()||null:null;if(action!=='create'&&!snapshot.exists)throw new functions.https.HttpsError('not-found','Projeto não encontrado.');if(before&&before.companyId!==membership.companyId)throw new functions.https.HttpsError('permission-denied','Projeto pertence a outra empresa.');if(action==='update'&&before?.status==='completed')throw new functions.https.HttpsError('failed-precondition','Reabra o projeto antes de registrar alterações.');const now=new Date().toISOString();let after:any;if(action==='complete')after={...before,status:'completed',progressPercent:100,completedAt:now,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1};else if(action==='cancel')after={...before,status:'cancelled',cancellationReason:String(payload.reason).trim(),cancelledAt:now,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1};else if(action==='reopen')after={...before,status:'active',completedAt:null,cancelledAt:null,cancellationReason:null,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1};else{if(!String(input.code||'').trim()||!String(input.name||'').trim())throw new functions.https.HttpsError('invalid-argument','Código e nome são obrigatórios.');for(const key of['budgetCents','expectedRevenueCents','expectedCostCents'])if(!Number.isSafeInteger(Number(input[key]||0)))throw new functions.https.HttpsError('invalid-argument','Valores financeiros devem usar centavos inteiros.');after={...input,memberIds:members,expectedMarginCents:Number(input.expectedRevenueCents||0)-Number(input.expectedCostCents||0),companyId:membership.companyId,updatedAt:now,updatedBy:context.auth!.uid,version:Number(before?.version||0)+1,...(!snapshot.exists?{createdAt:now,createdBy:context.auth!.uid}:{})};}tx.set(reference,after,{merge:false});if(action==='create'||action==='update'){existingMembers?.docs.forEach(x=>tx.delete(x.ref));members.forEach(userId=>tx.set(admin.firestore().collection('projectMembers').doc(`${reference.id}_${userId}`),{companyId:membership.companyId,projectId:reference.id,userId,role:'member',createdAt:now,createdBy:context.auth!.uid}));}tx.set(admin.firestore().collection('financialAuditLogs').doc(),{companyId:membership.companyId,action,entityType:'project',entityId:reference.id,userId:context.auth!.uid,createdAt:now,before,after});});return{id:reference.id};});

function cleanFinancialValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new functions.https.HttpsError('invalid-argument','Valores numéricos devem ser inteiros seguros. Use centavos ou pontos-base.');
    return value;
  }
  if (Array.isArray(value)) return value.slice(0,100).map(cleanFinancialValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string,unknown>).slice(0,100).map(([key,item])=>[key,cleanFinancialValue(item)]));
  throw new functions.https.HttpsError('invalid-argument','Tipo de campo não suportado.');
}

export const mutateFinancialConfiguration = functions.https.onCall(async (payload, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated','Faça login para continuar.');
  const action=String(payload?.action||'');const section=String(payload?.section||'');const id=payload?.id?String(payload.id):undefined;
  if(!configurationActions.includes(action)||!financialConfigurationCollections[section]) throw new functions.https.HttpsError('invalid-argument','Comando de configuração inválido.');
  const membership=await financialMembership(context.auth.uid);const role=String(membership.role||'').toLocaleLowerCase('pt-BR');
  if(!financialAdministratorRoles.includes(role)) throw new functions.https.HttpsError('permission-denied','Seu perfil não pode alterar configurações financeiras.');
  const input=cleanFinancialValue(payload?.value||{}) as Record<string,unknown>;const name=String(input.name||'').trim();
  if(!name||name.length>160) throw new functions.https.HttpsError('invalid-argument','Informe um nome válido.');
  const collectionName=financialConfigurationCollections[section];const reference=id?admin.firestore().collection(collectionName).doc(id):admin.firestore().collection(collectionName).doc();
  await admin.firestore().runTransaction(async transaction=>{
    const snapshot=await transaction.get(reference);const before=snapshot.exists?snapshot.data()||null:null;
    if(action!=='create'&&!snapshot.exists) throw new functions.https.HttpsError('not-found','Configuração não encontrada.');
    if(snapshot.exists&&before?.companyId!==membership.companyId) throw new functions.https.HttpsError('permission-denied','Configuração pertence a outra empresa.');
    if(action==='inactivate'&&section==='categories'){
      const linked=await admin.firestore().collection('financialTransactions').where('companyId','==',membership.companyId).where('categoryId','==',reference.id).limit(1).get();
      if(!linked.empty&&payload?.hardDelete) throw new functions.https.HttpsError('failed-precondition','Categorias utilizadas não podem ser excluídas.');
    }
    const timestamp=new Date().toISOString();const after={...input,section,status:action==='inactivate'?'inactive':String(input.status||'active'),companyId:membership.companyId,updatedAt:timestamp,updatedBy:context.auth!.uid,...(!snapshot.exists?{createdAt:timestamp,createdBy:context.auth!.uid}:{}),version:Number(before?.version||0)+1};
    transaction.set(reference,after,{merge:false});
    const audit=admin.firestore().collection('financialAuditLogs').doc();transaction.set(audit,{companyId:membership.companyId,action,entityType:section,entityId:reference.id,userId:context.auth!.uid,createdAt:timestamp,before,after,source:'mutateFinancialConfiguration'});
  });
  return {id:reference.id};
});

// Inicializa o admin apenas uma vez. Em alguns ambientes a Database URL
// não é detectada automaticamente, então tentamos montar a databaseURL a
// partir de variáveis de ambiente conhecidas (FIREBASE_DATABASE_URL ou
// GCLOUD_PROJECT/GCP_PROJECT). Isso evita o erro "Can't determine Firebase Database URL.".
try {
  if (!admin.apps.length) {
    const envDb = process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASEURL || process.env.FIREBASE_DATABASE;
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GAE_APPLICATION || undefined;

    // Prefer explicit env var. If missing, try common Realtime DB host patterns.
    let databaseURL: string | undefined = envDb;
    if (!databaseURL && projectId) {
      // Newer projects often use <project>-default-rtdb.firebaseio.com
      const candidate1 = `https://${projectId}-default-rtdb.firebaseio.com`;
      const candidate2 = `https://${projectId}.firebaseio.com`;
      // Prefer candidate1 then candidate2
      databaseURL = candidate1 || candidate2;
      console.log('admin: inferred database candidates=', [candidate1, candidate2]);
    }

    if (databaseURL) {
      admin.initializeApp({ databaseURL });
      console.log('admin initialized with databaseURL=', databaseURL);
    } else {
      admin.initializeApp();
      console.log('admin initialized without explicit databaseURL');
    }
  }
} catch (e) {
  // já inicializado no ambiente do emulador ou em deploy
  console.log('admin.initializeApp skipped or failed (already initialized?):', String(e));
}

// Função HTTP de teste para verificar deploy/visibilidade
export const helloWorld = functions.https.onRequest((req, res) => {
  res.send('Hello from BluTecnologias functions!');
});

// Proxy público e estritamente limitado às consultas oficiais usadas pela Blu.
// Não aceita credenciais, headers de autenticação, métodos de escrita ou URLs arbitrárias.
export const pncpProxy = functions.https.onRequest((req, res) => {
  cors({ origin: true, methods: ['GET'] })(req, res, () => {
    if (req.method !== 'GET') {
      res.status(405).json({ message: 'Método não permitido.' });
      return;
    }

    const incomingPath = req.path.replace(/^\/api\/pncp/, '');
    const pathMap: Record<string, string> = {
      '/domain/v1/modalidades': '/api/pncp/v1/modalidades',
      '/consulta/v1/contratacoes/publicacao': '/api/consulta/v1/contratacoes/publicacao',
    };
    const detailPattern = /^\/consulta\/v1\/orgaos\/\d{14}\/compras\/\d{4}\/\d+$/;
    const domainPattern = /^\/domain\/v1\/orgaos\/\d{14}\/(compras\/\d{4}\/\d+\/(itens(\/\d+\/resultados)?|arquivos|historico)|contratos\/contratacao\/\d{4}\/\d+)$/;
    const filePattern = /^\/file\/v1\/orgaos\/\d{14}\/compras\/\d{4}\/\d+\/arquivos\/\d+$/;
    const upstreamPath = pathMap[incomingPath]
      || (detailPattern.test(incomingPath) ? incomingPath.replace(/^\/consulta\/v1/, '/api/consulta/v1') : undefined)
      || (domainPattern.test(incomingPath) ? incomingPath.replace(/^\/domain\/v1/, '/api/pncp/v1') : undefined)
      || (filePattern.test(incomingPath) ? incomingPath.replace(/^\/file\/v1/, '/pncp-api/v1') : undefined);
    if (!upstreamPath) {
      res.status(404).json({ message: 'Consulta não suportada.' });
      return;
    }

    const allowedParameters = incomingPath.includes('modalidades')
      ? ['statusAtivo']
      : ['dataInicial', 'dataFinal', 'codigoModalidadeContratacao', 'uf', 'pagina'];
    const query = new URLSearchParams();
    allowedParameters.forEach((name) => {
      const value = req.query[name];
      if (typeof value === 'string' && value.length <= 32) query.set(name, value);
    });

    const upstreamUrl = `https://pncp.gov.br${upstreamPath}?${query.toString()}`;
    https.get(upstreamUrl, { headers: { Accept: 'application/json', 'User-Agent': 'Blu-PNCP-Connector/1.0' } }, (upstream) => {
      const chunks: Buffer[] = [];
      upstream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      upstream.on('end', () => {
        const status = upstream.statusCode || 502;
        res.status(status);
        const disposition = String(upstream.headers['content-disposition'] || '');
        const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || 'arquivo';
        const extension = filename.split('.').pop()?.toLowerCase();
        const previewTypes: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', txt: 'text/plain' };
        res.set('Content-Type', filePattern.test(incomingPath) ? (previewTypes[extension || ''] || upstream.headers['content-type'] || 'application/octet-stream') : (upstream.headers['content-type'] || 'application/json'));
        if (filePattern.test(incomingPath)) res.set('Content-Disposition', `inline; filename="${filename.replace(/["\r\n]/g, '')}"`);
        res.set('Cache-Control', incomingPath.includes('modalidades') ? 'public, max-age=3600' : 'public, max-age=60');
        res.send(Buffer.concat(chunks));
      });
    }).on('error', (error) => {
      console.error('pncpProxy:', error.message);
      res.status(502).json({ message: 'O PNCP está temporariamente indisponível.' });
    });
  });
});

// Proxy restrito à consulta pública de contratações do Compras.gov.br.
export const comprasGovProxy = functions.https.onRequest((req, res) => {
  cors({ origin: true, methods: ['GET'] })(req, res, () => {
    if (req.method !== 'GET') { res.status(405).json({ message: 'Método não permitido.' }); return; }
    const incomingPath = req.path.replace(/^\/api\/compras-gov/, '');
    if (incomingPath !== '/modulo-contratacoes/1_consultarContratacoes_PNCP_14133') { res.status(404).json({ message: 'Consulta não suportada.' }); return; }
    const allowed = ['pagina','tamanhoPagina','dataPublicacaoPncpInicial','dataPublicacaoPncpFinal','codigoModalidade','unidadeOrgaoUfSigla'];
    const query = new URLSearchParams();
    allowed.forEach((name) => { const value=req.query[name]; if(typeof value==='string'&&value.length<=32)query.set(name,value); });
    const upstreamUrl=`https://dadosabertos.compras.gov.br${incomingPath}?${query}`;
    https.get(upstreamUrl,{headers:{Accept:'application/json','User-Agent':'Blu-ComprasGov-Connector/1.0'}},(upstream)=>{
      const chunks:Buffer[]=[];upstream.on('data',(chunk)=>chunks.push(Buffer.from(chunk)));upstream.on('end',()=>{res.status(upstream.statusCode||502);res.set('Content-Type',upstream.headers['content-type']||'application/json');res.set('Cache-Control','public, max-age=60');res.send(Buffer.concat(chunks));});
    }).on('error',(error)=>{console.error('comprasGovProxy:',error.message);res.status(502).json({message:'O Compras.gov.br está temporariamente indisponível.'});});
  });
});

export const tceCeProxy = functions.https.onRequest((req,res)=>{cors({origin:true,methods:['GET']})(req,res,()=>{if(req.method!=='GET'){res.status(405).json({message:'Método não permitido.'});return;}const path=req.path.replace(/^\/api\/tce-ce/,'');const allowedPaths=['/municipios','/processos_administrativos_contratacoes'];if(!allowedPaths.includes(path)){res.status(404).json({message:'Consulta não suportada.'});return;}const allowed=['codigo_municipio','data_inicio','data_fim','$format','$count','$start_index'];const query=new URLSearchParams();allowed.forEach((name)=>{const value=req.query[name];if(typeof value==='string'&&value.length<=32)query.set(name,value)});https.get(`https://api-dados-abertos.tce.ce.gov.br/sim${path}?${query}`,{headers:{Accept:'application/json','User-Agent':'Blu-TCECE-Connector/1.0'}},(upstream)=>{const chunks:Buffer[]=[];upstream.on('data',(chunk)=>chunks.push(Buffer.from(chunk)));upstream.on('end',()=>{res.status(upstream.statusCode||502);res.set('Content-Type',upstream.headers['content-type']||'application/json');res.set('Cache-Control',path==='/municipios'?'public, max-age=86400':'public, max-age=300');res.send(Buffer.concat(chunks));});}).on('error',()=>res.status(502).json({message:'TCE-CE temporariamente indisponível.'}));});});

// Helper to parse data URLs (data:<mime>;base64,<data>)
function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2].replace(/\s/g, '') };
}

// Normalize config values (strip surrounding quotes and trim)
function normalizeCfgValue(v: any) {
  if (typeof v !== 'string') return v;
  let s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s;
}

// Module-scoped transporter memoization mirroring oassessor logic
let cachedTransporter: any = null;
let cachedFrom: string | undefined = undefined;
function getTransporter() {
  if (cachedTransporter) return { transporter: cachedTransporter, from: cachedFrom };

  // Prefer process.env, then functions.config().smtp
  const cfg = functions.config && (functions.config() as any).smtp ? (functions.config() as any).smtp : undefined;
  const host = normalizeCfgValue(process.env.SMTP_HOST) || normalizeCfgValue(cfg?.host) || undefined;
  const portRaw = normalizeCfgValue(process.env.SMTP_PORT) || normalizeCfgValue(cfg?.port) || undefined;
  const port = portRaw ? Number(portRaw) : undefined;
  const user = normalizeCfgValue(process.env.SMTP_USER) || normalizeCfgValue(cfg?.user) || undefined;
  const pass = normalizeCfgValue(process.env.SMTP_PASS) || normalizeCfgValue(cfg?.pass) || undefined;
  const fromEmail = normalizeCfgValue(process.env.FROM_EMAIL) || normalizeCfgValue(cfg?.from) || user;
  const fromName = normalizeCfgValue(process.env.FROM_NAME) || 'BluTecnologias';

  if (!user || !pass) {
    // can't build transporter without auth
    return { transporter: null, from: fromEmail };
  }

  // If host indicates Gmail or explicit SERVICE env var, prefer using 'service: "gmail"' which simplifies config
  const useGmailService = (String(host || '').toLowerCase().includes('gmail')) || (process.env.SMTP_SERVICE === 'gmail');

  const transportOpts: any = useGmailService ? { service: 'gmail', auth: { user, pass } } : { host, port, auth: { user, pass }, secure: port === 465 };

  try {
    cachedTransporter = nodemailer.createTransport(transportOpts);
    cachedFrom = `${fromName} <${fromEmail}>`;
    console.log('getTransporter: created transporter, gmail=', useGmailService, 'host=', host ? 'present' : 'none');
    return { transporter: cachedTransporter, from: cachedFrom };
  } catch (e) {
    console.error('getTransporter: error creating transporter', String(e));
    return { transporter: null, from: fromEmail };
  }
}

async function uploadBase64ToStorage(dataUrl: string, path: string): Promise<string | null> {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return null;

    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    const buffer = Buffer.from(parsed.base64, 'base64');

    await file.save(buffer, {
      metadata: { contentType: parsed.mime },
    });

    // Torna o arquivo público para gerar uma URL de acesso direto
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${path}`;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    return null;
  }
}

async function saveReportToStorageAndDb(clientId: string, reportFile: string, title: string, userId?: string) {
  try {
    if (!reportFile || !reportFile.startsWith('data:')) return;

    const path = `reports/${clientId}/${Date.now()}_report.pdf`;
    const fileUrl = await uploadBase64ToStorage(reportFile, path) || reportFile;

    const report = {
      id: `report-${Date.now()}`,
      title: title || 'Relatório',
      month: new Date().toISOString().slice(0, 7),
      fileUrl: fileUrl,
      date: new Date().toISOString(),
      userId: userId || null
    };
    await admin.firestore().doc(`clients/${clientId}`).update({ reports: admin.firestore.FieldValue.arrayUnion(report) });
    console.log('Report saved successfully to Firestore:', report.id);
  } catch (e) {
    console.error('Error saving report:', e);
  }
}

async function saveInvoiceToStorageAndDb(clientId: string, invoiceFile: string, value: number, userId?: string) {
  try {
    if (!invoiceFile || !invoiceFile.startsWith('data:')) return;

    const path = `invoices/${clientId}/${Date.now()}_invoice.pdf`;
    const fileUrl = await uploadBase64ToStorage(invoiceFile, path) || invoiceFile;

    const invoice = {
      id: `invoice-${Date.now()}`,
      month: new Date().toISOString().slice(0, 7),
      amount: Number(value || 0),
      status: 'sent',
      fileUrl: fileUrl,
      date: new Date().toISOString(),
      userId: userId || null
    };
    await admin.firestore().doc(`clients/${clientId}`).update({ invoices: admin.firestore.FieldValue.arrayUnion(invoice) });
    console.log('Invoice saved successfully to Firestore:', invoice.id);
  } catch (e) {
    console.error('Error saving invoice:', e);
  }
}

function fetchUrlToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Request Failed. Status Code: ${res.statusCode}`));
      }
      const data: any[] = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

/**
 * Callable function to send billing emails.
 * Expects data: { clientId, title, value, bankAccount, invoiceFile?, reportFile?, emailText? }
 */
export const sendBillingEmail = functions.https.onCall(async (data, context) => {
  try {
    const { clientId, title, value, bankAccount, pixKey, invoiceFile, reportFile, emailText, certificateFiles, selectedCertificates, solutionSelect, userId, senderCompany } = data || {};

    console.log('sendBillingEmail called with:', {
      clientId,
      hasInvoice: !!invoiceFile,
      hasReport: !!reportFile,
      certFilesCount: certificateFiles?.length,
      selectedCertsCount: selectedCertificates?.length
    });

    if (!clientId) throw new functions.https.HttpsError('invalid-argument', 'clientId is required');

    const snap = await admin.firestore().doc(`clients/${clientId}`).get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Client not found');
    const client = snap.data() || {};

    const to = client.email || client.financialContact || null;
    if (!to) throw new functions.https.HttpsError('failed-precondition', 'Client has no email to send to');

    // Build or get cached transporter
    const { transporter, from: computedFrom } = getTransporter();
    if (!transporter) {
      console.error('sendBillingEmail: transporter not available; host/user/pass missing at runtime');
      throw new functions.https.HttpsError('failed-precondition', 'SMTP configuration is missing or invalid.');
    }
    const effectiveFrom = computedFrom;
    // Debug info (avoid logging secrets)
    console.log('sendBillingEmail: sending via transporter, from=', effectiveFrom);

    const attachments: any[] = [];
    if (invoiceFile && typeof invoiceFile === 'string' && invoiceFile.length > 0) {
      if (invoiceFile.startsWith('data:')) {
        const parsed = parseDataUrl(invoiceFile);
        if (parsed) attachments.push({ filename: 'Nota_Fiscal.pdf', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
      } else if (invoiceFile.startsWith('http')) {
        try {
          const buffer = await fetchUrlToBuffer(invoiceFile);
          attachments.push({ filename: 'Nota_Fiscal.pdf', content: buffer });
        } catch (err) { console.error('Error attaching invoice from URL:', err); }
      }
    }
    if (reportFile && typeof reportFile === 'string' && reportFile.length > 0) {
      if (reportFile.startsWith('data:')) {
        const parsed = parseDataUrl(reportFile);
        if (parsed) attachments.push({ filename: 'Relatorio.pdf', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
      } else if (reportFile.startsWith('http')) {
        try {
          const buffer = await fetchUrlToBuffer(reportFile);
          attachments.push({ filename: 'Relatorio.pdf', content: buffer });
        } catch (err) { console.error('Error attaching report from URL:', err); }
      }
    }
    // certificateFiles: optional array of { filename, dataUrl } OR selectedCertificates { name, fileUrl }
    const certs = certificateFiles || selectedCertificates;
    if (Array.isArray(certs)) {
      for (const cf of certs) {
        if (cf) {
          const fname = cf.filename || (cf.name ? `${cf.name}.pdf` : 'documento.pdf');
          // Check for dataUrl or fileUrl being a data URI
          const rawDataUrl = cf.dataUrl || (typeof cf.fileUrl === 'string' && cf.fileUrl.startsWith('data:') ? cf.fileUrl : null);
          const remoteUrl = cf.fileUrl || (typeof cf.path === 'string' && cf.path.startsWith('http') ? cf.path : null);

          if (typeof rawDataUrl === 'string') {
            const parsed = parseDataUrl(rawDataUrl);
            if (parsed) {
              attachments.push({ filename: fname, content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
              console.log(`Attached certificate (Base64): ${fname}`);
            } else {
              console.warn(`Failed to parse Data URI for certificate: ${fname}`);
            }
          } else if (typeof remoteUrl === 'string' && remoteUrl.startsWith('http')) {
            try {
              const buffer = await fetchUrlToBuffer(remoteUrl);
              attachments.push({ filename: fname, content: buffer });
              console.log(`Attached certificate (URL): ${fname}`);
            } catch (fetchErr) {
              console.error(`Failed to fetch certificate ${fname}:`, fetchErr);
            }
          } else if (typeof cf.fileUrl === 'string' && cf.fileUrl.length > 50) {
            // Fallback: trata como base64 sem prefixo se for uma string longa
            attachments.push({ filename: fname, content: Buffer.from(cf.fileUrl, 'base64'), contentType: 'application/pdf' });
            console.log(`Attached certificate (Raw Base64): ${fname}`);
          }
        }
      }
    }

    const html = `
      <p>Olá, Prezados</p>
      <p>À ${client.razaoSocial}</p>
      <p>Espero que este email os encontre bem. <br/>
      Estamos entrando em contato para enviar os arquivos em relação à fatura referente à ${solutionSelect || client.solutionSelect || 'serviços contratados'} </p>
      <ul>
        <li><strong>Título:</strong> ${title || '-'} </li>
        <li><strong>Valor:</strong> R$ ${Number(value || 0).toFixed(2)}</li>
        <li><strong>Conta para pagamento:</strong> ${bankAccount || '-'}</li>
        ${pixKey ? `<li><strong>Chave PIX:</strong> ${pixKey}</li>` : ''}
      </ul>
      <p>${emailText || ''}</p>
      <p>Atenciosamente, ${senderCompany || 'Blu Tecnologias'}. <br/>
      
      <br/>
      <strong>Enviado utilizando o sistema Blu</strong></p>
      <p> Para dúvidas ou suporte, entre em contato conosco através dos nossos canais oficiais. </p>
      <p> Este é um email automático, por favor, não responda. </p>
    `;

    const mailOptions = {
      from: effectiveFrom,
      to,
      subject: `Cobrança: ${title || 'Nova cobrança'}`,
      html,
      attachments
    } as any;

    await transporter.sendMail(mailOptions);

    if (reportFile && typeof reportFile === 'string') {
      await saveReportToStorageAndDb(clientId, reportFile, `Relatório - ${title || 'Cobrança'}`, userId || context.auth?.uid);
    }
    if (invoiceFile && typeof invoiceFile === 'string') {
      await saveInvoiceToStorageAndDb(clientId, invoiceFile, value, userId || context.auth?.uid);
    }

    return { success: true };
  } catch (err: any) {
    console.error('sendBillingEmail error:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Unknown error');
  }
});

// CORS middleware instance (allow all origins; the function will be protected by auth if needed)
const corsHandler = cors({ origin: true });

// HTTP endpoint that accepts POST from the frontend (handles CORS preflight)
export const sendBillingEmailHttp = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    // Diagnostic: log top-level functions.config keys and presence of env vars (avoid logging secrets)
    try {
      const topKeys = Object.keys(functions.config ? (functions.config() as any) : {});
      console.log('sendBillingEmailHttp: functions.config() top-level keys=', topKeys);
      const cfgKeys = Object.keys(((functions.config() as any).smtp) || {});
      console.log('sendBillingEmailHttp: functions.config().smtp keys=', cfgKeys);
    } catch (e) {
      console.log('sendBillingEmailHttp: functions.config() not available or error reading it', String(e));
    }
    // Also log whether env vars exist (do not print passwords)
    console.log('sendBillingEmailHttp: process.env has SMTP_HOST=', !!process.env.SMTP_HOST, 'SMTP_PORT=', !!process.env.SMTP_PORT, 'SMTP_USER=', !!process.env.SMTP_USER, 'SMTP_PASS=', !!process.env.SMTP_PASS);
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const data = req.body || {};
      const { clientId, to: directTo, title, value, bankAccount, pixKey, invoiceFile, reportFile, emailText, certificateFiles, selectedCertificates, solutionSelect, userId, senderCompany } = data;

      // Allow testing by passing `to` directly in the POST body. If `to` is
      // provided we skip the Firestore lookup. Otherwise `clientId` is required.
      if (!directTo && !clientId) return res.status(400).json({ success: false, message: 'clientId or to is required' });

      let to: string | null = null;
      let client: any = null;
      if (directTo) {
        to = String(directTo);
      } else {
        try {
          const snap = await admin.firestore().doc(`clients/${clientId}`).get();
          if (!snap.exists) return res.status(404).json({ success: false, message: 'Client not found' });
          client = snap.data();
          to = client.email || client.financialContact || null;
        } catch (dbErr: any) {
          console.error('sendBillingEmailHttp error: ', dbErr && (dbErr.stack || dbErr));
          return res.status(500).json({ success: false, message: `Database error: ${dbErr?.message || String(dbErr)}` });
        }
      }

      if (!to) return res.status(412).json({ success: false, message: 'Client has no email to send to' });

      // Prefer module transporter (reads env or functions.config). If missing, return error.
      const { transporter, from: computedFrom } = getTransporter();
      if (!transporter) {
        console.error('sendBillingEmailHttp: transporter not available; host/user/pass missing at runtime');
        return res.status(500).json({ success: false, message: 'SMTP configuration is missing.' });
      }
      const effectiveFrom = computedFrom;

      const attachments: any[] = [];
      if (invoiceFile && typeof invoiceFile === 'string' && invoiceFile.length > 0) {
        if (invoiceFile.startsWith('data:')) {
          const parsed = parseDataUrl(invoiceFile);
          if (parsed) attachments.push({ filename: 'Nota_Fiscal.pdf', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
        } else if (invoiceFile.startsWith('http')) {
          try {
            const buffer = await fetchUrlToBuffer(invoiceFile);
            attachments.push({ filename: 'Nota_Fiscal.pdf', content: buffer });
          } catch (err) { console.error('Error attaching invoice from URL:', err); }
        }
      }
      if (reportFile && typeof reportFile === 'string' && reportFile.length > 0) {
        if (reportFile.startsWith('data:')) {
          const parsed = parseDataUrl(reportFile);
          if (parsed) attachments.push({ filename: 'Relatorio.pdf', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
        } else if (reportFile.startsWith('http')) {
          try {
            const buffer = await fetchUrlToBuffer(reportFile);
            attachments.push({ filename: 'Relatorio.pdf', content: buffer });
          } catch (err) { console.error('Error attaching report from URL:', err); }
        }
      }

      // certificateFiles: optional array of { filename, dataUrl } OR selectedCertificates { name, fileUrl }
      const certs = certificateFiles || selectedCertificates;
      if (Array.isArray(certs)) {
        for (const cf of certs) {
          if (cf) {
            const fname = cf.filename || (cf.name ? `${cf.name}.pdf` : 'documento.pdf');
            // Check for dataUrl or fileUrl being a data URI
            const rawDataUrl = cf.dataUrl || (typeof cf.fileUrl === 'string' && cf.fileUrl.startsWith('data:') ? cf.fileUrl : null);
            const remoteUrl = cf.fileUrl || (typeof cf.path === 'string' && cf.path.startsWith('http') ? cf.path : null);

            if (typeof rawDataUrl === 'string') {
              const parsed = parseDataUrl(rawDataUrl);
              if (parsed) {
                attachments.push({ filename: fname, content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
                console.log(`Attached certificate (Base64): ${fname}`);
              } else {
                console.warn(`Failed to parse Data URI for certificate: ${fname}`);
              }
            } else if (typeof remoteUrl === 'string' && remoteUrl.startsWith('http')) {
              try {
                const buffer = await fetchUrlToBuffer(remoteUrl);
                attachments.push({ filename: fname, content: buffer });
                console.log(`Attached certificate (URL): ${fname}`);
              } catch (fetchErr) {
                console.error(`Failed to fetch certificate ${fname}:`, fetchErr);
              }
            } else if (typeof cf.fileUrl === 'string' && cf.fileUrl.length > 50) {
              attachments.push({ filename: fname, content: Buffer.from(cf.fileUrl, 'base64'), contentType: 'application/pdf' });
              console.log(`Attached certificate (Raw Base64): ${fname}`);
            }
          }
        }
      }

      const html = `
        <p>Olá, Prezados</p>
        <p>À ${client?.razaoSocial || ''}</p>
        <p>Espero que este email os encontre bem. <br/>
        Estamos entrando em contato para enviar os arquivos em relação à fatura referente à ${solutionSelect || client?.solutionSelect || 'serviços contratados'} </p>
        <ul>
          <li><strong>Título:</strong> ${title || '-'} </li>
          <li><strong>Valor:</strong> R$ ${Number(value || 0).toFixed(2)}</li>
          <li><strong>Conta para pagamento:</strong> ${bankAccount || '-'}</li>
          ${pixKey ? `<li><strong>Chave PIX:</strong> ${pixKey}</li>` : ''}
        </ul>
        <p>${emailText || ''}</p>
        <p>Atenciosamente, ${senderCompany || 'Blu Tecnologias'}. <br/>
        
        <br />
        <strong>Enviado utilizando o sistema Blu</strong></p>
        <p> Para dúvidas ou suporte, entre em contato conosco através dos nossos canais oficiais. </p>
        <p> Este é um email automático, por favor, não responda. </p>
      `;

      const mailOptions = { from: effectiveFrom, to, subject: `${title || 'Nova Notificação Financeira'}`, html, attachments } as any;
      console.log('sendBillingEmailHttp: sending mail', { to, from: effectiveFrom, attachments: attachments.length });
      try {
        await transporter.sendMail(mailOptions);
      } catch (sendErr: any) {
        console.error('sendBillingEmailHttp sendMail error:', sendErr && (sendErr.stack || sendErr));
        return res.status(500).json({ success: false, message: `sendMail error: ${sendErr?.message || 'unknown'}` });
      }

      if (reportFile && typeof reportFile === 'string' && clientId) {
        await saveReportToStorageAndDb(clientId, reportFile, `Relatório - ${title || 'Cobrança'}`, userId);
      }
      if (invoiceFile && typeof invoiceFile === 'string' && clientId) {
        await saveInvoiceToStorageAndDb(clientId, invoiceFile, value, userId);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('sendBillingEmailHttp error:', err && (err.stack || err));
      return res.status(500).json({ success: false, message: err?.message || 'Unknown error' });
    }
  });
});

export const handleInboundEmail = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { to, from, subject, text, html } = req.body;
    if (!to) {
      res.status(400).send('Missing "to" field');
      return;
    }

    // Simplify "to" to pure email if it's formatted like "Name <email@domain.com>"
    const match = to.match(/<([^>]+)>/);
    const toEmail = match ? match[1] : to;

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(toEmail);
    } catch (e) {
      console.log(`Email rejected: No user found for ${toEmail}`);
      res.status(200).send('Ignored: recipient not registered');
      return;
    }

    const uid = userRecord.uid;
    await admin.firestore().collection(`users/${uid}/emails`).add({
      to,
      from: from || 'Desconhecido',
      subject: subject || 'Sem assunto',
      body: html || text || '',
      folder: 'inbox',
      read: false,
      timestamp: new Date().toISOString()
    });

    console.log(`Inbound email saved for user ${uid}`);
    res.status(200).send('Success');
  } catch (err: any) {
    console.error('handleInboundEmail error:', err);
    res.status(500).send('Internal Server Error');
  }
});

export const processFirestoreMailQueue = functions.firestore.document('mail_queue/{pushId}').onCreate(async (snapshot, context) => {
  const mailData = snapshot.data();
  const pushId = context.params.pushId;

  // Prevent processing if already processed or missing basic info
  if (!mailData || mailData.delivery || !mailData.to || !mailData.message) {
    console.log(`Skipping mailQueue ${pushId}: invalid or already processed.`);
    return null;
  }

  const { to, message, userId } = mailData;
  const { subject, html, text, attachments } = message;

  // Mark as processing
  await snapshot.ref.update({
    delivery: {
      state: 'PROCESSING',
      startTime: admin.firestore.FieldValue.serverTimestamp()
    }
  });

  try {
    let transporter: nodemailer.Transporter | null = null;
    let computedFrom = 'Eu <contato@blutecnologias.com>';

    // Se o userId foi enviado na fila (como feito pelo EmailComposer do Webmail)
    if (userId) {
      const userSmtpSnap = await admin.firestore().doc(`users/${userId}/settings/smtp`).get();
      const smtpSettings = userSmtpSnap.data();

      if (smtpSettings && smtpSettings.host && smtpSettings.port && smtpSettings.user && smtpSettings.pass) {
        // Criar transporter customizado para este usuário
        transporter = nodemailer.createTransport({
          host: smtpSettings.host,
          port: Number(smtpSettings.port),
          secure: Number(smtpSettings.port) === 465,
          auth: {
            user: smtpSettings.user,
            pass: smtpSettings.pass
          }
        });

        // Buscar o nome de exibição do usuário ou fallback pro email
        const userProfSnap = await admin.firestore().doc(`users/${userId}`).get();
        const userProfile = userProfSnap.data();
        const displName = userProfile?.displayName || smtpSettings.user;
        computedFrom = `${displName} <${smtpSettings.user}>`;
      }
    }

    // Fallback para getTransporter global caso o SMTP do usuário não exista ou não seja do Webmail
    if (!transporter) {
      const globalSmtp = getTransporter();
      transporter = globalSmtp.transporter;
      computedFrom = globalSmtp.from;
    }

    if (!transporter) {
      throw new Error('SMTP configuration missing: cannot dispatch email.');
    }

    const mailOptions: any = {
      from: computedFrom,
      to: Array.isArray(to) ? to.join(',') : to,
      subject: subject || 'Sem assunto',
      html: html || '',
      text: text || ''
    };

    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map((att: any) => {
        // Simple case: attach directly using path as the dataUrl string
        if (typeof att.path === 'string' && att.path.startsWith('data:')) {
          return { path: att.path, filename: att.filename };
        }
        return att;
      });
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Successfully dispatched email ${pushId}: ${info.messageId}`);

    // Mark as success
    await snapshot.ref.update({
      delivery: {
        state: 'SUCCESS',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        info: info.response || 'OK'
      }
    });

    return null;

  } catch (error: any) {
    console.error(`Error sending email ${pushId}:`, error);

    // Mark as error
    await snapshot.ref.update({
      delivery: {
        state: 'ERROR',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message || String(error)
      }
    });

    return null;
  }
});
