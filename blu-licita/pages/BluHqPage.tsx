import React from 'react';
import { ArrowUpRight, Building2, CreditCard, DollarSign, Headphones, Megaphone, Search, Users } from 'lucide-react';

const tenants = [
  { company: 'Distribuidora Nordeste Ltda.', owner: 'Marina Duarte', plan: 'Profissional', status: 'Teste', mrr: 49700, health: 'Alta' },
  { company: 'Gráfica Prime', owner: 'Rafael Monte', plan: 'Performance', status: 'Ativo', mrr: 99700, health: 'Alta' },
  { company: 'Lavoro Serviços', owner: 'Clara Bezerra', plan: 'Essencial', status: 'Atraso', mrr: 19700, health: 'Atenção' },
];

const prospects = [
  { name: 'Editora Saber', source: 'Landing page', stage: 'Demonstração marcada', value: 'Plano Profissional' },
  { name: 'Omega Alimentação', source: 'Indicação', stage: 'Negociação', value: 'Plano Performance' },
  { name: 'Serviços Atlas', source: 'Conteúdo', stage: 'Novo lead', value: 'Plano Essencial' },
];

const supportQueue = [
  { company: 'Lavoro Serviços', subject: 'Dúvida sobre cobrança vencida', status: 'Aguardando suporte' },
  { company: 'Gráfica Prime', subject: 'Solicitação de treinamento da equipe', status: 'Aberto' },
];

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export const BluHqPage: React.FC = () => {
  const mrr = tenants.reduce((total, item) => total + item.mrr, 0);
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-950 p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-200">Blu HQ</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Gestão comercial da plataforma</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Painel interno para acompanhar clientes da Blu, prospects, receita recorrente, pagamentos, relacionamento e novidades do produto.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Building2 />} label="Clientes SaaS" value={String(tenants.length)} detail="Empresas com ambiente criado" />
        <Metric icon={<Users />} label="Prospects" value={String(prospects.length)} detail="Pipeline comercial da Blu" />
        <Metric icon={<DollarSign />} label="MRR previsto" value={formatCurrency(mrr)} detail="Receita mensal recorrente" />
        <Metric icon={<CreditCard />} label="Cobranças críticas" value="1" detail="Atraso ou ação necessária" tone="rose" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
            <div>
              <h2 className="text-xl font-black">Clientes da plataforma</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Base inicial para CRM, sucesso do cliente, financeiro e suporte.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/8">
              <Search size={16} className="text-slate-400" />
              <input className="bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Buscar cliente..." />
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-white/5"><tr>{['Empresa', 'Responsável', 'Plano', 'Status', 'MRR', 'Saúde'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {tenants.map((item) => (
                  <tr key={item.company}>
                    <td className="px-4 py-4 font-bold">{item.company}</td>
                    <td className="px-4">{item.owner}</td>
                    <td className="px-4">{item.plan}</td>
                    <td className="px-4"><Badge tone={item.status === 'Atraso' ? 'rose' : item.status === 'Teste' ? 'blue' : 'emerald'}>{item.status}</Badge></td>
                    <td className="px-4 font-semibold">{formatCurrency(item.mrr)}</td>
                    <td className="px-4">{item.health}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
            <h2 className="text-xl font-black">Pipeline de prospects</h2>
            <div className="mt-4 space-y-3">
              {prospects.map((item) => (
                <article key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-black">{item.name}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.source}</p></div>
                    <ArrowUpRight size={16} className="text-blue-600" />
                  </div>
                  <p className="mt-4 text-sm font-semibold">{item.stage}</p>
                  <p className="mt-1 text-xs text-blue-600">{item.value}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900 shadow-sm dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-100">
            <div className="flex gap-3">
              <Megaphone className="shrink-0" />
              <div><h2 className="font-black">Novidades do produto</h2><p className="mt-1 text-sm leading-6">A página “Novidades” fica disponível apenas para o admin da Blu e continua dedicada à publicação de conteúdos e atualizações.</p></div>
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
            <h2 className="flex items-center gap-2 text-xl font-black"><Headphones className="text-blue-600" size={20} />Atendimento e SAC</h2>
            <div className="mt-4 space-y-3">
              {supportQueue.map((item) => (
                <article key={`${item.company}-${item.subject}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                  <p className="text-sm font-black">{item.subject}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.company}</p>
                  <p className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-200">{item.status}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

const Metric = ({ icon, label, value, detail, tone = 'blue' }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: 'blue' | 'rose' }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200'}`}>{icon}</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{detail}</p>
  </article>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'emerald' | 'rose' }) => {
  const classes = tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>;
};
