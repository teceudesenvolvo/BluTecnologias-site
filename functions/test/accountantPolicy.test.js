/* eslint-disable quotes, max-len */
const test = require('node:test');
const assert = require('node:assert/strict');
const {isCompanyActionAllowed} = require('../lib/accountantPolicy');

const accountant = (permissions, status = 'active') => ({role: 'Contador', status, permissions});

test('contador acessa somente ação explicitamente permitida', () => {
  const access = accountant({fiscal: {view: true}});
  assert.equal(isCompanyActionAllowed(access, 'fiscal', 'view'), true);
  assert.equal(isCompanyActionAllowed(access, 'fiscal', 'cancel'), false);
});

test('permissões são independentes entre empresas', () => {
  const companyA = accountant({financial: {view: true}});
  const companyB = accountant({fiscal: {view: true}});
  assert.equal(isCompanyActionAllowed(companyA, 'financial', 'view'), true);
  assert.equal(isCompanyActionAllowed(companyB, 'financial', 'view'), false);
});

test('vínculo suspenso ou revogado não autoriza leitura', () => {
  assert.equal(isCompanyActionAllowed(accountant({fiscal: {view: true}}, 'suspended'), 'fiscal', 'view'), false);
  assert.equal(isCompanyActionAllowed(accountant({fiscal: {view: true}}, 'revoked'), 'fiscal', 'view'), false);
});

test('contador somente leitura não altera registros', () => {
  const access = accountant({accountingDocuments: {view: true, download: true}});
  assert.equal(isCompanyActionAllowed(access, 'accountingDocuments', 'view'), true);
  assert.equal(isCompanyActionAllowed(access, 'accountingDocuments', 'edit'), false);
  assert.equal(isCompanyActionAllowed(access, 'accountingDocuments', 'delete'), false);
});

test('administrador contextual e proprietário mantêm acesso', () => {
  assert.equal(isCompanyActionAllowed({role: 'Administrador', status: 'active'}, 'team', 'manage'), true);
  assert.equal(isCompanyActionAllowed(null, 'team', 'manage', true), true);
});
