export type BillingCapability =
  | 'checkout_link'
  | 'pix'
  | 'credit_card'
  | 'installments'
  | 'webhook'
  | 'payment_check'
  | 'subscription_auto_renewal'
  | 'refund';

export type BillingOrderType =
  | 'FIRST_SUBSCRIPTION'
  | 'RENEWAL'
  | 'UPGRADE'
  | 'DOWNGRADE'
  | 'REACTIVATION'
  | 'EXTRA_CAPACITY'
  | 'IMPLEMENTATION'
  | 'MANUAL_CHARGE';

export type BillingOrderStatus =
  | 'CREATED'
  | 'CHECKOUT_CREATED'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELED'
  | 'REFUNDED';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELED'
  | 'EXPIRED';

export type BillingPlanLimits = {
  companies: number | null;
  activeContracts: number | null;
  storageBytes: number | null;
  users: number | null;
  aiCredits?: number | null;
  savedSearches?: number | null;
  activeAutomations?: number | null;
  customAlerts?: number | null;
  apiRequests?: number | null;
  certificates?: number | null;
  bankAccounts?: number | null;
};

export type BillingPlan = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceInCents: number;
  billingInterval: 'month' | 'year' | 'custom';
  trialDays: number;
  limits: BillingPlanLimits;
  active: boolean;
  public: boolean;
  displayOrder: number;
};

export type CreateCheckoutInput = {
  handle: string;
  redirectUrl: string;
  webhookUrl: string;
  orderNsu: string;
  amountInCents: number;
  description: string;
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  raw: unknown;
};

export type CheckPaymentInput = {
  handle: string;
  orderNsu: string;
  transactionNsu: string;
  slug: string;
};

export type PaymentCheckResult = {
  success: boolean;
  paid: boolean;
  orderNsu?: string;
  amountInCents?: number;
  paidAmountInCents?: number;
  captureMethod?: string;
  installments?: number;
  raw: unknown;
};

export type NormalizedWebhookEvent = {
  provider: 'infinitepay';
  eventKey: string;
  orderNsu: string;
  invoiceSlug: string;
  transactionNsu: string;
  amountInCents: number;
  paidAmountInCents: number;
  captureMethod: string;
  installments: number;
  receiptUrl: string;
  raw: unknown;
};

export interface BillingProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  checkPayment(input: CheckPaymentInput): Promise<PaymentCheckResult>;
  processWebhook(payload: unknown, headers: Record<string, string>): Promise<NormalizedWebhookEvent>;
  supports(capability: BillingCapability): boolean;
}

export class BillingDomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export const billingErrors = {
  planNotFound: () => new BillingDomainError('PlanNotFoundError', 'Plano não encontrado.'),
  planInactive: () => new BillingDomainError('PlanInactiveError', 'Este plano não está disponível.'),
  orderNotFound: () => new BillingDomainError('BillingOrderNotFoundError', 'Cobrança não encontrada.'),
  checkoutCreation: (message = 'Não foi possível criar o checkout.') => new BillingDomainError('CheckoutCreationError', message),
  paymentNotConfirmed: () => new BillingDomainError('PaymentNotConfirmedError', 'Pagamento ainda não confirmado.'),
  amountMismatch: () => new BillingDomainError('PaymentAmountMismatchError', 'Valor do pagamento divergente.'),
  duplicateTransaction: () => new BillingDomainError('DuplicateTransactionError', 'Transação já processada.'),
  subscriptionNotFound: () => new BillingDomainError('SubscriptionNotFoundError', 'Assinatura não encontrada.'),
  invalidPlanChange: (message = 'Mudança de plano inválida.') => new BillingDomainError('InvalidPlanChangeError', message),
  providerUnavailable: () => new BillingDomainError('ProviderUnavailableError', 'Gateway indisponível.'),
};
