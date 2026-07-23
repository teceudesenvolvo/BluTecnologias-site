import React from "react";
import { CheckCircle2, Save, ShieldAlert } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { subscriptionPlanService, subscriptionPlans, type CompanySubscription, type PlanKey, type PlanLimits } from "../services/subscriptionPlanService";

const labels: Record<keyof PlanLimits, string> = {
  companies: "Empresas / CNPJs",
  activeContracts: "Contratos ativos",
  users: "Usuários",
  storageGb: "Armazenamento",
  favoriteOpportunities: "Oportunidades favoritas",
  documents: "Documentos cadastrados",
  historyEvents: "Eventos no histórico",
  digitalCertificates: "Certificados digitais",
  bankAccounts: "Contas bancárias",
  documentTemplates: "Modelos personalizados",
  api: "API",
  webhooks: "Webhooks",
  backup: "Backup",
  support: "Suporte",
  advancedAudit: "Auditoria avançada",
};

const formatLimit = (key: keyof PlanLimits, value: any) => {
  if (value === null) return "Ilimitado";
  if (key === "storageGb") return `${value} GB`;
  if (key === "api") return value === "none" ? "Não incluso" : value === "unlimited" ? "Ilimitada" : "Inclusa";
  if (key === "webhooks" || key === "advancedAudit") return value ? "Incluso" : "Não incluso";
  if (key === "backup") return value === "continuous" ? "Contínuo" : "Diário";
  if (key === "support") return ({ email: "E-mail", priority: "Prioritário", premium: "Premium", enterprise: "Enterprise" } as Record<string, string>)[value] || value;
  return Number(value).toLocaleString("pt-BR");
};

export const PlansSettingsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [subscription, setSubscription] = React.useState<CompanySubscription>({ plan: "essential", status: "active" });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!user) return;
    subscriptionPlanService.get(user.companyId).then(setSubscription).finally(() => setLoading(false));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await subscriptionPlanService.save(user.companyId, user.id, subscription);
    setSaving(false);
    setMessage("Plano e limites salvos com sucesso.");
    setTimeout(() => setMessage(""), 2400);
  };

  if (loading) return <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />;

  const currentPlan = subscriptionPlanService.getDefinition(subscription.plan);
  const currentLimits = subscriptionPlanService.effectiveLimits(subscription);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">SaaS multitenant</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Planos e limites</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Configure o plano comercial da empresa e consulte os limites que devem ser validados no backend para empresas, usuários, contratos, documentos, armazenamento e integrações.</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          <Save size={17} /> {saving ? "Salvando..." : "Salvar plano"}
        </button>
      </header>

      {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</p>}

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 shrink-0" size={20} />
          <p className="text-sm leading-6">Nesta etapa, a tela centraliza a política comercial e prepara o modelo de dados. Para impedir ultrapassagem de limite com segurança, cada operação crítica precisa validar estes limites em Cloud Functions/backend, não apenas na interface.</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {subscriptionPlans.map((plan) => (
          <button key={plan.key} onClick={() => setSubscription({ ...subscription, plan: plan.key })} className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition ${subscription.plan === plan.key ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{plan.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{plan.subtitle}</p>
              </div>
              {subscription.plan === plan.key && <CheckCircle2 className="text-blue-600" />}
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <p><b>{formatLimit("companies", plan.limits.companies)}</b> empresa(s)</p>
              <p><b>{formatLimit("users", plan.limits.users)}</b> usuário(s)</p>
              <p><b>{formatLimit("activeContracts", plan.limits.activeContracts)}</b> contratos ativos</p>
              <p><b>{formatLimit("storageGb", plan.limits.storageGb)}</b> armazenamento</p>
              <p><b>{formatLimit("bankAccounts", plan.limits.bankAccounts)}</b> conta(s) bancária(s)</p>
            </div>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black">{currentPlan.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Limites efetivos aplicados à empresa atual.</p>
          </div>
          <label className="text-xs font-bold text-slate-600">Situação
            <select value={subscription.status} onChange={(event) => setSubscription({ ...subscription, status: event.target.value as CompanySubscription["status"] })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal md:w-56">
              <option value="active">Ativo</option>
              <option value="trial">Teste</option>
              <option value="suspended">Suspenso</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(labels) as Array<keyof PlanLimits>).map((key) => (
            <article key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{labels[key]}</p>
              <p className="mt-2 text-lg font-black">{formatLimit(key, currentLimits[key])}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
