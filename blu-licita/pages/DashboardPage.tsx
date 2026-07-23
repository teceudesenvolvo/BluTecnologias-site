import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Clock3,
  FileCheck2,
  Landmark,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardData } from '../types';
import { dashboardService } from '../services/dashboardService';
import { useBluAuth } from '../contexts/BluAuthContext';
import { StatusBadge } from '../components/StatusBadge';

const icons = [WalletCards, FileCheck2, Target, ReceiptText, TrendingUp, TrendingUp, PackageCheck, ShieldCheck];

const tones: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-200',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-400/12 dark:text-amber-200',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-400/12 dark:text-rose-200',
};

const glass =
  'border border-white/65 bg-white/72 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.075] dark:shadow-black/20';

const mutedText = 'text-slate-500 dark:text-slate-300';
const titleText = 'text-slate-950 dark:text-white';

export const DashboardPage: React.FC = () => {
  const { user } = useBluAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService
      .getSummary(user?.companyId || '')
      .then(setData)
      .catch(() => setError(true));
  }, [user?.companyId]);

  if (error) {
    return (
      <div className={`rounded-2xl p-10 text-center ${glass}`}>
        <AlertTriangle className="mx-auto text-rose-500" />
        <h2 className={`mt-3 font-semibold ${titleText}`}>Não foi possível carregar o painel</h2>
      </div>
    );
  }

  if (!data) {
    return <div className="h-96 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-white/10" />;
  }

  const max = Math.max(
    1,
    ...data.cashFlow.flatMap((item) => [item.expected, item.received, item.overdue]).map((value) => Math.abs(Number(value || 0))),
  );
  const bar = (value: number, min = 0) => `${Math.min(100, Math.max(min, (Math.abs(Number(value || 0)) / max) * 100))}%`;

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 text-slate-950 dark:text-white">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">VISÃO EXECUTIVA</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.035em] text-slate-950 dark:text-white">Bem-vindo à Blu</h2>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-300">Sua operação com o governo em um único lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/admin/relatorios')}
            className="rounded-xl border border-white/65 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:text-slate-100"
          >
            Ver relatório executivo
          </button>
          <button
            onClick={() => navigate('/admin/oportunidades')}
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950"
          >
            Explorar oportunidades <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.metrics.map((metric, index) => {
          const Icon = icons[index];
          return (
            <article key={metric.label} className={`group rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-blue-200 md:p-5 ${glass}`}>
              <div className="flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[metric.tone] || tones.blue}`}>
                  <Icon size={18} />
                </span>
                <ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 dark:text-slate-500" />
              </div>
              <p className="mt-5 text-2xl font-bold tracking-tight text-slate-950 md:text-[28px] dark:text-white">{metric.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm dark:text-slate-300">{metric.label}</p>
              <p
                className={`mt-3 text-[11px] font-semibold ${
                  metric.tone === 'rose'
                    ? 'text-rose-600 dark:text-rose-300'
                    : metric.tone === 'amber'
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-emerald-600 dark:text-emerald-300'
                }`}
              >
                {metric.change}
              </p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className={`rounded-2xl p-5 ${glass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">Receita e fluxo de caixa</h3>
              <p className={`mt-1 text-xs ${mutedText}`}>Previsto, recebido e atrasado · últimos 6 meses</p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-200">
              +18% projetado
            </span>
          </div>
          <div className="mt-8 flex h-56 items-end gap-3 overflow-hidden border-b border-slate-100 dark:border-white/10">
            {data.cashFlow.map((item) => (
              <div key={item.month} className="flex h-full flex-1 flex-col justify-end">
                <div className="flex min-h-0 flex-1 items-end justify-center gap-1">
                  <div className="w-[30%] rounded-t bg-blue-100 transition-all dark:bg-blue-300/25" style={{ height: bar(item.expected) }} />
                  <div className="w-[30%] rounded-t bg-blue-600 transition-all dark:bg-blue-400" style={{ height: bar(item.received) }} />
                  <div className="w-[18%] rounded-t bg-rose-300 transition-all dark:bg-rose-300" style={{ height: bar(item.overdue, item.overdue > 0 ? 5 : 0) }} />
                </div>
                <p className="py-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">{item.month}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-5 text-[11px] text-slate-500 dark:text-slate-300">
            <span><b className="text-blue-200 dark:text-blue-300">●</b> Previsto</span>
            <span><b className="text-blue-600 dark:text-blue-400">●</b> Recebido</span>
            <span><b className="text-rose-300">●</b> Em atraso</span>
          </div>
        </section>

        <section className={`overflow-hidden rounded-2xl ${glass}`}>
          <div className="border-b border-slate-100 p-5 dark:border-white/10">
            <h3 className="font-bold text-slate-950 dark:text-white">Contas a receber</h3>
            <p className={`mt-1 text-xs ${mutedText}`}>Recebíveis que exigem acompanhamento</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {data.receivables.map((item) => (
              <div key={item.invoice} className="p-4 hover:bg-white/50 dark:hover:bg-white/8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.agency}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.invoice} · {item.due}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{item.amount}</p>
                    <span className={`text-[10px] font-bold ${item.status === 'Vencido' ? 'text-rose-600 dark:text-rose-300' : item.status === 'Em dia' ? 'text-emerald-600 dark:text-emerald-300' : 'text-blue-600 dark:text-blue-300'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/admin/financeiro')} className="flex w-full items-center justify-center gap-2 border-t border-slate-100 p-3 text-xs font-semibold text-blue-600 dark:border-white/10 dark:text-blue-300">
            Abrir contas a receber <ArrowRight size={14} />
          </button>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SummaryCard icon={FileCheck2} title="Contratos" items={[['Ativos', String(data.contractSummary.active)], ['Vencem este mês', String(data.contractSummary.expiring)], ['Valor contratado', data.contractSummary.total], ['Saldo contratual', data.contractSummary.balance], ['Maior contrato', data.contractSummary.largest]]} />
        <SummaryCard icon={Landmark} title="Comercial" items={[['Taxa de vitória', data.commercial.winRate], ['Pipeline ativo', data.commercial.activePipeline], ['Vendas no ano', data.commercial.annualSales], ['Principal mercado', data.commercial.topState]]} />
        <section className="rounded-2xl border border-white/10 bg-slate-950/95 p-5 text-white shadow-sm backdrop-blur-2xl dark:bg-white/[0.075]">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-blue-300"><BrainCircuit size={18} /></span>
            <div>
              <h3 className="font-bold">Inteligência Blu</h3>
              <p className="text-xs text-slate-400 dark:text-slate-300">Alertas para apoiar sua decisão</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.alerts.map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className={`overflow-hidden rounded-2xl ${glass}`}>
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/10">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">Oportunidades que valem atenção</h3>
              <p className={`mt-1 text-xs ${mutedText}`}>Compatibilidade comercial, não apenas palavras-chave</p>
            </div>
            <button onClick={() => navigate('/admin/oportunidades')} className="text-sm font-semibold text-blue-600 dark:text-blue-300">Ver todas</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {data.opportunities.map((item) => (
              <article key={item.id} className="p-5 hover:bg-white/50 dark:hover:bg-white/8">
                <div className="flex items-start gap-4">
                  <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 sm:grid dark:bg-white/8 dark:text-slate-300"><Target size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">{item.agency}</p>
                      <StatusBadge tone="green">{item.compatibility}% aderente</StatusBadge>
                    </div>
                    <h4 className="mt-2 font-semibold text-slate-950 dark:text-white">{item.object}</h4>
                    <div className={`mt-2 flex flex-wrap gap-4 text-xs ${mutedText}`}>
                      <span>{item.location}</span>
                      <strong className="text-slate-700 dark:text-slate-200">{item.value}</strong>
                      <span>{item.sessionDate}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-500" size={18} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl p-5 ${glass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">Agenda operacional</h3>
              <p className={`mt-1 text-xs ${mutedText}`}>Próximos compromissos</p>
            </div>
            <CalendarClock size={19} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-4 space-y-1">
            {data.deadlines.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-xl p-3 hover:bg-white/50 dark:hover:bg-white/8">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.urgency === 'today' ? 'bg-rose-500' : item.urgency === 'soon' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">{item.type}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                </div>
                <div className="text-right text-xs font-bold text-slate-950 dark:text-white">
                  <p>{item.date}</p>
                  {item.time && <p className="mt-1 flex items-center gap-1 text-[10px] font-normal text-slate-400 dark:text-slate-500"><Clock3 size={10} />{item.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="pb-2 text-center text-xs text-slate-400 dark:text-slate-500">Dados demonstrativos · Distribuidora Nordeste Ltda.</p>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, title, items }: { icon: React.ElementType; title: string; items: [string, string][] }) => (
  <section className={`rounded-2xl p-5 ${glass}`}>
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200"><Icon size={18} /></span>
      <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
    </div>
    <div className="mt-5 divide-y divide-slate-100 dark:divide-white/10">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between py-2.5">
          <span className="text-sm text-slate-500 dark:text-slate-300">{label}</span>
          <strong className="text-sm text-slate-950 dark:text-white">{value}</strong>
        </div>
      ))}
    </div>
  </section>
);
