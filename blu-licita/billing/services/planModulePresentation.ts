/** Public presentation only: permission keys remain unchanged. */
const modules: Record<string, { title: string; description: string }> = {
  '*': { title: 'Todos os módulos', description: 'Acesso ao conjunto completo de módulos, respeitando os limites do plano.' },
  dashboard: { title: 'Painel de gestão', description: 'Indicadores e resumo das atividades da sua empresa.' },
  clients: { title: 'Clientes', description: 'Cadastro, contatos e informações dos seus clientes.' },
  opportunities: { title: 'Oportunidades de negócio', description: 'Pesquisa e acompanhamento de oportunidades em compras públicas.' },
  crm: { title: 'Gestão comercial', description: 'Organize contatos, negociações e etapas do processo de venda.' },
  ecommerce: { title: 'Loja virtual', description: 'Publique seu catálogo e gerencie pedidos pela internet.' },
  products: { title: 'Produtos e estoque', description: 'Cadastre produtos e acompanhe entradas, saídas e disponibilidade.' },
  services: { title: 'Gestão de serviços', description: 'Organize seu catálogo de serviços e os atendimentos da empresa.' },
  documents: { title: 'Documentos', description: 'Centralize arquivos, certidões e documentos da empresa.' },
  finance: { title: 'Gestão financeira', description: 'Acompanhe receitas, despesas, cobranças e fluxo de caixa.' },
  accounting: { title: 'Contador integrado', description: 'Compartilhe informações contábeis com acesso por empresa e permissões.' },
  pos: { title: 'Frente de caixa (PDV)', description: 'Realize vendas, registre pagamentos e controle o caixa.' },
  team: { title: 'Equipe e permissões', description: 'Cadastre membros e defina o que cada pessoa pode acessar.' },
  bids: { title: 'Licitações', description: 'Organize processos licitatórios e acompanhe sua participação.' },
  contracts: { title: 'Contratos', description: 'Gerencie contratos, valores e prazos de vigência.' },
  budgets: { title: 'Orçamentos e propostas', description: 'Prepare orçamentos e propostas comerciais para seus clientes.' },
  orders: { title: 'Ordens de atendimento', description: 'Organize ordens e acompanhe a execução das atividades.' },
  calendar: { title: 'Calendário', description: 'Visualize compromissos e datas importantes da operação.' },
  reports: { title: 'Relatórios gerenciais', description: 'Consulte informações consolidadas para apoiar suas decisões.' },
  integrations: { title: 'Integrações', description: 'Configure conexões com os serviços externos disponíveis na plataforma.' },
  automations: { title: 'Automações', description: 'Configure as rotinas automáticas disponíveis para sua operação.' },
  api: { title: 'Conexão com outros sistemas (API)', description: 'Integre ferramentas por meio das interfaces disponibilizadas pela Blu.' },
};

export const presentPlanModule = (key: string) => modules[key] || {
  title: 'Recurso adicional',
  description: 'Consulte a equipe Blu para conhecer os detalhes deste recurso.',
};
