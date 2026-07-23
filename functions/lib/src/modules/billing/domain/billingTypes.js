"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingErrors = exports.BillingDomainError = void 0;
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