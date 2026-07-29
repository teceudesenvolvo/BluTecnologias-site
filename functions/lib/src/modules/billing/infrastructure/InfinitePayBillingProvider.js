"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfinitePayBillingProvider = exports.PagarmeBillingProvider = void 0;
const https = require("https");
const billingTypes_1 = require("../domain/billingTypes");
const base64Auth = (secretKey = '') => Buffer.from(`${secretKey.trim()}:`).toString('base64');
const jsonRequest = (method, url, payload, options = {}) => new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = payload ? JSON.stringify(payload) : '';
    const request = https.request({
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method,
        timeout: options.timeoutMs ?? 12000,
        headers: {
            Accept: 'application/json',
            ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
            ...(options.secretKey ? { Authorization: `Basic ${base64Auth(options.secretKey)}` } : {}),
            'User-Agent': 'Blu-Billing-Pagarme/2.0',
        },
    }, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            let parsed = {};
            try {
                parsed = text ? JSON.parse(text) : {};
            }
            catch {
                parsed = { raw: text };
            }
            if ((response.statusCode || 500) >= 400) {
                const message = typeof parsed === 'object' && parsed && 'message' in parsed
                    ? String(parsed.message || '')
                    : '';
                const errors = typeof parsed === 'object' && parsed && 'errors' in parsed
                    ? JSON.stringify(parsed.errors || parsed || {})
                    : '';
                const suffix = [message, errors].filter(Boolean).join(' · ');
                const envHint = String(url).includes('sdx-api.pagar.me')
                    ? 'Verifique se a chave é de teste e se o base URL está em sdx-api.pagar.me/core/v5.'
                    : 'Verifique se a chave é de produção e se o base URL está em api.pagar.me/core/v5.';
                reject(billingTypes_1.billingErrors.checkoutCreation(`Pagar.me retornou HTTP ${response.statusCode}${suffix ? `: ${suffix}` : ''}. ${envHint}`.trim()));
                return;
            }
            resolve(parsed);
        });
    });
    request.on('timeout', () => {
        request.destroy();
        reject(billingTypes_1.billingErrors.providerUnavailable());
    });
    request.on('error', () => reject(billingTypes_1.billingErrors.providerUnavailable()));
    if (body)
        request.write(body);
    request.end();
});
const stringField = (value) => typeof value === 'string' ? value.trim() : '';
const intField = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};
const normalizeCustomer = (input) => {
    if (!input.customer)
        return null;
    const document = onlyDigits(input.customer.cpfCnpj);
    const phone = onlyDigits(input.customer.phoneNumber);
    const type = document.length === 11 ? 'individual' : 'company';
    const customerAddress = input.customer.address || {};
    const address = {
        street: stringField(customerAddress.street),
        number: stringField(customerAddress.number),
        neighborhood: stringField(customerAddress.province),
        zip_code: onlyDigits(customerAddress.zipCode),
        city: stringField(customerAddress.city),
        state: stringField(customerAddress.state),
        country: String(customerAddress.country || 'BR').trim() || 'BR',
    };
    return {
        name: stringField(input.customer.name || input.orderNsu),
        email: stringField(input.customer.email),
        document,
        type,
        phones: phone
            ? {
                mobile_phone: {
                    country_code: '55',
                    area_code: phone.slice(0, 2),
                    number: phone.slice(2),
                },
            }
            : undefined,
        address,
    };
};
const buildPayment = (input) => {
    if (input.paymentMethod === 'boleto') {
        return {
            payment_method: 'boleto',
            boleto: {
                due_at: addDays(new Date(), 3).toISOString(),
                instructions: 'Pagamento do plano Blu.',
                type: 'BDP',
            },
            amount: input.amountInCents,
        };
    }
    if (input.paymentMethod === 'debit_card') {
        return {
            payment_method: 'debit_card',
            debit_card: {
                card_token: input.cardToken,
                operation_type: 'auth_and_capture',
                statement_descriptor: 'BLU TEC',
            },
            amount: input.amountInCents,
        };
    }
    return {
        payment_method: 'credit_card',
        credit_card: {
            installments: 1,
            operation_type: 'auth_and_capture',
            card_token: input.cardToken,
            statement_descriptor: 'BLU TEC',
        },
        amount: input.amountInCents,
    };
};
const normalizePaymentData = (raw, input) => {
    const data = (raw || {});
    const orderId = stringField(data.id || data.order?.id);
    const orderNsu = stringField(data.code || data.order?.code || input.orderNsu);
    const payments = Array.isArray(data.payments) ? data.payments : Array.isArray(data.charges) ? data.charges : [];
    const firstPayment = (payments[0] || {});
    const lastTransaction = (firstPayment.last_transaction || firstPayment.transactions?.[0] || firstPayment.transaction || {});
    const status = stringField(data.status || firstPayment.status || lastTransaction.status || 'pending');
    const paymentMethod = String(firstPayment.payment_method || firstPayment.paymentMethod || input.paymentMethod).toLowerCase();
    const paymentData = {
        orderId,
        orderNsu,
        paymentMethod,
        status,
        transactionNsu: stringField(lastTransaction.id || lastTransaction.transaction_id || firstPayment.id || ''),
        receiptUrl: stringField(lastTransaction.url || lastTransaction.receipt_url || firstPayment.url || ''),
        raw,
    };
    if (paymentMethod === 'boleto') {
        paymentData.boleto = {
            url: stringField(lastTransaction.url || firstPayment.url),
            pdf: stringField(lastTransaction.pdf || firstPayment.pdf),
            line: stringField(lastTransaction.line || firstPayment.line),
            barcode: stringField(lastTransaction.barcode || firstPayment.barcode),
            dueAt: stringField(lastTransaction.due_at || firstPayment.due_at),
        };
    }
    if (paymentMethod === 'credit_card') {
        paymentData.creditCard = {
            tokenized: Boolean(input.cardToken),
            installments: intField(firstPayment.installments) || 1,
        };
    }
    return paymentData;
};
class PagarmeBillingProvider {
    apiBaseUrl;
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }
    supports(capability) {
        return ['checkout_link', 'credit_card', 'debit_card', 'installments', 'webhook', 'payment_check', 'subscription_auto_renewal', 'subscription'].includes(capability);
    }
    async createCheckout(input) {
        const payload = {
            code: input.orderNsu,
            closed: true,
            items: [{
                    amount: input.amountInCents,
                    code: input.orderNsu,
                    description: input.description.slice(0, 256),
                    quantity: 1,
                }],
            customer: normalizeCustomer(input),
            payments: [buildPayment(input)],
            metadata: {
                blu_order_nsu: input.orderNsu,
                blu_payment_method: input.paymentMethod,
            },
        };
        if (input.paymentMethod === 'credit_card' && !input.cardToken) {
            return {
                orderId: '',
                orderNsu: input.orderNsu,
                amountInCents: input.amountInCents,
                planName: input.description,
                paymentMethod: input.paymentMethod,
                orderStatus: 'AWAITING_CARD_TOKEN',
                requiresCardToken: true,
                paymentData: {
                    orderId: '',
                    orderNsu: input.orderNsu,
                    paymentMethod: input.paymentMethod,
                    status: 'AWAITING_CARD_TOKEN',
                    creditCard: { tokenized: false, installments: 1 },
                    raw: payload,
                },
                raw: payload,
            };
        }
        const raw = await jsonRequest('POST', `${this.apiBaseUrl}/orders`, payload, { secretKey: input.handle });
        const paymentData = normalizePaymentData(raw, input);
        return {
            orderId: paymentData.orderId,
            orderNsu: paymentData.orderNsu,
            amountInCents: input.amountInCents,
            planName: input.description,
            paymentMethod: paymentData.paymentMethod,
            orderStatus: paymentData.status,
            paymentData,
            raw,
        };
    }
    async checkPayment(input) {
        const raw = await jsonRequest('GET', `${this.apiBaseUrl}/orders?code=${encodeURIComponent(input.orderNsu)}&size=30&page=1`, undefined, { secretKey: input.handle });
        const data = (raw || {});
        const orders = Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : Array.isArray(data.orders) ? data.orders : [];
        const matching = orders.find((order) => {
            const code = stringField(order.code || order.order_code || order.orderCode);
            const status = stringField(order.status).toLowerCase();
            return code === input.orderNsu && ['paid', 'pending', 'failed', 'canceled'].includes(status);
        }) || orders[0] || null;
        const matchedOrder = matching;
        const payments = Array.isArray(matchedOrder?.payments) ? matchedOrder?.payments : Array.isArray(matchedOrder?.charges) ? matchedOrder?.charges : [];
        const firstPayment = payments[0] || {};
        const firstTransaction = firstPayment.last_transaction || firstPayment.transactions?.[0] || firstPayment.transaction || {};
        const status = String(matchedOrder?.status || firstPayment.status || firstTransaction.status || '').toLowerCase();
        const amount = intField(matchedOrder?.amount || firstPayment.amount || firstTransaction.amount);
        const paidAmount = intField(matchedOrder?.paid_amount || firstPayment.paid_amount || firstTransaction.amount || matchedOrder?.amount);
        return {
            success: Boolean(matching),
            paid: status === 'paid',
            orderNsu: stringField(matchedOrder?.code) || input.orderNsu,
            amountInCents: amount || undefined,
            paidAmountInCents: paidAmount || undefined,
            captureMethod: String(firstPayment?.payment_method || firstPayment?.method || firstTransaction?.payment_method || '').trim(),
            installments: intField(firstPayment?.installments) || 1,
            raw,
        };
    }
    async processWebhook(payload, _headers = {}) {
        const data = (payload || {});
        const orderNsu = stringField(data.order_code || data.order_nsu || data.code || data.order?.code || data.payment?.order?.code);
        const invoiceSlug = stringField(data.payment_link_id || data.link_id || data.link?.id || data.link?.short_id || data.payment?.id || '');
        const transactionNsu = stringField(data.transaction_id || data.charge_id || data.id || data.last_transaction?.id || data.last_transaction?.transaction_id || data.payment?.last_transaction?.id || '');
        const amountInCents = intField(data.amount || data.order?.amount || data.charge?.amount || data.payment?.amount);
        const paidAmountInCents = intField(data.paid_amount || data.charge?.paid_amount || data.last_transaction?.amount || data.payment?.paid_amount);
        const captureMethod = stringField(data.payment_method || data.charge?.payment_method || data.last_transaction?.payment_method || data.payment?.payment_method);
        const installments = intField(data.installments || data.charge?.installments || data.payment?.installments) || 1;
        const receiptUrl = stringField(data.receipt_url || data.charge?.receipt_url || data.last_transaction?.receipt_url || data.payment?.last_transaction?.url);
        if (!orderNsu || amountInCents <= 0) {
            throw new Error('Payload inválido do Pagar.me.');
        }
        return {
            provider: 'pagarme',
            eventKey: `pagarme:${transactionNsu || `${orderNsu}:${invoiceSlug || amountInCents}`}`,
            orderNsu,
            invoiceSlug,
            transactionNsu,
            amountInCents,
            paidAmountInCents,
            captureMethod,
            installments,
            receiptUrl,
            raw: payload,
        };
    }
}
exports.PagarmeBillingProvider = PagarmeBillingProvider;
exports.InfinitePayBillingProvider = PagarmeBillingProvider;
//# sourceMappingURL=InfinitePayBillingProvider.js.map