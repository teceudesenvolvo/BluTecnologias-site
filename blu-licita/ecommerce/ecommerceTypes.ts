export type StoreStatus = 'draft' | 'active' | 'suspended';
export type PaymentStatus = 'pending'|'processing'|'paid'|'failed'|'cancelled'|'refunded'|'partially_refunded'|'chargeback';

export interface EcommercePublicCompany {
  id:string; legalName:string; tradeName:string; document:string; logoUrl?:string;
  city?:string; state?:string; email?:string; phone?:string;
}

export interface EcommerceAdministrator {
  userId?:string; name:string; email:string; role:'ecommerce_admin'; status:'active'|'pending';
}

export interface EcommerceStore {
  id?: string; companyId: string; publicCompanyId?:string; storeSlug: string; name: string; description?: string; logoUrl?: string; headerMessage?:string;
  publicInfo?: {legalName?:string;tradeName?:string;document?:string;city?:string;state?:string;phone?:string;email?:string};
  status: StoreStatus; paymentMethods: {pix:boolean;creditCard:boolean;boleto:boolean}; maxInstallments: number;
  recipient?: {provider:'pagarme';recipientId?:string;status:string;onboardingStatus:string};
  administrator?:EcommerceAdministrator;
  onboarding?:{completed:boolean;completedAt?:string};
  meta?: {status:string}; theme?: {primaryColor?:string;secondaryColor?:string;headerTextColor?:string}; shipping?: Record<string,unknown>; seo?: Record<string,unknown>;
}

export interface EcommerceCatalogProduct {id:string;name:string;type:string;active:boolean;priceCents:number;stockQuantity:number;images:string[];published:boolean;slug?:string;description?:string;category?:string;availableQuantity?:number;unit?:string}

export interface PaymentProvider {
  readonly name: string;
  createRecipient(input: unknown): Promise<unknown>;
  createOrder(input: unknown): Promise<unknown>;
  refund(chargeId: string, amountCents?: number): Promise<unknown>;
}

export interface MetaCatalogProvider {
  connect(): Promise<void>; disconnect(): Promise<void>; listBusinesses(): Promise<unknown[]>; listCatalogs(): Promise<unknown[]>;
  syncProduct(productId:string): Promise<void>; syncStock(productId:string): Promise<void>; syncPrice(productId:string): Promise<void>; removeProduct(productId:string): Promise<void>;
}
