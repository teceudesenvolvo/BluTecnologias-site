import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  Eye,
  EyeOff,
  FilePlus2,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useFinancialOverview } from '../hooks/useFinancialOverview';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (value: number, hidden: boolean) => (hidden ? 'R$ •••••' : brl.format((value || 0) / 100));
const go = (path: string) => {
  window.location.hash = `#${path}`;
};

const glass =
  'border border-white/65 bg-white/72 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.075] dark:shadow-black/20';

const fieldInputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white/78 px-3 py-2.5 text-sm font-normal normal-case text-slate-900 outline-none transition focus:border-blue-300 dark:border-white/10 dark:bg-white/8 dark:text-white';

export const FinancialExecutiveOverviewPage = () => {
  const { data, filters, setFilters, loading, error, reload } = useFinancialOverview();
  const [hidden, setHidden] = React.useState(false);
  const [detail, setDetail] = React.useState<any>();

  if (loading && !data) {
    return (
      <div className="grid min-h-[560px] place-items-center">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-300" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const charts = data?.charts || {};
  const options = data?.options || {};
  const cards = [
    ['Saldo disponível', metrics.availableCents, 'realizado', WalletCards, '/admin/financeiro/contas-bancarias'],
    ['Saldo consolidado', metrics.consolidatedCents, 'realizado', Landmark, '/admin/financeiro/contas-bancarias'],
    ['Contas a receber', metrics.receivableCents, 'previsto', ArrowUpRight, '/admin/financeiro'],
    ['Contas a pagar', metrics.payableCents, 'previsto', ArrowDownRight, '/admin/financeiro'],
    ['Valores vencidos', metrics.overdueCents, 'pendente', AlertTriangle, '/admin/financeiro'],
    ['Receitas do período', metrics.incomeCents, 'realizado', TrendingUp, '/admin/financeiro/fluxo-de-caixa'],
    ['Despesas do período', metrics.expenseCents, 'realizado', ArrowDownRight, '/admin/financeiro/fluxo-de-caixa'],
    ['Resultado do período', metrics.resultCents, 'realizado', Scale, '/admin/financeiro/dre-gerencial'],
    ['Fluxo projetado', metrics.projectedCashCents, 'previsto', BarChart3, '/admin/financeiro/fluxo-de-caixa'],
    ['Impostos estimados', metrics.estimatedTaxesCents, 'previsto', ShieldCheck, '/admin/financeiro/gestao-tributaria'],
    ['Faturamento', metrics.billingCents, 'realizado', ReceiptText, '/admin/financeiro/notas-fiscais'],
    ['Valor recebido', metrics.receivedCents, 'realizado', Banknote, '/admin/financeiro/cobrancas'],
    ['Margem', metrics.marginCents, 'gerencial', TrendingUp, '/admin/financeiro/dre-gerencial'],
    ['Contratos ativos', metrics.activeContracts, 'quantidade', BriefcaseBusiness, '/admin/contratos'],
    ['Saldo contratual', metrics.contractBalanceCents, 'previsto', BriefcaseBusiness, '/admin/contratos'],
  ];

  return (
    <div className="mx-auto max-w-[1700px] space-y-5 text-slate-950 dark:text-white">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600 dark:text-blue-300">Painel executivo</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Visão financeira</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Realizado e previsto no mesmo período de referência.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setHidden(!hidden)} className="Secondary">
            {hidden ? <Eye size={16} /> : <EyeOff size={16} />} {hidden ? 'Mostrar' : 'Ocultar'} valores
          </button>
          <button onClick={reload} className="Secondary">
            <RefreshCw size={16} />Atualizar
          </button>
        </div>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-400/12 dark:text-rose-200">{error}</p>}

      <section className={`grid gap-3 rounded-2xl p-4 md:grid-cols-3 xl:grid-cols-7 ${glass}`}>
        <Field label="Início"><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></Field>
        <Field label="Fim"><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></Field>
        <Filter label="Projeto" value={filters.projectId} set={(value) => setFilters({ ...filters, projectId: value })} options={options.projects} />
        <Filter label="Contrato" value={filters.contractId} set={(value) => setFilters({ ...filters, contractId: value })} options={options.contracts} />
        <Filter label="Órgão" value={filters.organizationId} set={(value) => setFilters({ ...filters, organizationId: value })} options={options.organizations} />
        <Filter label="Centro de custo" value={filters.costCenterId} set={(value) => setFilters({ ...filters, costCenterId: value })} options={options.costCenters} />
        <Filter label="Conta bancária" value={filters.bankAccountId} set={(value) => setFilters({ ...filters, bankAccountId: value })} options={options.accounts} />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {cards.map(([label, value, mode, Icon, path]: any) => (
          <button key={label} onClick={() => go(path)} className={`rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 ${glass}`}>
            <div className="flex items-start justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-600 dark:bg-white/8 dark:text-slate-200">
                <Icon size={17} />
              </span>
              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                  mode === 'realizado'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-200'
                    : mode === 'pendente'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-400/12 dark:text-amber-200'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-400/12 dark:text-blue-200'
                }`}
              >
                {mode}
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-300">{label}</p>
            <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{mode === 'quantidade' ? value : money(value, hidden)}</p>
            <ChevronRight className="ml-auto mt-2 text-slate-300 dark:text-slate-500" size={15} />
          </button>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-bold text-slate-950 dark:text-white">Atalhos rápidos</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            ['Nova receita', '/admin/financeiro/fluxo-de-caixa', Plus],
            ['Nova despesa', '/admin/financeiro/fluxo-de-caixa', ArrowDownRight],
            ['Nova cobrança', '/admin/financeiro/cobrancas', ReceiptText],
            ['Nova nota fiscal', '/admin/financeiro/notas-fiscais', FilePlus2],
            ['Registrar recebimento', '/admin/financeiro/cobrancas', ArrowUpRight],
            ['Registrar pagamento', '/admin/financeiro', ArrowDownRight],
            ['Importar extrato', '/admin/financeiro/conciliacao', Landmark],
            ['Conciliar', '/admin/financeiro/conciliacao', Scale],
            ['Criar orçamento', '/admin/financeiro/orcamentos', BriefcaseBusiness],
          ].map(([label, path, Icon]: any) => (
            <button key={label} onClick={() => go(path)} className="Secondary shrink-0">
              <Icon size={16} />{label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <MonthlyChart data={charts.monthly || []} hidden={hidden} />
        <DualChart title="Fluxo realizado x previsto" data={(charts.monthly || []).map((item: any) => ({ label: item.month.slice(5), primary: item.resultCents, secondary: item.forecastCents }))} primary="Realizado" secondary="Previsto" hidden={hidden} />
        <HorizontalChart title="Faturamento por órgão" data={charts.billingByOrganization || []} hidden={hidden} open={setDetail} />
        <HorizontalChart title="Faturamento por contrato" data={charts.billingByContract || []} hidden={hidden} open={setDetail} />
        <HorizontalChart title="Despesas por categoria" data={charts.expensesByCategory || []} hidden={hidden} open={setDetail} />
        <HorizontalChart title="Rentabilidade por projeto" data={charts.projectProfitability || []} hidden={hidden} open={setDetail} />
        <DualChart title="Contas a receber e pagar por vencimento" data={mergeDue(charts.receivablesByDue || [], charts.payablesByDue || [])} primary="A receber" secondary="A pagar" hidden={hidden} />
        <BalanceChart data={charts.monthly || []} hidden={hidden} />
      </div>

      <section className={`rounded-2xl p-5 ${glass}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Alertas financeiros</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Pendências que exigem atenção da equipe.</p>
          </div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-400/12 dark:text-rose-200">
            {(data?.alerts || []).reduce((sum: number, item: any) => sum + item.count, 0)} ocorrências
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data?.alerts || []).map((item: any) => (
            <button key={item.id} onClick={() => go(item.route)} className="rounded-xl border border-white/60 bg-white/48 p-4 text-left backdrop-blur-xl hover:bg-blue-50/70 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/10">
              <div className="flex justify-between">
                <span className={`h-2.5 w-2.5 rounded-full ${item.severity === 'danger' ? 'bg-rose-500' : item.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <b className="text-slate-950 dark:text-white">{item.count}</b>
              </div>
              <p className="mt-3 text-sm font-bold text-slate-950 dark:text-white">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{money(item.valueCents, hidden)}</p>
            </button>
          ))}
        </div>
      </section>

      <p className="text-right text-[10px] text-slate-400 dark:text-slate-500">Atualizado em {data?.updatedAt ? new Date(data.updatedAt).toLocaleString('pt-BR') : '—'}</p>

      {detail && <SimpleDetail data={detail} close={() => setDetail(null)} />}
    </div>
  );
};

const MonthlyChart = ({ data, hidden }: { data: any[]; hidden: boolean }) => (
  <DualChart title="Receitas x despesas" data={data.map((item) => ({ label: item.month.slice(5), primary: item.incomeCents, secondary: item.expenseCents }))} primary="Receitas" secondary="Despesas" hidden={hidden} />
);

const DualChart = ({ title, data, primary, secondary, hidden }: { title: string; data: any[]; primary: string; secondary: string; hidden: boolean }) => {
  const max = Math.max(1, ...data.flatMap((item) => [Math.abs(item.primary || 0), Math.abs(item.secondary || 0)]));
  return (
    <Chart title={title}>
      <div className="flex h-48 items-end gap-3">
        {data.map((item, index) => (
          <button key={`${item.label}-${index}`} title={`${primary}: ${money(item.primary, hidden)} · ${secondary}: ${money(item.secondary, hidden)}`} className="flex flex-1 items-end justify-center gap-1">
            <i style={{ height: `${Math.max(4, (Math.abs(item.primary || 0) / max) * 150)}px` }} className="w-2/5 rounded-t bg-blue-500 dark:bg-blue-400" />
            <i style={{ height: `${Math.max(4, (Math.abs(item.secondary || 0) / max) * 150)}px` }} className="w-2/5 rounded-t bg-rose-300" />
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        {data.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}
      </div>
      <Legend a={primary} b={secondary} />
    </Chart>
  );
};

const HorizontalChart = ({ title, data, hidden, open }: { title: string; data: any[]; hidden: boolean; open: (item: any) => void }) => {
  const max = Math.max(1, ...data.map((item) => Math.abs(item.valueCents || 0)));
  return (
    <Chart title={title}>
      <div className="space-y-3">
        {data.slice(0, 6).map((item: any) => (
          <button key={item.id} onClick={() => open({ title, item })} className="w-full text-left">
            <div className="flex justify-between gap-3 text-xs text-slate-700 dark:text-slate-200">
              <b className="truncate">{item.name}</b>
              <span>{money(item.valueCents, hidden)}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-slate-100 dark:bg-white/10">
              <div style={{ width: `${(Math.abs(item.valueCents) / max) * 100}%` }} className="h-full rounded bg-blue-500 dark:bg-blue-400" />
            </div>
          </button>
        ))}
        {!data.length && <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">Sem dados no período.</p>}
      </div>
    </Chart>
  );
};

const BalanceChart = ({ data, hidden }: { data: any[]; hidden: boolean }) => {
  let balance = 0;
  const values = data.map((item) => ({ label: item.month.slice(5), valueCents: (balance += item.resultCents) }));
  return <HorizontalChart title="Evolução do saldo e resultado mensal" data={values.map((item, index) => ({ ...item, id: String(index), name: `Mês ${item.label}` }))} hidden={hidden} open={() => {}} />;
};

const Chart = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className={`rounded-2xl p-5 ${glass}`}>
    <h2 className="mb-5 font-bold text-slate-950 dark:text-white">{title}</h2>
    {children}
  </section>
);

const Legend = ({ a, b }: { a: string; b: string }) => (
  <div className="mt-4 flex gap-5 text-xs text-slate-500 dark:text-slate-300">
    <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />{a}</span>
    <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-300" />{b}</span>
  </div>
);

const mergeDue = (receivables: any[], payables: any[]) => {
  const map = new Map<string, any>();
  receivables.forEach((item) => map.set(item.name, { label: String(item.name).slice(8, 10) || item.name, primary: item.valueCents, secondary: 0 }));
  payables.forEach((item) => {
    const current = map.get(item.name) || { label: String(item.name).slice(8, 10) || item.name, primary: 0, secondary: 0 };
    current.secondary = item.valueCents;
    map.set(item.name, current);
  });
  return [...map.values()].slice(0, 8);
};

const Field = ({ label, children }: { label: string; children: React.ReactElement }) => (
  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">
    {label}
    {React.cloneElement(children, { className: fieldInputClass })}
  </label>
);

const Filter = ({ label, value, set, options = [] }: { label: string; value: string; set: (value: string) => void; options: any[] }) => (
  <Field label={label}>
    <select value={value} onChange={(event) => set(event.target.value)}>
      <option value="">Todos</option>
      {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </Field>
);

const SimpleDetail = ({ data, close }: { data: any; close: () => void }) => (
  <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-white/65 bg-white/88 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90">
      <div className="flex justify-between">
        <h2 className="font-bold text-slate-950 dark:text-white">{data.title}</h2>
        <button onClick={close} className="text-slate-500 dark:text-slate-300">×</button>
      </div>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-300">{data.item.name}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{brl.format(data.item.valueCents / 100)}</p>
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Use o card correspondente para abrir o detalhamento completo do módulo de origem.</p>
    </div>
  </div>
);
