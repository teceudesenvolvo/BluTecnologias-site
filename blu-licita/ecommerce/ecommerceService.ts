import {httpsCallable} from 'firebase/functions';
import {functions} from '../../services/firebase';
import type {EcommerceCatalogProduct,EcommercePublicCompany,EcommerceStore,EcommerceStoreCustomer} from './ecommerceTypes';

const ecommerceApiEnabled = import.meta.env.VITE_ECOMMERCE_API_ENABLED !== 'false';
const reservedSlugs = new Set([
  'admin', 'api', 'login', 'entrar', 'cadastro', 'signup', 'checkout',
  'carrinho', 'cart', 'conta', 'account', 'pedidos', 'orders', 'produto',
  'produtos', 'products', 'loja', 'store', 'app', 'dashboard', 'suporte',
  'ajuda', 'help', 'financeiro', 'contador', 'ecommerce', 'marketplace',
  'meta', 'instagram', 'facebook', 'pagarme', 'blu', 'blutecnologias',
]);

const normalizeSlug = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const localSlugCheck = (value: string) => {
  const slug = normalizeSlug(value);
  const reason = !slug
    ? 'Informe o endereço da loja.'
    : slug.length < 3 || slug.length > 60
      ? 'Use entre 3 e 60 caracteres.'
      : reservedSlugs.has(slug)
        ? 'Este endereço é reservado.'
        : '';
  return { valid: !reason, slug, available: !reason, reason };
};
const invoke = <T>(payload:Record<string,unknown>) => {
  if (!ecommerceApiEnabled) return Promise.reject(new Error('A API segura do e-commerce aguarda publicação.'));
  return Promise.race([
    httpsCallable<Record<string,unknown>,T>(functions,'ecommerceStore')(payload).then((value)=>value.data),
    new Promise<T>((_,reject)=>window.setTimeout(()=>reject(new Error('A API do e-commerce não respondeu.')),8000)),
  ]);
};

export const ecommerceService = {
  admin: (companyId:string) => invoke<{store:EcommerceStore|null;products:EcommerceCatalogProduct[];companies:EcommercePublicCompany[]}>({action:'get_admin',companyId}),
  checkSlug: (companyId:string,slug:string) => ecommerceApiEnabled
    ? invoke<{valid:boolean;slug:string;available:boolean;reason:string}>({action:'check_slug',companyId,slug})
    : Promise.resolve(localSlugCheck(slug)),
  saveStore: (companyId:string,store:Partial<EcommerceStore>) => invoke<{storeId:string;storeSlug:string}>({action:'save_store',companyId,store}),
  publishProduct: (companyId:string,productId:string,published:boolean) => invoke({action:'update_product_channel',companyId,productId,published}),
  publicStore: (slug:string) => invoke<{redirectTo?:string;store?:EcommerceStore & {slug:string};products?:EcommerceCatalogProduct[]}>({action:'public_store',slug}),
  quoteDelivery: (slug:string,input:{postalCode:string;state:string;city:string;neighborhood:string;subtotalCents:number}) => invoke<{available:boolean;feeCents:number;estimatedDays:number;method:string;message:string}>({action:'quote_delivery',slug,...input}),
  registerCustomer: (slug:string,customer:EcommerceStoreCustomer) => invoke<{customerId:string}>({action:'register_customer',slug,customer}),
};
