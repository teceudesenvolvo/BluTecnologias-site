import React from 'react';
import { BadgeCheck, Banknote, Copy, ExternalLink, Loader2, Link as LinkIcon, Megaphone, Sparkles, Users } from 'lucide-react';
import { useBluAuth } from '../contexts/BluAuthContext';
import { partnerService, type PartnerRecord } from '../services/partnerService';
import { subscriptionPlans } from '../services/subscriptionPlanService';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export const PartnerPortalPage: React.FC = () => {
  const { user } = useBluAuth();
  const [loading, setLoading] = React.useState(true);
  const [partner, setPartner] = React.useState<PartnerRecord | null>(null);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const current = await partnerService.current();
      setPartner(current);
      setError('');
    } catch (reason: any) {
      setPartner(null);
      setError(reason?.message || 'Não foi possível carregar o portal do parceiro.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const plan = subscriptionPlans.find((item) => item.slug === (partner?.partnerCode || '').toLowerCase()) || subscriptionPlans[1];
  const monthlyInCents = plan?.priceInCents || 0;
  const gatewayFee = monthlyInCents * ((partner?.gatewayFeePercent ?? 0) / 100);
  const taxes = monthlyInCents * ((partner?.taxPercent ?? 10) / 100);
  const commission = Math.max(0, monthlyInCents - gatewayFee - taxes);
  const referralLink = partner ? partnerService.buildSalesLink(partner.referralCode || partner.partnerCode || partner.companyId || 'PARCEIRO') : '';

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <div className="grid min-h-[70vh] place-items-center rounded-3xl border border-white/65 bg-white/72 p-10 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="rounded-3xl border border-white/65 bg-white/72 p-7 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Portal do parceiro</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Bem-vindo, {partner?.name || user?.name || 'Parceiro Blu'}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">Seu espaço para gerar links de venda, acompanhar comissão e visualizar os dados do seu cadastro.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <Sparkles size={17} /> Atualizar
          </button>
        </div>
      </header>

      {error && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-100">{error}</section>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card icon={<LinkIcon />} label="Código de parceiro" value={partner?.referralCode || partner?.partnerCode || '—'} detail="Usado nos links de vendas" />
        <Card icon={<Banknote />} label="Comissão estimada" value={formatCurrency(commission)} detail="Primeira mensalidade - gateway - impostos" />
        <Card icon={<Users />} label="Conversões" value="0" detail="Leads e clientes vinculados" />
        <Card icon={<BadgeCheck />} label="Status" value={partner?.status || 'Pendente'} detail="Cadastro e conta vinculados" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-white/65 bg-white/72 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
          <h2 className="text-xl font-black">Seu link de vendas</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">Compartilhe este link com seus clientes. A Blu registra a origem internamente para comissionamento, sem expor a linha de revenda ao cliente final.</p>
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">URL de indicação</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900 dark:text-white">{referralLink || '—'}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white dark:bg-blue-500">
              <Copy size={17} /> {copied ? 'Copiado' : 'Copiar link'}
            </button>
            <a href={referralLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              <ExternalLink size={17} /> Abrir link
            </a>
          </div>
        </article>

        <article className="rounded-3xl border border-white/65 bg-white/72 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
          <h2 className="text-xl font-black">Dados financeiros</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">Esses dados serão usados para repasse de comissão e validação do cadastro.</p>
          <div className="mt-5 space-y-3">
            <Info label="Banco" value={partner?.bankName || '—'} />
            <Info label="Agência" value={partner?.agency || '—'} />
            <Info label="Conta" value={partner?.accountNumber || '—'} />
            <Info label="Pix" value={[partner?.pixType, partner?.pixKey].filter(Boolean).join(' · ') || '—'} />
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-white/65 bg-white/72 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
        <h2 className="text-xl font-black">Próximos passos</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <NextStep title="1. Gerar links" description="Seu link já está pronto e pode ser enviado para novos clientes." />
          <NextStep title="2. Capturar origem" description="Cada novo cadastro com seu código será associado ao parceiro internamente." />
          <NextStep title="3. Receber comissão" description="A comissão será acompanhada pelo time financeiro e pelo BluHQ." />
        </div>
      </section>
    </div>
  );
};

const Card = ({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) => (
  <article className="rounded-3xl border border-white/65 bg-white/72 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">{icon}</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black">{value}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{detail}</p>
  </article>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
    <span className="text-slate-500 dark:text-slate-300">{label}</span>
    <strong className="text-right text-slate-900 dark:text-white">{value}</strong>
  </div>
);

const NextStep = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
    <p className="text-sm font-black text-blue-600">{title}</p>
    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
  </div>
);
