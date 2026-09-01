export type StoreStatus = 'draft' | 'active' | 'suspended';
export type PaymentStatus = 'pending'|'processing'|'paid'|'failed'|'cancelled'|'refunded'|'partially_refunded'|'chargeback';

export interface EcommerceStore {
  id?: string; companyId: string; storeSlug: string; name: string; description?: string; logoUrl?: string;
  status: StoreStatus; paymentMethods: {pix:boolean;creditCard:boolean;boleto:boolean}; maxInstallments: number;
  recipient?: {provider:'pagarme';recipientId?:string;status:string;onboardingStatus:string};
  meta?: {status:string}; theme?: Record<string,unknown>; shipping?: Record<string,unknown>; seo?: Record<string,unknown>;
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
