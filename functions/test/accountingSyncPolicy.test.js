/* eslint-disable quotes, max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {companyMatchesSearch, obligationStatusFromPayable} = require("../lib/accountingSyncPolicy");

test("busca empresa por trecho do nome", () => {
  assert.equal(companyMatchesSearch({name: "Supermercado Fortaleza"}, "merc"), true);
});

test("busca CNPJ com ou sem máscara", () => {
  const company = {document: "12.345.678/0001-90"};
  assert.equal(companyMatchesSearch(company, "12345678000190"), true);
  assert.equal(companyMatchesSearch(company, "12.345.678/0001-90"), true);
});

test("pagamento e estorno sincronizam status da obrigação", () => {
  assert.equal(obligationStatusFromPayable("paid"), "paid");
  assert.equal(obligationStatusFromPayable("reversed", "paid"), "awaiting_payment");
  assert.equal(obligationStatusFromPayable("pending", "guide_available"), "guide_available");
});
