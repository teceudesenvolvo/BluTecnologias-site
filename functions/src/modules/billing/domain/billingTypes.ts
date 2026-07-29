export type BillingCapability =
  | 'checkout_link'
  | 'credit_card'
  | 'debit_card'
  | 'installments'
  | 'webhook'
  | 'payment_check'
  | 'subscription'
  | 'subscription_auto_renewal'
  | 'refund';

export type CheckoutPaymentMethod = 'credit_card' | 'boleto' | 'debit_card';

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
  intervalCount?: number;
  trialDays: number;
  billingType?: 'prepaid' | 'postpaid' | 'exact_day';
  cycles?: number | null;
  startAt?: string | null;
  paymentMethods?: CheckoutPaymentMethod[];
  installments?: number[];
  limits: BillingPlanLimits;
  active: boolean;
  public: boolean;
  displayOrder: number;
};

export const DEFAULT_BILLING_PLANS: BillingPlan[] = [
  {
    id: 'test-1-real',
    name: 'Plano Teste Blu',
    slug: 'test-1-real',
    description: 'Plano de validação para testar a jornada de compra com cobrança simbólica de R$ 1,00.',
    priceInCents: 100,
    billingInterval: 'month',
    intervalCount: 1,
    trialDays: 7,
    billingType: 'prepaid',
    cycles: null,
    startAt: null,
    paymentMethods: ['credit_card', 'boleto', 'debit_card'],
    installments: [1],
    limits: {
      companies: 1,
      activeContracts: 1,
      storageBytes: 1024 * 1024 * 1024,
      users: 1,
      aiCredits: 0,
      savedSearches: 0,
      activeAutomations: 0,
      customAlerts: 0,
      apiRequests: 0,
      certificates: 0,
      bankAccounts: 1,
    },
    active: true,
    public: true,
    displayOrder: 0,
  },
];

export type CreateCheckoutInput = {
  handle: string;
  redirectUrl: string;
  webhookUrl: string;
  orderNsu: string;
  amountInCents: number;
  description: string;
  paymentMethod: CheckoutPaymentMethod;
  cardToken?: string;
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    cpfCnpj?: string;
    address?: {
      street?: string;
      number?: string;
      zipCode?: string;
      province?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  };
};

export type BillingCheckoutPaymentData = {
  orderId: string;
  orderNsu: string;
  paymentMethod: CheckoutPaymentMethod;
  status: string;
  invoiceSlug?: string;
  transactionNsu?: string;
  receiptUrl?: string;
  boleto?: {
    url?: string;
    pdf?: string;
    line?: string;
    barcode?: string;
    dueAt?: string;
  };
  creditCard?: {
    tokenized: boolean;
    installments: number;
  };
  raw?: unknown;
};

export type CreateCheckoutResult = {
  orderId: string;
  orderNsu: string;
  amountInCents: number;
  planName: string;
  paymentMethod: CheckoutPaymentMethod;
  orderStatus?: string;
  requiresCardToken?: boolean;
  paymentData?: BillingCheckoutPaymentData;
  raw: unknown;
};

export type CheckPaymentInput = {
  handle: string;
  orderNsu: string;
  transactionNsu?: string;
  slug?: string;
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
  provider: 'pagarme';
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
