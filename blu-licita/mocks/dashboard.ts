import type { DashboardData } from '../types';

export const dashboardMock:DashboardData={
  metrics:[
    {label:'Receber este mês',value:'R$ 384 mil',change:'R$ 46,8 mil em atraso',tone:'blue'},
    {label:'Contratos ativos',value:'10',change:'R$ 2,48 mi contratados',tone:'emerald'},
    {label:'Oportunidades compatíveis',value:'20',change:'6 com alta prioridade',tone:'blue'},
    {label:'Cobranças pendentes',value:'7',change:'3 exigem contato hoje',tone:'rose'},
    {label:'Fluxo de caixa projetado',value:'R$ 612 mil',change:'+18% nos próximos 90 dias',tone:'emerald'},
    {label:'Margem média',value:'24,6%',change:'+2,1 p.p. no trimestre',tone:'emerald'},
    {label:'Ordens pendentes',value:'15',change:'4 entregas nesta semana',tone:'amber'},
    {label:'Certidões vencendo',value:'3',change:'Próximos 15 dias',tone:'amber'},
  ],
  deadlines:[
    {id:'1',type:'Cobrança',title:'Hospital Universitário do Ceará · NF-e 00843',date:'Hoje',time:'10:00',urgency:'today'},
    {id:'2',type:'Entrega contratual',title:'Prefeitura de Mossoró · OF 0028',date:'Amanhã',time:'14:30',urgency:'soon'},
    {id:'3',type:'Sessão de disputa',title:'Secretaria de Saúde de Natal',date:'20 Jul',time:'09:00',urgency:'soon'},
    {id:'4',type:'Vencimento de certidão',title:'Certidão Negativa de Débitos Federais',date:'24 Jul',urgency:'normal'},
  ],
  opportunities:[
    {id:'1',agency:'Secretaria de Saúde do Ceará',object:'Aquisição de materiais médico-hospitalares',location:'Fortaleza, CE',value:'R$ 680.000',sessionDate:'22 Jul · 10:00',compatibility:96},
    {id:'2',agency:'Hospital Universitário Onofre Lopes',object:'Fornecimento de equipamentos de proteção individual',location:'Natal, RN',value:'R$ 245.800',sessionDate:'25 Jul · 09:30',compatibility:91},
    {id:'3',agency:'Prefeitura Municipal de João Pessoa',object:'Registro de preços para produtos de limpeza',location:'João Pessoa, PB',value:'R$ 418.500',sessionDate:'29 Jul · 14:00',compatibility:87},
  ],
  cashFlow:[
    {month:'Fev',expected:240,received:218,overdue:22},{month:'Mar',expected:310,received:278,overdue:32},{month:'Abr',expected:285,received:266,overdue:19},{month:'Mai',expected:420,received:365,overdue:55},{month:'Jun',expected:390,received:344,overdue:46},{month:'Jul',expected:512,received:384,overdue:47},
  ],
  receivables:[
    {agency:'Prefeitura de Mossoró',invoice:'NF-e 00843',amount:'R$ 46.800',due:'8 dias em atraso',status:'Vencido'},
    {agency:'Secretaria de Saúde do Ceará',invoice:'NF-e 00871',amount:'R$ 128.400',due:'22 Jul',status:'Em dia'},
    {agency:'Hospital Universitário Onofre Lopes',invoice:'Medição 03',amount:'R$ 84.600',due:'29 Jul',status:'Previsto'},
  ],
  contractSummary:{active:10,expiring:2,total:'R$ 2,48 mi',balance:'R$ 1,14 mi',largest:'R$ 680 mil'},
  commercial:{winRate:'42%',activePipeline:'R$ 3,2 mi',annualSales:'R$ 1,86 mi',topState:'Ceará · 48%'},
  alerts:[
    {title:'Pagamento com risco de atraso',detail:'Prefeitura de Mossoró não confirmou a liquidação da NF-e 00843.',tone:'rose'},
    {title:'Contrato com saldo baixo',detail:'Contrato 041/2025 possui apenas 13% de saldo disponível.',tone:'amber'},
    {title:'Oportunidade recomendada',detail:'Novo pregão de R$ 680 mil com 96% de compatibilidade.',tone:'blue'},
  ],
};
