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
        trialDays: 7,
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