# Billing Blu + Pagar.me

Integração incremental do billing da Blu com checkout hospedado pelo Pagar.me.

O Pagar.me é somente o gateway de pagamento. A Blu mantém a verdade sobre:

- cliente
- plano
- assinatura
- período de teste
- vigência
- vencimento
- capacidade contratada
- cobrança
- status de acesso
- upgrade
- downgrade
- cancelamento
- tolerância
- bloqueio
- reativação

## Variáveis de ambiente

- `PAGARME_SECRET_KEY`
- `PAGARME_API_BASE_URL`
- `PAGARME_WEBHOOK_URL`
- `PAGARME_REDIRECT_URL`
- `APP_PUBLIC_URL`
- `APP_FUNCTIONS_PUBLIC_URL`
- `BLU_BILLING_GRACE_DAYS`

## Endpoints internos

- `POST /api/billing/checkout`
- `GET /api/billing/summary`
- `GET /api/billing/plans`
- `POST /api/billing/payment-check`
- `POST /api/webhooks/pagarme`

## Fluxo resumido

1. O usuário escolhe um plano.
2. O backend cria a cobrança interna.
3. O checkout hospedado é gerado pelo Pagar.me.
4. O usuário finaliza o pagamento no gateway.
5. O webhook chega ao Firebase Functions.
6. O backend confirma o pagamento e atualiza assinatura, cobrança e auditoria.

## Observação

Não armazene segredos no frontend. A chave do Pagar.me deve ficar apenas em ambiente seguro do backend/Firebase Functions.
