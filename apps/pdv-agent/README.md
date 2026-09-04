# Blu PDV Agent

Agente local para integrar o PDV web da Blu com periféricos conectados ao computador do caixa.

Esta primeira versão entrega uma API HTTP local em `127.0.0.1:8787` com:

- `GET /health`
- `GET /devices`
- `POST /print`
- `POST /cash-drawer/open`
- `POST /scale/read`
- `POST /tef/admin`

## Rodar localmente

```bash
npm --prefix apps/pdv-agent start
```

## Gerar pacote de distribuição

```bash
npm --prefix apps/pdv-agent run build
```

O pacote será criado em:

```text
public/downloads/pdv-agent/blu-pdv-agent-0.1.0.zip
```

## Próximas integrações nativas

A API já isola o contrato entre o Blu Web/PWA e a máquina local. As integrações reais com ESC/POS, porta serial, gaveta, balança, TEF e módulos fiscais devem ser implementadas atrás dos endpoints existentes, sem mudar a interface principal do PDV.
