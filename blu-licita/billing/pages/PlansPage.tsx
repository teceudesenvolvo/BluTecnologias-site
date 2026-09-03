import React from "react";
import { Building2, CalendarDays, CheckCircle2, CreditCard, Loader2, ShieldCheck, ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOptionalBluAuth } from "../../contexts/BluAuthContext";
import { billingClient, getBillingCheckoutProfileStatus, type BillingPlanView, formatCents } from "../services/billingClient";
import { PaymentMethodModal, type BillingPaymentMethod } from "../components/PaymentMethodModal";
import { presentPlanModule } from "../services/planModulePresentation";

const limitLabel = (key: string, value: number | null | undefined) => {
  if (value === null || value === undefined) return "Ilimitado";
  if (key === "storageBytes") return `${Math.round(value / 1024 / 1024 / 1024)} GB`;
  return value.toLocaleString("pt-BR");
};

type BusinessType = 'comercio' | 'servicos';
const planFeatures: Record<string, Record<BusinessType, string[]>> = {
  essential: {
    comercio: ['Vendas e clientes', 'Produtos e estoque', 'Financeiro essencial', 'PDV com 1 caixa'],
    servicos: ['Clientes e serviços', 'Agenda e agendamentos', 'Financeiro essencial', '1 profissional'],
  },
  professional: {
    comercio: ['Tudo do Essencial', 'E-commerce Blu', 'Compras e fornecedores', 'DRE e conciliação', 'Equipe e permissões'],
    servicos: ['Tudo do Essencial', 'Contratação online', 'Pacotes e comissões', 'Recursos e insumos', 'Equipe e permissões'],
  },
  performance: {
    comercio: ['Tudo do Profissional', 'Multiempresa', 'Automações e API', 'Contador integrado', 'Auditoria avançada'],
    servicos: ['Tudo do Profissional', 'Multiempresa', 'Automações e API', 'Contador integrado', 'Auditoria avançada'],
  },
};
const isRecommendedPlan = (plan: BillingPlanView) => plan.recommended ?? plan.slug === 'professional';
const planBadge = (plan: BillingPlanView) => plan.badge || (plan.slug === 'professional' ? 'Mais escolhido' : plan.slug === 'performance' ? 'Operação avançada' : 'Comece aqui');

export const PlansPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [businessType, setBusinessType] = React.useState<BusinessType>(() => searchParams.get('tipo') === 'servicos' ? 'servicos' : 'comercio');
  const [plans, setPlans] = React.useState<BillingPlanView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState("");
  const [error, setError] = React.useState("");
  const [currentPlan, setCurrentPlan] = React.useState<BillingPlanView | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<BillingPlanView | null>(null);
  const authContext = useOptionalBluAuth();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(authContext?.user);
  const visiblePlans = React.useMemo(() => plans.filter((plan) => !plan.businessTypes?.length || plan.businessTypes.includes(businessType)), [plans, businessType]);
  const selectBusinessType = (value: BusinessType) => {
    setBusinessType(value);
    const next = new URLSearchParams(searchParams);
    next.set('tipo', value);
    setSearchParams(next, { replace: true });
  };

  React.useEffect(() => {
    Promise.all([
      billingClient.publicPlans(),
      isLoggedIn ? billingClient.summary().catch(() => null) : Promise.resolve(null),
    ])
      .then(([plansData, summary]) => {
        setPlans(
          (plansData.plans || []).filter(
            (plan) =>
              plan.public !== false &&
              plan.active !== false &&
              plan.slug !== "test-1-real",
          ),
        );
        setCurrentPlan(summary?.plan || null);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const checkout = async (plan: BillingPlanView, paymentMethod: BillingPaymentMethod) => {
    if (!isLoggedIn) {
      navigate(`/admin/onboarding?tipo=${businessType}&indicacao=${encodeURIComponent(searchParams.get('indicacao') || '')}`);
      return;
    }
    const profile = await getBillingCheckoutProfileStatus();
    if (!profile.isReady) {
      navigate("/admin/perfil?tab=company", { replace: true, state: { section: "company", billingProfileMissing: profile.missingFields } });
      alert(`Antes de pagar, complete os dados da empresa em Perfil: ${profile.missingFields.join(", ")}.`);
      return;
    }
    if (plan.slug === "enterprise") {
      alert("Plano Enterprise exige contratação assistida pelo Blu HQ.");
      return;
    }
    setCheckoutLoading(plan.id);
    try {
      navigate(`/admin/assinatura/checkout?planId=${encodeURIComponent(plan.id)}&method=${encodeURIComponent(paymentMethod)}&type=UPGRADE&amountInCents=${encodeURIComponent(String(plan.priceInCents))}&planName=${encodeURIComponent(plan.name)}`, {
        state: {
          planId: plan.id,
          paymentMethod,
          billingOrderType: "UPGRADE",
          planName: plan.name,
          amountInCents: plan.priceInCents,
          source: "plans",
        },
      });
    } catch (reason: any) {
      alert(reason?.message || "Não foi possível abrir o checkout.");
    } finally {
      setCheckoutLoading("");
    }
  };

  const askPaymentMethod = (plan: BillingPlanView) => {
    if (!isLoggedIn) {
      navigate(`/admin/onboarding?plan=${encodeURIComponent(plan.id)}&tipo=${businessType}&indicacao=${encodeURIComponent(searchParams.get('indicacao') || '')}`);
      return;
    }
    if (plan.slug === "enterprise") {
      alert("Plano Enterprise exige contratação assistida pelo Blu HQ.");
      return;
    }
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  if (loading) return <div className="grid min-h-[520px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className={`mx-auto max-w-7xl space-y-6 px-4 pb-16 sm:px-6 ${isLoggedIn ? '' : 'pt-32'}`}>
      <header className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Planos Blu</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Um plano desenhado para o seu tipo de operação</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">As funcionalidades evoluem por plano. Escolha Comércio ou Serviços para ver a jornada, os módulos e os limites adequados à sua empresa.</p>
        <div className="mt-6 grid max-w-xl grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
          <button onClick={()=>selectBusinessType('comercio')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${businessType==='comercio'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><ShoppingCart size={17}/>Comércio</button>
          <button onClick={()=>selectBusinessType('servicos')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${businessType==='servicos'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><CalendarDays size={17}/>Serviços</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">7 dias grátis</span>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">Cartão, débito pinless e boleto via Pagar.me</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Sem cartão salvo na Blu</span>
        </div>
      </header>

      {error && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{error}</p>}
      {currentPlan && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Plano atual</p>
              <h2 className="mt-2 text-xl font-black">{currentPlan.name}</h2>
              <p className="mt-1 text-sm text-blue-900/75">Você pode fazer upgrade, downgrade ou seguir com a forma de pagamento atual na página de assinatura.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#/admin/assinatura" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm">
                <CreditCard size={17} />
                Gerenciar pagamento
              </a>
              <a href="#/admin/assinatura" className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                Ver assinatura
              </a>
            </div>
          </div>
        </section>
      )}
      {!visiblePlans.length && <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-bold">Nenhum plano para {businessType === 'comercio' ? 'comércio' : 'serviços'}</h2><p className="mt-2 text-sm text-slate-500">Configure no BluHQ quais planos atendem este tipo de empresa.</p></section>}

      <section className="grid items-start gap-5 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
          <article key={plan.id} className={`relative flex rounded-[2rem] border bg-white p-6 shadow-sm ${isRecommendedPlan(plan) ? 'border-blue-500 ring-4 ring-blue-100 lg:-translate-y-2' : 'border-slate-200'}`}>
            <span className={`absolute right-5 top-0 -translate-y-1/2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] ${isRecommendedPlan(plan)?'bg-blue-600 text-white':'bg-slate-900 text-white'}`}>{planBadge(plan)}</span>
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">{plan.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{plan.description || "Capacidade configurável para empresas que vendem ao governo."}</p>
                </div>
                <Sparkles className="text-blue-500" />
              </div>
              <p className="mt-7 text-4xl font-black">{formatCents(plan.priceInCents)}<span className="text-sm font-semibold text-slate-400">/{plan.billingInterval === "year" ? "ano" : "mês"}</span></p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">
                {(plan.paymentMethods?.length ? plan.paymentMethods : ["credit_card", "boleto", "debit_card"]).map((method) => (
                  <span key={method} className="rounded-full bg-slate-100 px-2.5 py-1">
                    {method === "credit_card" ? "Cartão de crédito" : method === "boleto" ? "Boleto" : "Débito pinless"}
                  </span>
                ))}
              </div>
              <div className="mt-6 space-y-3 text-sm">
                {(plan.featuresByBusinessType?.[businessType] || planFeatures[plan.slug]?.[businessType] || []).map((feature)=><p key={feature} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-600"/><b>{feature}</b></p>)}
                <div className="my-4 border-t border-slate-100" />
                {[
                  ["companies", "Empresas/CNPJs"],
                  ["users", "Usuários"],
                  ["activeContracts", "Contratos ativos"],
                  ["storageBytes", "Armazenamento"],
                ].map(([key, label]) => <p key={key} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> <b>{limitLabel(key, plan.limits?.[key])}</b> {label}</p>)}
              </div>
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"><Building2 size={15}/>Configuração inicial para empresa de {businessType === 'comercio' ? 'comércio' : 'serviços'}</p>
              <details className="mt-3 rounded-xl border border-slate-200 px-4 py-3 text-sm"><summary className="cursor-pointer font-black text-slate-700">Conheça os módulos incluídos</summary><ul className="mt-4 space-y-4">{(plan.modules || []).map(module => { const item = presentPlanModule(module); return <li key={module} className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600"/><div><p className="font-bold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></div></li>; })}</ul></details>
              <button onClick={() => askPaymentMethod(plan)} disabled={checkoutLoading === plan.id} className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">
                {checkoutLoading === plan.id ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                {plan.slug === 'enterprise' ? 'Falar com Blu' : plan.slug === 'test-1-real' ? 'Gerar pagamento de teste' : isLoggedIn ? 'Fazer upgrade' : 'Começar teste grátis'}
              </button>
              {plan.slug === 'test-1-real' && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  O teste de R$ 1,00 usa o mesmo checkout do Pagar.me para validar a jornada de pagamento dentro da Blu.
                </p>
              )}
            </div>
          </article>
        ))}
      </section>

      <PaymentMethodModal
        open={paymentModalOpen}
        title={`Escolha a forma de pagamento${selectedPlan ? ` · ${selectedPlan.name}` : ''}`}
        description="Antes de abrir o checkout, escolha como deseja pagar. A Blu abrirá o fluxo correto já com o meio selecionado, sem Pix."
        confirmLabel={checkoutLoading ? "Abrindo checkout..." : "Continuar para o checkout"}
        loading={Boolean(checkoutLoading)}
        defaultValue="credit_card"
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={async (paymentMethod) => {
          if (!selectedPlan) return;
          setPaymentModalOpen(false);
          await checkout(selectedPlan, paymentMethod);
        }}
      />
    </div>
  );
};
