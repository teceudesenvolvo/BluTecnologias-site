# Billing Blu + Asaas

Integração incremental do billing da Blu com checkout hospedado pelo Asaas.

A Asaas é somente o gateway de pagamento. A Blu mantém a verdade sobre:

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

- `ASAAS_API_KEY`
- `ASAAS_API_BASE_URL`
- `ASAAS_WEBHOOK_URL`
- `ASAAS_REDIRECT_URL`
- `APP_PUBLIC_URL`
- `APP_FUNCTIONS_PUBLIC_URL`
- `BLU_BILLING_GRACE_DAYS`

## Endpoints internos

- `POST /api/billing/checkout`
- `GET /api/billing/summary`
- `GET /api/billing/plans`
- `POST /api/billing/payment-check`
- `POST /api/webhooks/asaas`

## Fluxo resumido

1. O usuário escolhe um plano.
2. O backend cria a cobrança interna.
3. O checkout hospedado é gerado pelo Asaas.
4. O usuário finaliza o pagamento no gateway.
5. O webhook chega ao Firebase Functions.
6. O backend confirma o pagamento e atualiza assinatura, cobrança e auditoria.

## Observação

Não armazene segredos no frontend. A chave do Asaas deve ficar apenas em ambiente seguro do backend/Firebase Functions.
