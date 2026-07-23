import * as https from 'https';
import {
  billingErrors,
  BillingCapability,
  BillingProvider,
  CheckPaymentInput,
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedWebhookEvent,
  PaymentCheckResult,
} from '../domain/billingTypes';

const jsonPost = (url: string, payload: Record<string, unknown>, timeoutMs = 12000) => new Promise<unknown>((resolve, reject) => {
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
    const chunks: Buffer[] = [];
    response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    response.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let parsed: unknown = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = { raw: text };
      }
      if ((response.statusCode || 500) >= 400) reject(billingErrors.checkoutCreation(`InfinitePay retornou HTTP ${response.statusCode}.`));
      else resolve(parsed);
    });
  });
  request.on('timeout', () => {
    request.destroy();
    reject(billingErrors.providerUnavailable());
  });
  request.on('error', () => reject(billingErrors.providerUnavailable()));
  request.write(body);
  request.end();
});

const stringField = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const intField = (value: unknown) => Number.isSafeInteger(Number(value)) ? Number(value) : 0;

export class InfinitePayBillingProvider implements BillingProvider {
  constructor(private readonly apiBaseUrl: string) {}

  supports(capability: BillingCapability): boolean {
    return ['checkout_link', 'pix', 'credit_card', 'installments', 'webhook', 'payment_check'].includes(capability);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const payload: Record<string, unknown> = {
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
    const checkoutUrl = stringField((raw as {url?: unknown}).url);
    if (!checkoutUrl) throw billingErrors.checkoutCreation('A InfinitePay não retornou a URL do checkout.');
    return { checkoutUrl, raw };
  }

  async checkPayment(input: CheckPaymentInput): Promise<PaymentCheckResult> {
    const raw = await jsonPost(`${this.apiBaseUrl}/payment_check`, {
      handle: input.handle,
      order_nsu: input.orderNsu,
      transaction_nsu: input.transactionNsu,
      slug: input.slug,
    });
    const data = raw as Record<string, unknown>;
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

  async processWebhook(payload: unknown, _headers: Record<string, string> = {}): Promise<NormalizedWebhookEvent> {
    const data = (payload || {}) as Record<string, unknown>;
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
