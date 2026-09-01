export const DEFAULT_RESERVED_STORE_SLUGS = new Set([
  'admin','api','login','entrar','cadastro','signup','checkout','carrinho','cart','conta','account',
  'pedidos','orders','produto','produtos','products','loja','store','app','dashboard','suporte','ajuda',
  'help','financeiro','contador','ecommerce','marketplace','meta','instagram','facebook','pagarme','blu',
  'blutecnologias','blog','planos','parceria','contact','privacy',
]);

export const normalizeStoreSlug = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-')
  .slice(0, 48);

export const validateStoreSlug = (value: unknown, extraReserved: string[] = []) => {
  const slug = normalizeStoreSlug(value);
  const reserved = new Set([...DEFAULT_RESERVED_STORE_SLUGS, ...extraReserved.map(normalizeStoreSlug)]);
  if (slug.length < 3) return {valid: false, slug, reason: 'Use pelo menos 3 caracteres.'};
  if (slug.length > 48) return {valid: false, slug, reason: 'Use no máximo 48 caracteres.'};
  if (reserved.has(slug)) return {valid: false, slug, reason: 'Este endereço é reservado pela Blu.'};
  return {valid: true, slug, reason: ''};
};

export const publicProductSlug = (name: unknown, id: string) => {
  const base = normalizeStoreSlug(name) || 'produto';
  return `${base}-${id.slice(0, 8)}`;
};
