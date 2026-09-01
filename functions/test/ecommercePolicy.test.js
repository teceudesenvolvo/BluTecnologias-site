const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeStoreSlug,
  validateStoreSlug,
  publicProductSlug,
} = require("../lib/ecommercePolicy");

test("normaliza nome de loja com acentos e espaços", () => {
  assert.equal(normalizeStoreSlug(" Bella Moda Ceará "), "bella-moda-ceara");
});

test("recusa slugs reservados e curtos", () => {
  assert.equal(validateStoreSlug("checkout").valid, false);
  assert.equal(validateStoreSlug("ab").valid, false);
});

test("aceita slug público seguro", () => {
  assert.deepEqual(validateStoreSlug("Loja São Pedro"), {
    valid: true,
    slug: "loja-sao-pedro",
    reason: "",
  });
});

test("gera URL estável de produto com id", () => {
  assert.equal(
      publicProductSlug("Vestido Floral", "abcdef123456"),
      "vestido-floral-abcdef12",
  );
});
