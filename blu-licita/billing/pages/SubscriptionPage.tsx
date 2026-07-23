import React from "react";
import { AlertTriangle, ArrowUpRight, CreditCard, Loader2, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react";
import { billingClient, type BillingSummary, formatCents } from "../services/billingClient";

const date = (value?: string) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";
const statusLabel: Record<string, string> = {
  TRIALING: "Teste gratuito",
  PAYMENT_PENDING: "Pagamento pendente",
  ACTIVE: "Ativa",
  PAST_DUE: "Em atraso",
  GRACE_PERIOD: "Período de tolerância",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
};

export const SubscriptionPage: React.FC = () => {
  const [data, setData] = React.useState<BillingSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    billingClient.summary().then(setData).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const pay = async () => {
    if (!data?.plan?.id) return;
    setPaying(true);
    try {
      const result = await billingClient.createCheckout(data.plan.id, data.subscription?.status === "SUSPENDED" ? "REACTIVATION" : "RENEWAL");
      window.location.href = result.checkoutUrl;
    } catch (error: any) {
      alert(error?.message || "Não foi possível abrir o checkout.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="grid min-h-[520px] place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  const subscription = data?.subscription;
  const plan = data?.plan;
  const blocked = subscription?.status === "SUSPENDED";

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Assinatura</p>
          <h1 className="mt-2 text-3xl font-black">Plano e pagamentos</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe ciclo, cobranças, comprovantes e capacidade usada.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><RefreshCw size={17} />Atualizar</button>
          <a href="#/admin/planos" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"><ArrowUpRight size={17} />Mudar plano</a>
          <button onClick={pay} disabled={paying || !plan} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{paying ? <Loader2 className="animate-spin" size={17} /> : <CreditCard size={17} />}Pagar agora</button>
        </div>
      </header>

      {blocked && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800"><div className="flex gap-3"><AlertTriangle className="shrink-0" /><p className="text-sm font-semibold">Sua assinatura está suspensa por atraso superior ao período de tolerância. Os dados permanecem preservados; para voltar a escrever no sistema, regularize o pagamento.</p></div></section>}

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Plano atual" value={plan?.name || "Não configurado"} />
        <Metric label="Status" value={statusLabel[subscription?.status] || subscription?.status || "—"} />
        <Metric label="Fim do ciclo" value={date(subscription?.currentPeriodEndsAt || subscription?.trialEndsAt)} />
        <Metric label="Próxima cobrança" value={date(subscription?.nextBillingDate)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black"><ShieldCheck className="text-blue-600" />Uso do plano</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Usage label="Empresas/CNPJs" current={data?.usage?.companiesCount} limit={plan?.limits?.companies} />
            <Usage label="Usuários" current={data?.usage?.usersCount} limit={plan?.limits?.users} />
            <Usage label="Contratos ativos" current={data?.usage?.activeContractsCount} limit={plan?.limits?.activeContracts} />
            <Usage label="Contas bancárias" current={data?.usage?.bankAccountsCount} limit={plan?.limits?.bankAccounts} />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black"><ReceiptText className="text-blue-600" />Últimos pagamentos</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(data?.payments || []).slice(0, 5).map((payment) => (
              <article key={payment.id} className="py-3 text-sm">
                <div className="flex justify-between gap-3"><b>{formatCents(payment.amountInCents)}</b><span className="font-semibold text-emerald-600">{payment.status}</span></div>
                <p className="mt-1 text-xs text-slate-400">{date(payment.paidAt)} · {payment.captureMethod || "método não informado"}</p>
                {payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-blue-600">Abrir comprovante</a>}
              </article>
            ))}
            {!data?.payments?.length && <p className="py-10 text-center text-sm text-slate-400">Nenhum pagamento registrado.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Cobranças</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{["Pedido", "Tipo", "Valor", "Status", "Criado em", "Ações"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.orders || []).map((order) => <tr key={order.id}><td className="px-4 py-3 font-bold">{order.orderNsu}</td><td className="px-4">{order.type}</td><td className="px-4">{formatCents(order.amountInCents)}</td><td className="px-4">{order.status}</td><td className="px-4">{date(order.createdAt)}</td><td className="px-4">{order.checkoutUrl && order.status !== "PAID" ? <a className="font-bold text-blue-600" href={order.checkoutUrl}>Abrir checkout</a> : "—"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>;
const Usage = ({ label, current = 0, limit }: { label: string; current?: number; limit?: number | null }) => {
  const percent = limit ? Math.min(100, Math.round((current / Math.max(1, limit)) * 100)) : 0;
  return <article className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-3 text-sm"><b>{label}</b><span>{current}/{limit ?? "Ilimitado"}</span></div>{limit && <div className="mt-3 h-2 rounded-full bg-white"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div>}</article>;
};
