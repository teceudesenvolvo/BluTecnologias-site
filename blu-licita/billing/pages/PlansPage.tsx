import React from "react";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOptionalBluAuth } from "../../contexts/BluAuthContext";
import { billingClient, type BillingPlanView, formatCents } from "../services/billingClient";

const limitLabel = (key: string, value: number | null | undefined) => {
  if (value === null || value === undefined) return "Ilimitado";
  if (key === "storageBytes") return `${Math.round(value / 1024 / 1024 / 1024)} GB`;
  return value.toLocaleString("pt-BR");
};

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = React.useState<BillingPlanView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState("");
  const [error, setError] = React.useState("");
  const [currentPlan, setCurrentPlan] = React.useState<BillingPlanView | null>(null);
  const authContext = useOptionalBluAuth();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(authContext?.user);

  React.useEffect(() => {
    Promise.all([
      billingClient.publicPlans(),
      isLoggedIn ? billingClient.summary().catch(() => null) : Promise.resolve(null),
    ])
      .then(([plansData, summary]) => {
        setPlans(plansData.plans);
        setCurrentPlan(summary?.plan || null);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const checkout = async (plan: BillingPlanView) => {
    if (!isLoggedIn) {
      navigate("/admin/onboarding");
      return;
    }
    if (plan.slug === "enterprise") {
      alert("Plano Enterprise exige contratação assistida pelo Blu HQ.");
      return;
    }
    setCheckoutLoading(plan.id);
    try {
      const result = await billingClient.createCheckout(plan.id, "UPGRADE");
      window.location.href = result.checkoutUrl;
    } catch (reason: any) {
      alert(reason?.message || "Não foi possível abrir o checkout.");
    } finally {
      setCheckoutLoading("");
    }
  };

  if (loading) return <div className="grid min-h-[520px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Planos Blu</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Escolha a capacidade da sua operação</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Todos os planos acessam as funcionalidades da Blu. O que muda é a capacidade operacional: empresas, usuários, contratos e armazenamento.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">7 dias grátis</span>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">Pix e cartão via Asaas</span>
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
      {!plans.length && <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-bold">Nenhum plano público configurado</h2><p className="mt-2 text-sm text-slate-500">Cadastre os planos e preços no Blu HQ em `plans/{'{planId}'}` para liberar o checkout.</p></section>}

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.id} className="flex rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">{plan.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{plan.description || "Capacidade configurável para empresas que vendem ao governo."}</p>
                </div>
                <Sparkles className="text-blue-500" />
              </div>
              <p className="mt-7 text-4xl font-black">{formatCents(plan.priceInCents)}<span className="text-sm font-semibold text-slate-400">/{plan.billingInterval === "year" ? "ano" : "mês"}</span></p>
              <div className="mt-6 space-y-3 text-sm">
                {[
                  ["companies", "Empresas/CNPJs"],
                  ["users", "Usuários"],
                  ["activeContracts", "Contratos ativos"],
                  ["storageBytes", "Armazenamento"],
                ].map(([key, label]) => <p key={key} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> <b>{limitLabel(key, plan.limits?.[key])}</b> {label}</p>)}
              </div>
              <button onClick={() => checkout(plan)} disabled={checkoutLoading === plan.id} className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">
                {checkoutLoading === plan.id ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                {plan.slug === "enterprise" ? "Falar com Blu" : isLoggedIn ? "Fazer upgrade" : "Começar teste grátis"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
