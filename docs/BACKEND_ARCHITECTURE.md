# Blu — Especificação do Backend

> Documento de handoff para iniciar o backend próprio da Blu.
>
> Versão: 1.2 — 18/07/2026
>
> Atualização 1.1: consolida os módulos financeiros implementados no frontend e
> nas Cloud Functions: visão executiva, fluxo de caixa, cobranças, notas fiscais,
> tributos, contas bancárias, conciliação, projetos, centros de custo, orçamentos,
> DRE gerencial, configurações e relatórios.
>
> Atualização 1.2: adiciona o inventário das rotas financeiras já criadas,
> fallback temporário de leitura pelo Firestore, checklist de implantação das
> Functions e requisitos operacionais para relatórios e visão executiva.

## 1. Visão do produto

A **Blu** é o ERP comercial e financeiro para empresas que vendem produtos e serviços ao governo.

```text
Oportunidade → Licitação → Contrato → Execução → Faturamento
→ Cobrança → Recebimento → Resultado financeiro
```

O backend deverá atender uma aplicação SaaS multiempresa, com isolamento rigoroso por organização, trilha de auditoria e integrações com fontes de compras públicas.

## 2. Objetivos

- retirar regras de negócio sensíveis do navegador;
- centralizar autenticação, autorização e isolamento multiempresa;
- expor uma API versionada para web, aplicativos e integrações;
- executar importações, análises, notificações e rotinas financeiras em segundo plano;
- manter compatibilidade durante a migração do Firebase;
- permitir evolução independente do frontend;
- não armazenar credenciais de portais no cliente.

## 3. Arquitetura recomendada

Sugestão inicial, sujeita à decisão da equipe:

- **Runtime:** Node.js 22;
- **Linguagem:** TypeScript;
- **Framework HTTP:** NestJS ou Fastify;
- **Banco:** PostgreSQL 16+;
- **ORM:** Prisma ou Drizzle;
- **Fila:** Redis + BullMQ;
- **Arquivos:** armazenamento compatível com S3;
- **Cache:** Redis;
- **Documentação:** OpenAPI 3.1;
- **Observabilidade:** OpenTelemetry, logs JSON e Sentry;
- **Testes:** Vitest/Jest, Supertest e Testcontainers;
- **Deploy:** contêineres Docker em serviço gerenciado.

O PostgreSQL e o backend próprio **não devem ser adicionados ao frontend atual**. Devem existir em um repositório separado.

```text
apps/
├── api/          # API HTTP
└── worker/       # filas e rotinas assíncronas

packages/
├── domain/       # entidades e regras de negócio
├── database/     # schema, migrations e repositories
├── contracts/    # DTOs e contratos compartilhados
├── integrations/ # conectores externos
├── security/     # autenticação, autorização e criptografia
└── observability/
```

## 4. Estratégia de autenticação

Na primeira etapa, manter o Firebase Authentication como provedor de identidade.

1. O frontend envia `Authorization: Bearer <Firebase ID Token>`.
2. A API valida o token com Firebase Admin.
3. A API localiza o usuário interno pelo `firebaseUid`.
4. A organização ativa deve ser informada por `X-Company-Id` ou por claim controlada.
5. A API valida a associação em `company_users` antes de executar a operação.

Nunca confiar em `companyId`, `createdBy`, permissões ou valores financeiros enviados pelo cliente sem validação.

Preparar uma interface `IdentityProvider` para futura substituição do Firebase Auth.

## 5. Multiempresa e autorização

Todas as tabelas de negócio devem possuir `company_id`. Toda consulta deve aplicar esse filtro no repository, nunca apenas no controller.

Papéis iniciais:

| Papel | Escopo |
|---|---|
| `owner` | acesso total à organização |
| `director` | indicadores, aprovações e relatórios |
| `finance` | contas, cobranças, baixas e conciliação |
| `contract_manager` | contratos, ordens e faturamento vinculado |
| `accountant` | tributos, retenções, notas e exportações |
| `analyst` | projetos e contratos atribuídos |
| `viewer` | somente leitura |

Permissões granulares devem usar a forma `recurso:ação`, por exemplo:

```text
financial.receivable:create
financial.receivable:settle
financial.payable:approve
contracts:update
documents:download
taxes:review
```

## 6. Convenções da API

- prefixo: `/api/v1`;
- JSON em `camelCase` na API e `snake_case` no banco;
- IDs: UUID v7;
- datas e horários: ISO 8601 em UTC;
- valores monetários: decimal no banco e string decimal na API;
- paginação por cursor;
- exclusão lógica por `deletedAt`;
- idempotência em operações críticas com `Idempotency-Key`;
- `requestId` em todas as respostas e logs;
- OpenAPI gerada durante o build.

Resposta paginada:

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false
  },
  "requestId": "019..."
}
```

Erro padronizado:

```json
{
  "error": {
    "code": "FINANCIAL_RECEIVABLE_NOT_FOUND",
    "message": "Conta a receber não encontrada.",
    "details": {},
    "requestId": "019..."
  }
}
```

## 7. Metadados obrigatórios

Todas as entidades principais:

```typescript
interface EntityMetadata {
  id: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: string;
  version: number;
}
```

Usar controle otimista por `version` em registros financeiros e contratos.

## 8. Domínios

### 8.1 Identidade e empresas

- `users`
- `companies`
- `company_users`
- `roles`
- `permissions`
- `role_permissions`
- `user_assignments`
- `branches`

### 8.2 Oportunidades e integrações

- `integration_providers`
- `company_integrations`
- `sync_jobs`
- `sync_logs`
- `external_opportunities`
- `opportunity_sources`
- `opportunity_favorites`
- `interest_areas`
- `interest_keywords`

Fontes atuais ou preparadas:

- PNCP;
- Compras.gov.br;
- TCE-CE;
- Licitações-e;
- BLL;
- Licitanet;
- Portal de Compras Públicas;
- M2A;
- BBMNet;
- BNC.

Não inventar endpoints privados. Integrações dependentes de parceria devem permanecer desativadas até homologação.

### 8.3 CRM

- `crm_boards`
- `crm_columns`
- `crm_cards`
- `crm_labels`
- `crm_card_labels`
- `crm_card_assignees`
- `crm_activities`
- `crm_comments`
- `crm_checklists`

O movimento de cartões deve receber `columnId` e `position`, validar pertencimento ao mesmo quadro e gerar auditoria.

### 8.4 Clientes e órgãos

- `organizations`
- `organization_contacts`
- `clients`
- `suppliers`
- `billing_contacts`

Órgãos públicos devem guardar CNPJ, unidade administrativa, esfera, município e UF quando disponíveis.

### 8.5 Licitações, contratos e execução

- `biddings`
- `bidding_items`
- `bidding_documents`
- `proposals`
- `contracts`
- `contract_amendments`
- `contract_items`
- `supply_orders`
- `deliveries`
- `commitments`
- `price_registration_minutes`

### 8.6 Documentos

- `document_folders`
- `documents`
- `document_versions`
- `document_links`
- `document_permissions`
- `document_download_jobs`

Campos mínimos de documento:

```typescript
interface Document {
  id: string;
  companyId: string;
  folderId?: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  checksum: string;
  category?: string;
  companyLegalEntityId?: string;
  issueDate?: string;
  expiryDate?: string;
  currentVersionId: string;
}
```

Requisitos:

- upload por URL pré-assinada;
- limite de tamanho e lista de MIME types;
- checksum SHA-256;
- versionamento;
- varredura antivírus assíncrona;
- ZIP gerado pelo worker para pastas grandes;
- permissão e auditoria de download;
- nunca tornar arquivos empresariais públicos.

Para certidões, a referência deve considerar empresa, tipo e nome normalizado. Notificar somente a versão mais recente.

### 8.7 Financeiro

Coleções atuais e tabelas futuras:

- `financial_accounts`
- `bank_accounts`
- `financial_transactions`
- `accounts_receivable`
- `accounts_payable`
- `receipts`
- `payments`
- `invoices`
- `collection_actions`
- `cash_flow_forecasts`
- `projects`
- `cost_centers`
- `financial_categories`
- `allocations`
- `budgets`
- `budget_entries`
- `tax_profiles`
- `tax_obligations`
- `tax_payments`
- `tax_withholdings`
- `reconciliations`
- `approval_requests`
- `financial_audit_logs`

Entidades adicionadas ou detalhadas na implementação atual:

- `bank_statement_imports`
- `bank_statement_items`
- `reconciliation_links`
- `reconciliation_history`
- `fiscal_documents`
- `collection_events`
- `project_members`
- `cost_center_allocations`
- `budget_versions`
- `budget_items`
- `budget_projections`
- `dre_accounts`
- `dre_period_closures`
- `dre_closure_history`
- `financial_report_configs`
- `financial_report_exports`
- `financial_settings`
- `financial_approval_flows`

Uma baixa nunca deve apagar ou sobrescrever silenciosamente o histórico. Recebimentos, pagamentos, estornos e ajustes são eventos próprios.

### 8.8 Estado atual no Firebase

Enquanto o backend próprio não for iniciado, as regras críticas estão em Cloud Functions e as páginas acessam o Firestore por adapters. As escritas sensíveis são bloqueadas nas regras do cliente.

Rotas financeiras já previstas no frontend:

| Rota | Objetivo |
|---|---|
| `/admin/financeiro` | visão executiva e navegação interna do módulo |
| `/admin/financeiro/visao-geral` | painel financeiro consolidado |
| `/admin/financeiro/fluxo-de-caixa` | entradas, saídas, previsto e realizado |
| `/admin/financeiro/cobrancas` | cobranças, recebimentos e inadimplência |
| `/admin/financeiro/gestao-tributaria` | tributos, retenções, vencimentos e comprovantes |
| `/admin/financeiro/notas-fiscais` | notas emitidas, recebidas, PDFs, XMLs e vínculos |
| `/admin/financeiro/contas-bancarias` | contas, saldos, transferências e ajustes |
| `/admin/financeiro/conciliacao` | importação de extratos e conciliação bancária |
| `/admin/financeiro/projetos` | projetos financeiros e operacionais |
| `/admin/financeiro/centros-de-custo` | árvore, rateios e orçado x realizado |
| `/admin/financeiro/orcamentos` | orçamentos, itens, versões e aprovação |
| `/admin/financeiro/dre-gerencial` | DRE gerencial, análise e fechamento |
| `/admin/financeiro/relatorios` | catálogo, filtros, exportações e histórico |
| `/admin/financeiro/configuracoes` | categorias, DRE, tributos, aprovações e preferências |

| Módulo | Coleções Firestore | Cloud Functions principais |
|---|---|---|
| Visão financeira | fontes financeiras consolidadas | `getFinancialOverview` |
| Fluxo de caixa | `financialTransactions`, `financialSettlements` | funções de lançamentos, baixas, estornos e renegociação |
| Cobranças | `collections`, `collectionEvents` | `mutateCollection`, `receiveCollection` e comandos relacionados |
| Notas fiscais | `fiscalDocuments` | funções de criação, atualização, cancelamento e envio |
| Gestão tributária | `taxRecords` | `mutateTaxRecord`, `commandTaxRecord` |
| Contas bancárias | `bankAccounts`, `bankAccountSecrets`, `bankTransfers` | funções de conta, transferência e ajuste |
| Conciliação | `bankStatementImports`, `bankStatementItems`, `reconciliationLinks`, `reconciliationHistory` | `importBankStatement`, `commandReconciliation` |
| Projetos | `projects`, `projectMembers` | comandos transacionais de projeto |
| Centros de custo | `costCenters`, `financialAllocations` | comandos de centro e rateio |
| Orçamentos | `budgets`, `budgetItems`, `budgetProjections` | `commandBudget` |
| DRE Gerencial | `dreAccounts`, `drePeriodClosures`, `dreClosureHistory` | `commandDrePeriod` |
| Relatórios | `financialReportConfigs`, `financialReportExports` | `queryFinancialReport`, `commandFinancialReport` |
| Configurações | `financialCategories`, `financialConfigurationItems`, `financialApprovalFlows`, `dreAccounts` | `mutateFinancialConfiguration` |

Todas essas funções devem validar o usuário autenticado, descobrir a empresa no servidor e nunca aceitar `companyId` do cliente como autoridade.

Functions que precisam existir no Firebase atual até a migração para o backend próprio:

- `getFinancialOverview`;
- `queryFinancialReport`;
- `commandFinancialReport`;
- `importBankStatement`;
- `commandReconciliation`;
- `commandBudget`;
- `commandDrePeriod`;
- `mutateTaxRecord`;
- `commandTaxRecord`;
- `mutateFinancialConfiguration`;
- funções de contas bancárias, transferências, ajustes e rateios;
- funções de cobranças, eventos, envio, renegociação, cancelamento e recebimento;
- funções de notas fiscais, cancelamento, substituição e vínculos.

Enquanto alguma Function ainda não estiver implantada, o frontend pode usar fallback temporário somente para leitura, consultando Firestore por `companyId` do contexto autenticado. Esse fallback não deve executar baixa, conciliação, fechamento, exportação, aprovação ou qualquer operação crítica.

O fallback deve ser removido quando a API própria ou as Functions equivalentes estiverem estáveis em produção. O backend definitivo não deve depender de regras do cliente para proteger dados.

### 8.9 Dinheiro, datas e rastreabilidade

No Firebase atual, valores novos usam inteiros em centavos (`amountCents`, `netAmountCents`, `balanceAmountCents`). No PostgreSQL futuro, usar `NUMERIC(19,4)` ou inteiro em centavos conforme a entidade. Nunca usar `float`.

Datas diferentes não podem ser misturadas:

- `competenceDate`: competência gerencial;
- `issueDate`: emissão;
- `dueDate`: vencimento;
- `settlementDate`: pagamento ou recebimento;
- `createdAt`: auditoria técnica.

Cada lançamento deve manter `originType` e `originId`. Transferências internas e ajustes de saldo devem usar `dreImpact = false`.

### 8.10 Contas bancárias e conciliação

Dados bancários completos exigem permissão específica e criptografia. A API pública retorna somente valores mascarados.

Importação de extrato:

1. receber OFX ou CSV configurável;
2. calcular SHA-256 do arquivo;
3. impedir duplicidade por empresa, conta e hash;
4. preservar a linha original do extrato;
5. gerar fingerprint por data, valor, descrição e documento;
6. criar sugestões por valor, data, descrição e referências;
7. registrar confiança e campos coincidentes;
8. conciliar em transação de banco;
9. manter histórico para desfazer;
10. exigir justificativa ao ignorar.

A soma dos vínculos deve ser igual ao item bancário, exceto na conciliação parcial. O extrato original é imutável.

### 8.11 Projetos e centros de custo

Projetos consolidam receitas, custos, rateios e margem. Projetos concluídos não aceitam novos lançamentos sem reabertura. Cancelamento exige justificativa.

Centros de custo são hierárquicos. Regras:

- impedir ciclos;
- consolidar filhos nos pais;
- não excluir centros com movimentação;
- rateios devem fechar exatamente 100%;
- alterações estruturais geram auditoria;
- orçamento deve ser comparável ao realizado.

### 8.12 Orçamentos e versões

Tipos suportados: empresarial, comercial, licitação, contrato, projeto e centro de custo.

Os itens armazenam quantidade com precisão controlada e valores em centavos. Uma versão aprovada é imutável. Revisões criam nova versão ligada por `root_budget_id` e `previous_version_id`. Ao aprovar uma revisão, a anterior passa para `replaced`.

Quando configurado, um orçamento aprovado gera uma projeção financeira. Orçamento de licitação deve poder originar proposta comercial em uma fase posterior.

### 8.13 DRE Gerencial

A DRE é gerencial e não substitui escrituração contábil oficial. Estrutura padrão:

```text
Receita Bruta
(-) Deduções
(-) Impostos sobre faturamento
(=) Receita Líquida
(-) Custos diretos
(=) Lucro Bruto
(-) Despesas operacionais
(=) Resultado Operacional
(+/-) Resultado financeiro
(=) Resultado antes dos tributos
(-) Tributos estimados
(=) Resultado Líquido
```

Cada categoria financeira deve apontar para uma conta da DRE. Lançamentos não mapeados ficam fora do resultado e devem aparecer em alerta próprio.

Caixa e competência são consultas separadas. Fechamento gerencial registra usuário e data; reabertura exige justificativa. Alterações em período fechado devem ser rejeitadas por todos os serviços de escrita, não apenas pela tela da DRE.

### 8.14 Visão financeira executiva

O dashboard executivo deve ser calculado no backend em uma consulta agregada por empresa, período e filtros. A resposta deve incluir:

- indicadores realizados e previstos;
- séries mensais;
- contas a receber e pagar por vencimento;
- faturamento por órgão e contrato;
- despesas por categoria;
- rentabilidade por projeto;
- alertas acionáveis;
- data da última atualização.

Filtros compartilhados: empresa ativa, período, projeto, contrato, órgão, centro de custo e conta bancária. Os cards devem apontar para rotas de detalhamento.

Indicadores mínimos:

- saldo disponível;
- saldo consolidado;
- contas a receber;
- contas a pagar;
- valores vencidos;
- receitas do mês ou período;
- despesas do mês ou período;
- resultado do período;
- fluxo projetado;
- impostos estimados;
- faturamento;
- valor recebido;
- margem;
- contratos ativos;
- saldo contratual.

Gráficos mínimos:

- receitas x despesas;
- evolução do saldo;
- fluxo realizado x previsto;
- contas a receber por vencimento;
- contas a pagar por vencimento;
- faturamento por órgão;
- faturamento por contrato;
- despesas por categoria;
- resultado mensal;
- rentabilidade por projeto.

Alertas mínimos:

- cobranças vencidas;
- contas a pagar vencidas;
- saldo insuficiente;
- tributos próximos;
- notas sem cobrança;
- lançamentos não conciliados;
- contratos com valores pendentes;
- projetos acima do orçamento.

Os atalhos rápidos devem apenas redirecionar para os módulos de origem. A criação efetiva deve continuar no serviço transacional do módulo correspondente.

### 8.15 Relatórios financeiros

O catálogo inicial possui 26 relatórios distribuídos em Financeiro, Cobranças, Fiscal, Bancário, Projetos, Contratos, Orçamentos e Gerencial.

Relatórios mínimos:

- fluxo de caixa;
- contas a receber;
- contas a pagar;
- cobranças;
- inadimplência;
- recebimentos;
- pagamentos;
- notas fiscais;
- tributos;
- retenções;
- saldo bancário;
- movimentação bancária;
- conciliação;
- receitas por órgão;
- receitas por contrato;
- despesas por projeto;
- despesas por centro de custo;
- rentabilidade por projeto;
- rentabilidade por contrato;
- margem por licitação;
- orçado x realizado;
- DRE Gerencial;
- valores empenhados;
- valores liquidados;
- valores recebidos;
- valores pendentes.

Requisitos:

- paginação por cursor no backend definitivo;
- filtros salvos e favoritos por usuário/empresa;
- rastreabilidade até o registro original;
- regras de cálculo compartilhadas com os módulos de origem;
- exportações PDF, XLSX e CSV processadas por worker;
- armazenamento privado do resultado;
- URL temporária para download;
- auditoria de exportações sensíveis;
- compartilhamento somente com membros autorizados da mesma empresa;
- expiração e retenção configurável dos arquivos;
- idempotência para evitar exportações duplicadas.

O limite temporário de 2.500 registros usado pelas Cloud Functions atuais não deve ser reproduzido no backend próprio. Grandes relatórios devem usar streaming, cursor e jobs assíncronos.

Exportações devem registrar:

- empresa;
- usuário;
- relatório;
- filtros;
- formato;
- sensibilidade;
- status;
- caminho privado do arquivo;
- data de expiração;
- requestId;
- IP e userAgent quando disponíveis.

PDF, XLSX e CSV devem ser gerados em worker. A API de exportação retorna um job, não o arquivo final. O download deve usar URL temporária e checar permissão no momento da geração e do download.

### 8.16 Requisitos de interface com impacto no backend

Embora o backend não controle layout, alguns comportamentos de UI geram requisitos de API:

- modais e drawers de operações críticas devem bloquear interação com a tela de fundo;
- popups de cobrança, proposta, nota fiscal, conciliação, orçamento e DRE devem carregar dados por ID e empresa;
- abas internas devem buscar dados paginados quando houver volume;
- ações como aprovar, cancelar, receber, pagar, conciliar, fechar período e exportar devem chamar comandos transacionais;
- leituras de detalhe devem retornar rastreabilidade para o registro original;
- estados de loading, vazio, erro e sucesso devem ser suportados por respostas previsíveis da API;
- mensagens de erro devem ser de domínio, não stack traces ou códigos internos do provedor.

## 9. Endpoints iniciais

### Sessão e contexto

```text
GET    /api/v1/me
GET    /api/v1/me/companies
POST   /api/v1/me/active-company
```

### Empresas e usuários

```text
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id
GET    /api/v1/companies/:id/users
POST   /api/v1/companies/:id/invitations
PATCH  /api/v1/companies/:id/users/:userId/role
```

### Oportunidades

```text
GET    /api/v1/opportunities
GET    /api/v1/opportunities/:id
POST   /api/v1/opportunities/:id/favorite
DELETE /api/v1/opportunities/:id/favorite
POST   /api/v1/integrations/:provider/sync
GET    /api/v1/integrations/jobs/:jobId
```

### CRM

```text
GET    /api/v1/crm/boards
POST   /api/v1/crm/boards
POST   /api/v1/crm/boards/:boardId/columns
POST   /api/v1/crm/boards/:boardId/cards
PATCH  /api/v1/crm/cards/:cardId
POST   /api/v1/crm/cards/:cardId/move
DELETE /api/v1/crm/cards/:cardId
```

### Documentos

```text
GET    /api/v1/document-folders
POST   /api/v1/document-folders
PATCH  /api/v1/document-folders/:id
DELETE /api/v1/document-folders/:id
POST   /api/v1/documents/uploads
POST   /api/v1/documents/uploads/:uploadId/complete
GET    /api/v1/documents
PATCH  /api/v1/documents/:id
POST   /api/v1/documents/:id/move
GET    /api/v1/documents/:id/download
POST   /api/v1/document-folders/:id/zip
GET    /api/v1/download-jobs/:jobId
```

### Financeiro

```text
GET    /api/v1/financial/dashboard
GET    /api/v1/financial/receivables
POST   /api/v1/financial/receivables
PATCH  /api/v1/financial/receivables/:id
POST   /api/v1/financial/receivables/:id/receipts
POST   /api/v1/financial/receivables/:id/reverse

GET    /api/v1/financial/payables
POST   /api/v1/financial/payables
PATCH  /api/v1/financial/payables/:id
POST   /api/v1/financial/payables/:id/payments
POST   /api/v1/financial/payables/:id/reverse

GET    /api/v1/financial/transactions
GET    /api/v1/financial/cash-flow
GET    /api/v1/financial/collections
POST   /api/v1/financial/collections
POST   /api/v1/financial/collections/:id/actions
POST   /api/v1/financial/collections/:id/mark-received

GET    /api/v1/financial/taxes
POST   /api/v1/financial/taxes
PATCH  /api/v1/financial/taxes/:id
POST   /api/v1/financial/taxes/:id/payments

GET    /api/v1/financial/bank-accounts
POST   /api/v1/financial/bank-accounts
PATCH  /api/v1/financial/bank-accounts/:id
POST   /api/v1/financial/bank-accounts/:id/inactivate
POST   /api/v1/financial/bank-transfers
POST   /api/v1/financial/bank-accounts/:id/adjustments

POST   /api/v1/financial/bank-statements/imports
GET    /api/v1/financial/bank-statements/imports/:id
GET    /api/v1/financial/reconciliation/items
GET    /api/v1/financial/reconciliation/items/:id/suggestions
POST   /api/v1/financial/reconciliation/items/:id/links
POST   /api/v1/financial/reconciliation/items/:id/ignore
POST   /api/v1/financial/reconciliation/items/:id/undo

GET    /api/v1/financial/projects
POST   /api/v1/financial/projects
PATCH  /api/v1/financial/projects/:id
POST   /api/v1/financial/projects/:id/complete
POST   /api/v1/financial/projects/:id/cancel
POST   /api/v1/financial/projects/:id/reopen

GET    /api/v1/financial/cost-centers
POST   /api/v1/financial/cost-centers
PATCH  /api/v1/financial/cost-centers/:id
POST   /api/v1/financial/cost-centers/:id/inactivate
POST   /api/v1/financial/allocations

GET    /api/v1/financial/budgets
POST   /api/v1/financial/budgets
PATCH  /api/v1/financial/budgets/:id
POST   /api/v1/financial/budgets/:id/versions
POST   /api/v1/financial/budgets/:id/approve
POST   /api/v1/financial/budgets/:id/reject
GET    /api/v1/financial/budgets/:id/compare

GET    /api/v1/financial/dre
GET    /api/v1/financial/dre/unmapped
POST   /api/v1/financial/dre/periods/close
POST   /api/v1/financial/dre/periods/reopen

GET    /api/v1/financial/overview
GET    /api/v1/financial/reports/catalog
POST   /api/v1/financial/reports/query
GET    /api/v1/financial/report-configs
POST   /api/v1/financial/report-configs
PATCH  /api/v1/financial/report-configs/:id
POST   /api/v1/financial/report-exports
GET    /api/v1/financial/report-exports/:id
GET    /api/v1/financial/report-exports/:id/download
```

Todos os endpoints financeiros de escrita devem validar período fechado, permissão granular, versão otimista e `Idempotency-Key` quando houver efeito monetário ou geração de arquivo.

## 10. Contas a receber

Status sugeridos:

```text
forecast, to_invoice, invoiced, issued, submitted, awaiting_acceptance,
accepted, liquidated, scheduled, partially_received, received, overdue,
in_collection, renegotiated, disallowed, cancelled
```

Campos financeiros devem incluir bruto, descontos, retenções, juros, multa, glosa, líquido, recebido e saldo.

## 11. Contas a pagar

Status sugeridos:

```text
forecast, pending, awaiting_approval, approved, scheduled,
partially_paid, paid, overdue, renegotiated, cancelled, disputed
```

Implementar aprovação por limite, recorrência e parcelamento apenas após estabilizar o fluxo básico.

## 12. Cobranças

Cada cobrança deve estar vinculada a uma conta a receber. Ações de cobrança formam uma timeline imutável.

```typescript
interface CollectionAction {
  collectionId: string;
  channel: 'phone' | 'email' | 'whatsapp' | 'letter' | 'portal' | 'in_person' | 'other';
  contactedAt: string;
  message?: string;
  response?: string;
  paymentPromiseDate?: string;
  nextContactAt?: string;
  responsibleUserId: string;
}
```

Não implementar envio real de e-mail, WhatsApp ou ofício sem fila, política de retentativa, templates versionados e consentimento/configuração adequada.

## 13. Gestão tributária

O módulo possui finalidade gerencial e documental. Não calcular, transmitir ou recolher tributos automaticamente sem configuração validada.

Aviso obrigatório:

> As informações tributárias apresentadas pela Blu possuem finalidade gerencial e devem ser revisadas pelo responsável contábil ou tributário da empresa antes de qualquer recolhimento, escrituração ou obrigação acessória.

## 14. Notificações

Tabelas:

- `notifications`
- `notification_preferences`
- `notification_deliveries`

Tipos iniciais:

```text
opportunity.published
certificate.expires_in_7_days
certificate.expired
contract.expires
receivable.overdue
payable.overdue
tax.due
crm.card_due
```

Rotina de certidões:

1. agrupar por referência normalizada;
2. selecionar versão mais recente por emissão e vencimento;
3. ignorar versões substituídas;
4. emitir aviso uma vez quando faltarem 7 dias;
5. emitir aviso uma vez quando vencer;
6. registrar deduplicação por `companyId + certificateId + type`.

Endpoints:

```text
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/read-all
GET    /api/v1/notification-preferences
PATCH  /api/v1/notification-preferences
```

## 15. Jobs e filas

Filas iniciais:

```text
integration-sync
document-processing
folder-zip
notification-scheduler
email-delivery
ai-analysis
data-migration
financial-report-export
bank-statement-import
bank-reconciliation-suggestions
financial-projection-refresh
```

Requisitos:

- retentativa exponencial;
- dead-letter queue;
- idempotência;
- timeout por job;
- progresso consultável;
- logs sem segredos;
- cancelamento quando aplicável.

## 16. IA

A IA ajuda, mas não decide. A análise deve ser assíncrona e versionada.

- armazenar hash e versão do documento analisado;
- registrar modelo, versão do prompt e data;
- separar fatos extraídos de recomendações;
- incluir evidências e páginas do documento;
- exigir confirmação humana para alterações;
- nunca enviar documentos a provedores não autorizados.

## 17. Auditoria

Eventos críticos devem gerar registro somente de inclusão:

```typescript
interface AuditLog {
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  requestId: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}
```

Não registrar senhas, tokens, conteúdo integral de documentos ou dados bancários sensíveis.

## 18. Segurança

- TLS obrigatório;
- CORS restrito;
- rate limit por usuário, empresa e IP;
- validação de DTOs;
- queries parametrizadas;
- secrets em secret manager;
- criptografia em repouso;
- URL de download temporária;
- proteção contra SSRF nos conectores;
- allowlist de hosts oficiais;
- limites de upload e paginação;
- MFA preparado para ações críticas;
- backup e restore testados;
- política LGPD de retenção e exclusão.

## 19. Migração do Firebase

Fontes atuais relevantes:

| Firestore | Destino sugerido |
|---|---|
| `clients` | `clients`, `organizations`, `accounts_receivable`, `collection_actions` |
| `companyDocuments` | `documents`, `document_versions` |
| `documentFolders` | `document_folders` |
| `financialTransactions` | `financial_transactions` |
| `accountsReceivable` | `accounts_receivable` |
| `accountsPayable` | `accounts_payable` |
| `taxObligations` | `tax_obligations` |
| `crmBoards` | `crm_boards` |
| `crmColumns` | `crm_columns` |
| `crmCards` | `crm_cards` |
| `legalEntities` | `companies`, `branches` |
| `financialSettings` | `bank_accounts`, configurações financeiras |
| `bankAccounts` | `bank_accounts` |
| `bankTransfers` | `bank_transfers`, `financial_transactions` |
| `financialSettlements` | `receipts`, `payments` |
| `collections` | `accounts_receivable`, `collection_actions` |
| `collectionEvents` | `collection_actions` |
| `fiscalDocuments` | `invoices`, `tax_withholdings` |
| `taxRecords` | `tax_obligations`, `tax_payments` |
| `costCenters` | `cost_centers` |
| `financialAllocations` | `allocations` |
| `projects` | `projects` |
| `projectMembers` | `project_members` |
| `budgets` | `budgets`, `budget_versions` |
| `budgetItems` | `budget_entries` |
| `budgetProjections` | `cash_flow_forecasts` |
| `bankStatementImports` | `bank_statement_imports` |
| `bankStatementItems` | `bank_statement_items` |
| `reconciliationLinks` | `reconciliation_links` |
| `reconciliationHistory` | `reconciliation_events` |
| `dreAccounts` | `dre_accounts`, `dre_mappings` |
| `drePeriodClosures` | `dre_period_closures` |
| `dreClosureHistory` | `dre_closure_history` |
| `financialReportConfigs` | `financial_report_configs` |
| `financialReportExports` | `financial_report_exports` |
| `tasks` | `tasks` ou atividades CRM |
| `quotes` | solicitações de cotação |
| `externalOpportunities` | `external_opportunities` |

Estratégia:

1. criar inventário e contagem por coleção;
2. exportar snapshot imutável;
3. normalizar IDs e referências;
4. importar em staging;
5. validar contagens, somas financeiras e checksums;
6. executar dual-read no frontend por feature flag;
7. migrar escrita por módulo;
8. monitorar divergências;
9. congelar escrita Firebase do módulo;
10. remover fallback somente após aceite.

Não fazer migração financeira apenas comparando quantidade de registros. Validar totais por empresa, competência, status e tipo.

## 20. Contratos do frontend

O frontend já utiliza a separação:

```text
Página → Hook → Service → Repository → Adapter
```

Para migrar, criar adapters REST que implementem as interfaces existentes e selecionar Firebase ou API por feature flag.

```typescript
interface BackendFeatureFlags {
  financialApi: boolean;
  crmApi: boolean;
  documentsApi: boolean;
  opportunitiesApi: boolean;
}
```

## 21. Ambientes

```text
local
development
staging
production
```

Cada ambiente deve possuir banco, Redis, bucket, chaves e integrações isolados.

Variáveis iniciais:

```env
NODE_ENV=
PORT=
DATABASE_URL=
REDIS_URL=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
PUBLIC_APP_URL=
OTEL_EXPORTER_OTLP_ENDPOINT=
SENTRY_DSN=
```

Nunca versionar valores reais.

## 22. Testes mínimos

- isolamento entre empresas;
- permissão por papel;
- idempotência de baixa financeira;
- recebimento e pagamento parciais;
- estorno;
- concorrência e controle de versão;
- deduplicação de oportunidades;
- versão atual de certidão;
- expiração de URL de arquivo;
- movimento de cartão CRM;
- geração de ZIP;
- retentativa e dead-letter queue;
- migração com validação de totais;
- valores monetários em centavos e arredondamento;
- transferência bancária com dois lançamentos atômicos e sem impacto na DRE;
- deduplicação de OFX/CSV por hash;
- conciliação parcial, múltipla, desfazer e ignorar com justificativa;
- rateio de centro de custo fechando 100%;
- prevenção de ciclo na hierarquia de centros;
- projeto concluído bloqueando novos lançamentos;
- imutabilidade de orçamento aprovado e substituição de versões;
- DRE por caixa e competência sem mistura;
- fechamento e reabertura de período gerencial;
- alerta para categorias sem mapeamento DRE;
- dashboard financeiro usando um único período de referência;
- paginação, autorização e auditoria de relatórios;
- exportação financeira em job idempotente;
- fallback temporário de leitura desativado por feature flag após implantação.

## 23. Ordem de implementação

### Fase 0 — Fundação

- monorepo ou estrutura de apps e packages;
- autenticação Firebase;
- contexto multiempresa;
- PostgreSQL e migrations;
- auditoria, logs, erros e OpenAPI;
- CI e ambientes.

### Fase 1 — Leitura compatível

- usuários e empresas;
- documentos e pastas;
- CRM;
- dashboard e movimentações financeiras em leitura;
- adapters REST no frontend sob feature flag.
- fallback Firestore permitido apenas para leitura e ambiente de transição.

### Fase 2 — Escrita transacional

- contas a receber e pagamentos;
- contas a pagar e recebimentos;
- cobranças;
- auditoria financeira;
- aprovações básicas.

### Fase 3 — Integrações e jobs

- PNCP, Compras.gov.br e TCE-CE;
- notificações;
- ZIP assíncrono;
- processamento de documentos;
- e-mail por fila.

### Fase 4 — Financeiro avançado

- bancos e conciliação;
- projetos e centros de custo;
- orçamento;
- tributos e retenções;
- DRE e relatórios.

Subdivisão recomendada da Fase 4:

1. contas bancárias, transferências e saldos;
2. projetos, centros de custo e rateios;
3. importação de extrato e conciliação;
4. notas fiscais, retenções e gestão tributária;
5. orçamentos, versões e projeções;
6. DRE, fechamento gerencial e mapeamentos;
7. visão executiva agregada;
8. relatórios, exportações e compartilhamento autorizado.

Ao final da Fase 4, desligar o fallback direto do Firestore para visão financeira e relatórios. O frontend deve consumir somente API própria ou Functions homologadas.

## 24. Definition of Done

Uma funcionalidade de backend só está concluída quando possuir:

- regras de domínio testadas;
- autorização e isolamento por empresa;
- migration de banco;
- repository sem bypass de `companyId`;
- DTOs validados;
- OpenAPI atualizada;
- logs e métricas;
- auditoria quando necessária;
- testes de integração;
- tratamento de erro padronizado;
- estratégia de rollback;
- documentação de operação.

## 25. Primeiro milestone sugerido

Entregar uma API executável com:

1. `GET /health` e `GET /ready`;
2. validação do Firebase ID Token;
3. `GET /api/v1/me`;
4. empresa ativa e associação de usuário;
5. migrations iniciais;
6. auditoria e `requestId`;
7. OpenAPI;
8. Docker Compose com PostgreSQL e Redis;
9. testes de isolamento multiempresa;
10. pipeline CI com lint, testes e build.

Depois desse milestone, iniciar os módulos por adapters, evitando uma migração total em uma única entrega.
