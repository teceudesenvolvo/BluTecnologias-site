# Blu Tecnologias

Site institucional da Blu Tecnologias e base visual do novo produto **Blu — Da oportunidade ao pagamento**.

## Tecnologias

- React 18, TypeScript e Vite
- React Router (rotas com hash)
- Firebase Authentication, Firestore e Storage
- Tailwind CSS e Lucide Icons

## Executar localmente

```bash
npm install
npm run dev
```

O site institucional continua na rota `/`. O sistema atualizado está disponível em `/#/admin/login`; use **Explorar ambiente de demonstração** para navegar sem uma conta Firebase.

## Estrutura da atualização

```text
blu-licita/
├── components/     # componentes reutilizáveis
├── contexts/       # sessão do produto
├── layouts/        # shell autenticado, sidebar e topbar
├── mocks/          # dados de demonstração
├── pages/          # login, onboarding e dashboard
├── repositories/   # contratos de acesso e implementações Firebase/mock
├── routes/         # rotas centralizadas
├── services/       # casos de uso consumidos pela interface
└── types/          # tipos do domínio
```

O novo layout atualiza o painel administrativo existente em `/admin`. Os módulos que já estavam em produção continuam usando seus serviços Firebase originais, enquanto novos módulos seguem `página → service → repository → Firebase/mock`, facilitando a troca futura por uma API própria.

## Fase 1

Implementado:

- login Firebase e modo de demonstração;
- onboarding em quatro etapas;
- layout SaaS responsivo com sidebar recolhível e menu mobile;
- dashboard executivo com métricas, prazos, oportunidades, fluxo de caixa e alertas;
- rotas preparadas para os módulos seguintes;
- módulos administrativos existentes integrados ao novo layout, mantendo os dados Firebase originais;
- regras Firestore baseadas em `companyId` e associação em `companyUsers`.

As telas de oportunidades, pipeline e demais módulos estão sinalizadas como próximas fases.

## Módulo financeiro — Fase 1

A primeira fase do novo Financeiro da Blu implementa:

- painel executivo com saldos disponível e previsto, recebíveis, pagamentos e alertas;
- contas a receber com visão por órgão e contrato e baixa total ou parcial;
- contas a pagar com fornecedores, categorias, vencimentos e pagamentos;
- extrato de movimentações com classificação e situação de conciliação;
- dados demonstrativos realistas da Distribuidora Nordeste Ltda. quando as coleções estiverem vazias;
- isolamento por empresa e metadados de autoria nos documentos persistidos.

A arquitetura segue obrigatoriamente o fluxo:

```text
Página → Hook → Service → Repository → Firebase Adapter
```

Os arquivos estão organizados em `blu-licita/financial/`, separados em `domain`, `repositories`, `adapters`, `services`, `hooks`, `mocks` e `pages`. O Firestore é acessado somente pelo adapter, permitindo substituir a persistência por uma API própria no futuro.

Coleções preparadas nesta fase:

- `accountsReceivable`;
- `accountsPayable`;
- `financialTransactions`.

Fluxo de caixa, contas bancárias, projetos, centros de custo, conciliação, notas fiscais, retenções, DRE e demais recursos seguem o cronograma de fases descrito no escopo financeiro. A gestão tributária possui finalidade gerencial e não substitui validação contábil.

## Integrações de compras públicas

A tela está em `/#/admin/configuracoes/integracoes`. A camada isolada fica em `blu-licita/integrations/` e contém contratos comuns, normalização, deduplicação conservadora, registro de conectores, tratamento de erros e histórico mockado.

Classificação em 16/07/2026:

- **PNCP:** API pública oficial de consulta; somente leitura pública foi implementada.
- **Compras.gov.br:** dados abertos oficiais, separados em módulos; conector preparado sem chamadas nesta fase.
- **M2A, BLL, BNC, BBMNet e Licitações-e:** parceria/homologação necessária.
- **Portal de Compras Públicas, Licitanet e Licitar Digital:** em pesquisa.
- **Importação manual:** arquitetura visual para CSV, XLSX, JSON, XML e PDF.

Fontes oficiais principais:

- PNCP — manuais: https://www.gov.br/pncp/pt-br/pncp/manuais
- PNCP — Swagger de consulta: https://pncp.gov.br/api/consulta/swagger-ui/index.html
- Compras.gov.br — dados abertos: https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos/portal-de-dados-abertos
- M2A Compras: https://compras.m2atecnologia.com.br

Nenhum token, senha, certificado, cookie ou client secret é armazenado. Configurações sensíveis e sincronizações agendadas permanecem bloqueadas até existir um backend seguro.
