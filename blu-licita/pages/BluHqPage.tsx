import React from 'react';
import { ArrowUpRight, Building2, CreditCard, DollarSign, Headphones, Loader2, Megaphone, RefreshCw, Search, Users } from 'lucide-react';
import { hqService, type HqOverview } from '../services/hqService';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const statusTone = (status: string): 'blue' | 'emerald' | 'rose' | 'amber' => {
  if (status === 'Ativo') return 'emerald';
  if (status === 'Teste') return 'blue';
  if (status === 'Atenção') return 'amber';
  if (status === 'Bloqueado') return 'rose';
  return 'blue';
};

export const BluHqPage: React.FC = () => {
  const [data, setData] = React.useState<HqOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await hqService.overview());
      setError('');
    } catch (reason: any) {
      console.error('Erro ao carregar Blu HQ:', reason);
      setData(null);
      setError(reason?.code === 'permission-denied' ? 'Sem permissão para carregar o Blu HQ. Publique as regras atualizadas do Firestore.' : reason?.message || 'Não foi possível carregar os dados do Blu HQ.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const tenants = (data?.tenants || []).filter((item) => `${item.company} ${item.owner} ${item.plan}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-950 p-7 text-white shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-200">Blu HQ</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Gestão comercial da plataforma</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Dados reais de clientes SaaS, prospects, assinaturas, pagamentos e chamados registrados no banco.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
          Atualizar
        </button>
      </header>

      {error && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100">{error}</section>}

      {loading ? (
        <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/8"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Building2 />} label="Clientes SaaS" value={String(data?.metrics.customers || 0)} detail="Empresas com ambiente criado" />
            <Metric icon={<Users />} label="Prospects" value={String(data?.metrics.prospects || 0)} detail="Leads e prospects reais" />
            <Metric icon={<DollarSign />} label="MRR atual" value={formatCurrency(data?.metrics.mrr || 0)} detail="Calculado pelos planos ativos/teste" />
            <Metric icon={<CreditCard />} label="Cobranças críticas" value={String(data?.metrics.criticalCharges || 0)} detail="Pendentes, expiradas ou falhas" tone="rose" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
                <div>
                  <h2 className="text-xl font-black">Clientes da plataforma</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Empresas reais em `companies`, assinaturas em `subscriptions` e planos em `plans`.</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/8">
                  <Search size={16} className="text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} className="bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Buscar cliente..." />
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                {tenants.length ? (
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-white/5"><tr>{['Empresa', 'Responsável', 'Plano', 'Status', 'MRR', 'Saúde'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {tenants.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 font-bold">{item.company}</td>
                          <td className="px-4">{item.owner}</td>
                          <td className="px-4">{item.plan}</td>
                          <td className="px-4"><Badge tone={statusTone(item.status)}>{item.status}</Badge></td>
                          <td className="px-4 font-semibold">{formatCurrency(item.mrr)}</td>
                          <td className="px-4">{item.health}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="Nenhum cliente encontrado" description="Quando empresas reais forem cadastradas, elas aparecerão aqui." />
                )}
              </div>
            </div>

            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
                <h2 className="text-xl font-black">Pipeline de prospects</h2>
                <div className="mt-4 space-y-3">
                  {(data?.prospects || []).slice(0, 8).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="font-black">{item.name}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.source}</p></div>
                        <ArrowUpRight size={16} className="text-blue-600" />
                      </div>
                      <p className="mt-4 text-sm font-semibold">{item.stage}</p>
                      <p className="mt-1 text-xs text-blue-600">{item.value}</p>
                    </article>
                  ))}
                  {!data?.prospects?.length && <EmptyState title="Nenhum prospect real" description="Leads de clientes e prospects aparecerão nesta fila." compact />}
                </div>
              </section>
              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900 shadow-sm dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-100">
                <div className="flex gap-3">
                  <Megaphone className="shrink-0" />
                  <div><h2 className="font-black">Novidades do produto</h2><p className="mt-1 text-sm leading-6">A página “Novidades” segue disponível apenas para o admin da Blu.</p></div>
                </div>
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
                <h2 className="flex items-center gap-2 text-xl font-black"><Headphones className="text-blue-600" size={20} />Atendimento e SAC</h2>
                <div className="mt-4 space-y-3">
                  {(data?.supportQueue || []).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/6">
                      <p className="text-sm font-black">{item.subject}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.company}</p>
                      <p className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-200">{item.status}</p>
                    </article>
                  ))}
                  {!data?.supportQueue?.length && <EmptyState title="Fila de suporte vazia" description="Chamados abertos aparecerão aqui." compact />}
                </div>
              </section>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const Metric = ({ icon, label, value, detail, tone = 'blue' }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: 'blue' | 'rose' }) => (
  <article className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200'}`}>{icon}</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{detail}</p>
  </article>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'emerald' | 'rose' | 'amber' }) => {
  const classes = tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>;
};

const EmptyState = ({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) => (
  <div className={`rounded-2xl border border-dashed border-slate-300 text-center dark:border-white/10 ${compact ? 'p-5' : 'p-10'}`}>
    <p className="font-black">{title}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
  </div>
);
