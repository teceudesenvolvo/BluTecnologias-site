"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfinitePayBillingProvider = void 0;
const https = require("https");
const billingTypes_1 = require("../domain/billingTypes");
const jsonPost = (url, payload, timeoutMs = 12000) => new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const target = new URL(url);
    const request = https.request({
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        timeout: timeoutMs,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': 'Blu-Billing-InfinitePay/1.0',
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
            if ((response.statusCode || 500) >= 400)
                reject(billingTypes_1.billingErrors.checkoutCreation(`InfinitePay retornou HTTP ${response.statusCode}.`));
            else
                resolve(parsed);
        });
    });
    request.on('timeout', () => {
        request.destroy();
        reject(billingTypes_1.billingErrors.providerUnavailable());
    });
    request.on('error', () => reject(billingTypes_1.billingErrors.providerUnavailable()));
    request.write(body);
    request.end();
});
const stringField = (value) => typeof value === 'string' ? value.trim() : '';
const intField = (value) => Number.isSafeInteger(Number(value)) ? Number(value) : 0;
class InfinitePayBillingProvider {
    apiBaseUrl;
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }
    supports(capability) {
        return ['checkout_link', 'pix', 'credit_card', 'installments', 'webhook', 'payment_check'].includes(capability);
    }
    async createCheckout(input) {
        const payload = {
            handle: input.handle,
            redirect_url: input.redirectUrl,
            webhook_url: input.webhookUrl,
            order_nsu: input.orderNsu,
            items: [{
                    quantity: 1,
                    price: input.amountInCents,
                    description: input.description,
                }],
        };
        if (input.customer) {
            payload.customer = {
                name: input.customer.name || undefined,
                email: input.customer.email || undefined,
                phone_number: input.customer.phoneNumber || undefined,
            };
        }
        const raw = await jsonPost(`${this.apiBaseUrl}/links`, payload);
        const checkoutUrl = stringField(raw.url);
        if (!checkoutUrl)
            throw billingTypes_1.billingErrors.checkoutCreation('A InfinitePay não retornou a URL do checkout.');
        return { checkoutUrl, raw };
    }
    async checkPayment(input) {
        const raw = await jsonPost(`${this.apiBaseUrl}/payment_check`, {
            handle: input.handle,
            order_nsu: input.orderNsu,
            transaction_nsu: input.transactionNsu,
            slug: input.slug,
        });
        const data = raw;
        return {
            success: data.success === true,
            paid: data.paid === true,
            orderNsu: stringField(data.order_nsu) || input.orderNsu,
            amountInCents: intField(data.amount),
            paidAmountInCents: intField(data.paid_amount),
            captureMethod: stringField(data.capture_method),
            installments: intField(data.installments) || 1,
            raw,
        };
    }
    async processWebhook(payload, _headers = {}) {
        const data = (payload || {});
        const orderNsu = stringField(data.order_nsu);
        const invoiceSlug = stringField(data.invoice_slug);
        const transactionNsu = stringField(data.transaction_nsu);
        const amountInCents = intField(data.amount);
        if (!orderNsu || !invoiceSlug || !transactionNsu || amountInCents <= 0) {
            throw new Error('Payload inválido da InfinitePay.');
        }
        return {
            provider: 'infinitepay',
            eventKey: `infinitepay:${transactionNsu || `${orderNsu}:${invoiceSlug}`}`,
            orderNsu,
            invoiceSlug,
            transactionNsu,
            amountInCents,
            paidAmountInCents: intField(data.paid_amount),
            captureMethod: stringField(data.capture_method),
            installments: intField(data.installments) || 1,
            receiptUrl: stringField(data.receipt_url),
            raw: payload,
        };
    }
}
exports.InfinitePayBillingProvider = InfinitePayBillingProvider;
//# sourceMappingURL=InfinitePayBillingProvider.js.map