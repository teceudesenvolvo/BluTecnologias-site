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
  businessTypes?: Array<'comercio' | 'servicos'>;
  modules?: string[];
  featuresByBusinessType?: { comercio: string[]; servicos: string[] };
  recommended?: boolean;
  badge?: string;
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
  {
    id: 'essential', name: 'Plano Essencial', slug: 'essential',
    description: 'Para estruturar a rotina essencial de comércio ou serviços.', priceInCents: 14999,
    billingInterval: 'month', intervalCount: 1, trialDays: 7, billingType: 'prepaid', cycles: null, startAt: null,
    paymentMethods: ['credit_card', 'boleto', 'debit_card'], installments: [1], businessTypes: ['comercio', 'servicos'],
    modules: ['dashboard', 'crm', 'clients', 'products', 'services', 'finance', 'documents', 'calendar', 'reports'],
    featuresByBusinessType: { comercio: ['Vendas e clientes', 'Produtos e estoque', 'Financeiro essencial', 'PDV com 1 caixa'], servicos: ['Clientes e serviços', 'Agenda e agendamentos', 'Financeiro essencial', '1 profissional'] },
    recommended: false, badge: 'Comece aqui',
    limits: { companies: 1, activeContracts: 10, storageBytes: 1073741824, users: 1, aiCredits: 0, savedSearches: 500, activeAutomations: 0, customAlerts: 0, apiRequests: 0, certificates: 1, bankAccounts: 1 },
    active: true, public: true, displayOrder: 1,
  },
  {
    id: 'professional', name: 'Plano Profissional', slug: 'professional',
    description: 'Para empresas em crescimento que querem vender em mais canais.', priceInCents: 49700,
    billingInterval: 'month', intervalCount: 1, trialDays: 7, billingType: 'prepaid', cycles: null, startAt: null,
    paymentMethods: ['credit_card', 'boleto', 'debit_card'], installments: [1], businessTypes: ['comercio', 'servicos'],
    modules: ['dashboard', 'opportunities', 'crm', 'team', 'bids', 'clients', 'contracts', 'budgets', 'orders', 'products', 'services', 'ecommerce', 'pos', 'finance', 'documents', 'calendar', 'reports'],
    featuresByBusinessType: { comercio: ['Tudo do Essencial', 'E-commerce Blu', 'Compras e fornecedores', 'DRE e conciliação', 'Equipe e permissões'], servicos: ['Tudo do Essencial', 'Contratação online', 'Pacotes e comissões', 'Recursos e insumos', 'Equipe e permissões'] },
    recommended: true, badge: 'Mais escolhido',
    limits: { companies: 3, activeContracts: 30, storageBytes: 5368709120, users: 5, aiCredits: 0, savedSearches: 2000, activeAutomations: 10, customAlerts: 20, apiRequests: 5000, certificates: 5, bankAccounts: 10 },
    active: true, public: true, displayOrder: 2,
  },
  {
    id: 'performance', name: 'Plano Performance', slug: 'performance',
    description: 'Para operações avançadas, multiempresa e orientadas por dados.', priceInCents: 99700,
    billingInterval: 'month', intervalCount: 1, trialDays: 7, billingType: 'prepaid', cycles: null, startAt: null,
    paymentMethods: ['credit_card', 'boleto', 'debit_card'], installments: [1], businessTypes: ['comercio', 'servicos'],
    modules: ['dashboard', 'opportunities', 'crm', 'team', 'bids', 'clients', 'contracts', 'budgets', 'orders', 'products', 'services', 'ecommerce', 'pos', 'finance', 'documents', 'calendar', 'reports', 'integrations', 'accounting', 'automations', 'api'],
    featuresByBusinessType: { comercio: ['Tudo do Profissional', 'Multiempresa', 'Automações e API', 'Contador integrado', 'Auditoria avançada'], servicos: ['Tudo do Profissional', 'Multiempresa', 'Automações e API', 'Contador integrado', 'Auditoria avançada'] },
    recommended: false, badge: 'Operação avançada',
    limits: { companies: 10, activeContracts: 300, storageBytes: 10737418240, users: 20, aiCredits: 0, savedSearches: null, activeAutomations: null, customAlerts: null, apiRequests: null, certificates: 20, bankAccounts: null },
    active: true, public: true, displayOrder: 3,
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
