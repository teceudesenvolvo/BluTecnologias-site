# Billing Blu + InfinitePay

Integração incremental do billing da Blu com o Checkout Integrado da InfinitePay.

## Fonte de verdade

A InfinitePay é somente o gateway de pagamento. A Blu mantém a verdade sobre:

- planos;
- assinatura;
- trial;
- vigência;
- cobrança;
- status de acesso;
- limites;
- atraso, tolerância, suspensão e reativação.

## Endpoints oficiais utilizados

- `POST https://api.checkout.infinitepay.io/links`
- `POST https://api.checkout.infinitepay.io/payment_check`

Não foram implementados endpoints de assinatura automática, cartão salvo, reembolso, estorno, tokenização ou boleto porque não fazem parte da documentação confirmada nesta etapa.

## Variáveis

Copie `functions/.env.example` para o ambiente seguro do Firebase/Google Cloud:

- `INFINITEPAY_HANDLE`
- `INFINITEPAY_API_BASE_URL`
- `APP_PUBLIC_URL`
- `APP_FUNCTIONS_PUBLIC_URL`
- `INFINITEPAY_WEBHOOK_URL`
- `INFINITEPAY_REDIRECT_URL`
- `BLU_BILLING_GRACE_DAYS`

Não salve segredos no frontend ou em coleções públicas.

## Coleções

- `billingProviders/{providerId}`
- `plans/{planId}`
- `companies/{companyId}`
- `subscriptions/{subscriptionId}`
- `billingOrders/{orderId}`
- `payments/{paymentId}`
- `billingWebhookEvents/{eventId}`
- `billingAuditLogs/{logId}`
- `subscriptionUsage/{subscriptionId}`

## Fluxo de checkout

1. Frontend chama `POST /api/billing/checkout`.
2. Backend valida Firebase Auth.
3. Backend identifica empresa/tenant.
4. Backend lê plano e preço no Firestore.
5. Backend cria `billingOrders`.
6. Backend chama InfinitePay `/links`.
7. Frontend redireciona para checkout hospedado.
8. Redirect volta para `/admin/assinatura/retorno`.
9. Página de retorno chama `/api/billing/payment-check`.
10. Webhook também grava `billingWebhookEvents`.
11. Trigger processa evento e confirma via `/payment_check`.
12. Pagamento idempotente atualiza `payments`, `subscriptions` e `companies.accessStatus`.

## Trial, tolerância e bloqueio

- Trial padrão: 7 dias.
- Tolerância padrão: 7 dias após vencimento.
- Status em atraso: `GRACE_PERIOD`.
- Após tolerância: `SUSPENDED`.
- Suspensão preserva dados e bloqueia operação no frontend; enforcement definitivo deve ser replicado em Cloud Functions e Rules.

## Próximos passos obrigatórios

- Criar Blu HQ para editar preços e limites.
- Popular `plans/{planId}` com preços reais.
- Adicionar regras backend por operação usando `PlanEntitlementService`.
- Configurar e testar webhook público em produção.
- Criar testes unitários e integração com provider mock.
- Adicionar reprocessamento controlado de webhooks no Blu HQ.
- Implementar régua de e-mail/notificações de trial e atraso.
