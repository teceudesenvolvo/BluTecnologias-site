"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingErrors = exports.BillingDomainError = exports.DEFAULT_BILLING_PLANS = void 0;
exports.DEFAULT_BILLING_PLANS = [
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
class BillingDomainError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.BillingDomainError = BillingDomainError;
exports.billingErrors = {
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
//# sourceMappingURL=billingTypes.js.map