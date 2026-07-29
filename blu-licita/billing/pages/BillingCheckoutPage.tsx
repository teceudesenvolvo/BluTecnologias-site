import React from "react";
import { ArrowLeft, Barcode, CheckCircle2, Copy, CreditCard, Loader2, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { billingClient, formatCents, type BillingCheckoutPaymentData, type BillingCheckoutResult } from "../services/billingClient";

type BillingPaymentMethod = "boleto" | "credit_card" | "debit_card";

type BillingCheckoutState = {
  planId?: string;
  paymentMethod?: BillingPaymentMethod;
  billingOrderType?: "FIRST_SUBSCRIPTION" | "RENEWAL" | "UPGRADE" | "DOWNGRADE" | "REACTIVATION" | "EXTRA_CAPACITY" | "IMPLEMENTATION" | "MANUAL_CHARGE";
  orderNsu?: string;
  orderId?: string;
  planName?: string;
  amountInCents?: number;
  source?: string;
  paymentData?: BillingCheckoutPaymentData | null;
};

declare global {
  interface Window {
    PagarmeCheckout?: {
      init: (success: (data: Record<string, any>) => boolean | void, fail: (error: unknown) => void) => void;
    };
  }
}

const copyText = async (text?: string) => {
  if (!text) return false;
  await navigator.clipboard.writeText(text);
  return true;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

const loadPagarmeScript = (appId: string, onReady: () => void) => {
  if (typeof window === "undefined") return;
  if (!appId) return;
  if (window.PagarmeCheckout) {
    onReady();
    return;
  }
  const existing = document.querySelector<HTMLScriptElement>("#pagarme-tokenizecard-js");
  if (existing) {
    existing.addEventListener("load", onReady, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = "pagarme-tokenizecard-js";
  script.src = "https://checkout.pagar.me/v1/tokenizecard.js";
  script.async = true;
  script.dataset.pagarmecheckoutAppId = appId;
  script.addEventListener("load", onReady, { once: true });
  document.body.appendChild(script);
};

const pickString = (...values: unknown[]) => values.map((value) => (typeof value === "string" ? value.trim() : "")).find(Boolean) || "";

export const BillingCheckoutPage: React.FC = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as BillingCheckoutState;

  const planId = state.planId || params.get("planId") || params.get("plan") || "";
  const paymentMethod = (state.paymentMethod || (params.get("method") as BillingPaymentMethod) || "credit_card") as BillingPaymentMethod;
  const billingOrderType = (state.billingOrderType || (params.get("type") as BillingCheckoutState["billingOrderType"]) || "FIRST_SUBSCRIPTION") as BillingCheckoutState["billingOrderType"];
  const existingOrderNsu = state.orderNsu || params.get("order_nsu") || "";
  const initialPlanName = state.planName || params.get("planName") || "Plano selecionado";
  const initialAmount = Number(state.amountInCents || params.get("amountInCents") || 0);

  const [checkout, setCheckout] = React.useState<BillingCheckoutResult | null>(
    state.orderId
      ? {
          orderId: state.orderId,
          orderNsu: state.orderNsu || "",
          amountInCents: initialAmount,
          planName: initialPlanName,
          paymentMethod,
          orderStatus: state.paymentData?.status || "CHECKOUT_CREATED",
          paymentData: state.paymentData || undefined,
          raw: state.paymentData || null,
        }
      : null,
  );
  const [loading, setLoading] = React.useState(Boolean(planId && !state.orderId));
  const [creating, setCreating] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copySuccess, setCopySuccess] = React.useState("");
  const [cardToken, setCardToken] = React.useState("");
  const [cardData, setCardData] = React.useState<Record<string, any> | null>(null);
  const [tokenizerReady, setTokenizerReady] = React.useState(false);
  const [pagarmePublicKey, setPagarmePublicKey] = React.useState(String(import.meta.env.VITE_PAGARME_PUBLIC_KEY || "").trim());
  const [publicKeyLoading, setPublicKeyLoading] = React.useState(false);
  const [cardForm, setCardForm] = React.useState({
    holder_name: "",
    holder_document: "",
    number: "",
    exp_month: "",
    exp_year: "",
    cvv: "",
  });

  const paymentData = checkout?.paymentData || state.paymentData || null;
  const paymentRaw = (paymentData?.raw || null) as Record<string, any> | null;
  const orderNsu = checkout?.orderNsu || state.orderNsu || existingOrderNsu;
  const orderId = checkout?.orderId || state.orderId || "";
  const amountInCents = checkout?.amountInCents || state.amountInCents || initialAmount;
  const planName = checkout?.planName || state.planName || initialPlanName;
  const isCard = paymentMethod === "credit_card" || paymentMethod === "debit_card";
  const isBoleto = paymentMethod === "boleto";

  const refreshCheckout = React.useCallback(async () => {
    if (!planId) {
      setError("Não recebemos os dados do checkout.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await billingClient.createCheckout(planId, billingOrderType, paymentMethod, existingOrderNsu ? { orderNsu: existingOrderNsu } : {});
      setCheckout(result);
      if (result.requiresCardToken) {
        setTokenizerReady(Boolean(pagarmePublicKey));
      }
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível abrir o checkout.");
    } finally {
      setLoading(false);
    }
  }, [billingOrderType, existingOrderNsu, pagarmePublicKey, paymentMethod, planId]);

  React.useEffect(() => {
    if (state.paymentData && state.orderId) return;
    void refreshCheckout();
  }, [refreshCheckout, state.orderId, state.paymentData]);

  React.useEffect(() => {
    if (!isCard) return;
    let cancelled = false;
    const ensurePublicKey = async () => {
      setError("");
      setPublicKeyLoading(true);
      try {
        const fallbackKey = String(import.meta.env.VITE_PAGARME_PUBLIC_KEY || "").trim();
        if (fallbackKey) {
          if (!cancelled) setPagarmePublicKey(fallbackKey);
          return fallbackKey;
        }
        const gateway = await billingClient.publicGateway().catch(() => null);
        const resolvedKey = String(gateway?.publicKey || "").trim();
        if (!resolvedKey) {
          throw new Error("Configure a chave pública do Pagar.me em BluHQ para usar o cartão.");
        }
        if (!cancelled) setPagarmePublicKey(resolvedKey);
        return resolvedKey;
      } catch (reason: any) {
        if (!cancelled) {
          setError(reason?.message || "Não foi possível carregar a chave pública do checkout.");
        }
        return "";
      } finally {
        if (!cancelled) setPublicKeyLoading(false);
      }
    };

    void ensurePublicKey().then((resolvedKey) => {
      if (!resolvedKey || cancelled) return;
      loadPagarmeScript(resolvedKey, () => {
        window.PagarmeCheckout?.init(
          (data) => {
            setCardData(data);
            setCardToken(String(data.pagarmetoken || data.token || ""));
            return false;
        },
        (err) => {
          console.error("Erro ao tokenizar cartão:", err);
          setError("Não foi possível tokenizar o cartão. Verifique os dados e tente novamente.");
          },
        );
        setTokenizerReady(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isCard]);

  const verifyPayment = React.useCallback(async () => {
    if (!orderNsu) {
      setError("Não encontramos o pedido para verificar.");
      return;
    }
    setCreating(true);
    try {
      await billingClient.checkPayment({ order_nsu: orderNsu });
      navigate(`/admin/assinatura/retorno?order_nsu=${encodeURIComponent(orderNsu)}`, { replace: true });
    } catch (reason: any) {
      setError(reason?.message || "Ainda não conseguimos confirmar o pagamento. Tente novamente em instantes.");
    } finally {
      setCreating(false);
    }
  }, [navigate, orderNsu]);

  const submitCardPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tokenizerReady) {
      setError("O tokenizador do cartão ainda não ficou pronto.");
      return;
    }
    if (!cardToken) {
      setError("Clique em pagar para gerar o token seguro do cartão.");
      return;
    }
    setSubmitting(true);
    try {
      if (!planId) {
        setError("Não recebemos o plano deste pagamento.");
        setSubmitting(false);
        return;
      }
      const result = await billingClient.createCheckout(planId, billingOrderType, paymentMethod, {
        cardToken,
        orderNsu: orderNsu || undefined,
      });
      setCheckout(result);
      if (result.orderStatus === "PAID" || String(result.orderStatus || "").toUpperCase() === "PAID") {
        navigate(`/admin/assinatura/retorno?order_nsu=${encodeURIComponent(result.orderNsu)}`, { replace: true });
      }
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível processar o cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  const boletoLine = paymentData?.boleto?.line || "";
  const boletoPdf = paymentData?.boleto?.pdf || paymentData?.boleto?.url || "";
  const boletoBarcode = paymentData?.boleto?.barcode || "";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Checkout Blu</p>
            <h1 className="mt-2 text-3xl font-black">Finalizar pagamento dentro da Blu</h1>
            <p className="mt-2 text-sm text-slate-500">
              O usuário permanece na plataforma enquanto conclui o pagamento do {planName}. O pedido interno é {orderNsu || "—"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <ArrowLeft size={17} />
              Voltar
            </button>
            <button onClick={verifyPayment} disabled={creating || !orderNsu} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {creating ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
              Já paguei, verificar
            </button>
          </div>
        </div>
      </header>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}

      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Pagamento</p>
              <h2 className="mt-1 text-lg font-black">{planName}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Valor</p>
              <p className="mt-1 text-lg font-black">{formatCents(amountInCents)}</p>
            </div>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
              <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">{paymentMethod === "boleto" ? "Boleto" : paymentMethod === "debit_card" ? "Cartão de débito (Pinless)" : "Cartão de crédito"}</span>
              <span className="rounded-full bg-slate-100 px-3 py-2">Pedido {orderNsu || "—"}</span>
              <span className="rounded-full bg-slate-100 px-3 py-2">Status {checkout?.orderStatus || "aguardando"}</span>
            </div>
          </div>

          <div className="min-h-[680px] bg-slate-50 p-5 lg:p-7">
            {loading ? (
              <div className="grid min-h-[620px] place-items-center rounded-3xl border border-dashed border-slate-200 bg-white">
                <Loader2 className="animate-spin text-blue-600" size={20} />
              </div>
            ) : isBoleto ? (
              <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Boleto</p>
                  <h3 className="mt-2 text-2xl font-black">Pague o boleto sem sair da Blu</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Mostramos aqui os dados do boleto gerado pelo gateway para manter a jornada dentro da plataforma.</p>

                  <div className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Linha digitável</p>
                      <div className="mt-2 flex items-center gap-3">
                        <p className="flex-1 break-all font-mono text-sm text-slate-800">{boletoLine || "Aguardando geração do boleto."}</p>
                        <button onClick={async () => { if (await copyText(boletoLine)) setCopySuccess("Linha digitável copiada."); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                          <Copy size={16} /> Copiar
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <a href={boletoPdf || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
                        <Barcode size={16} /> Abrir PDF
                      </a>
                      <button onClick={async () => { if (await copyText(boletoBarcode)) setCopySuccess("Código de barras copiado."); }} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                        <Copy size={16} /> Copiar código
                      </button>
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <InfoCard title="Vencimento" icon={<Ticket size={18} />} value={formatDate(paymentData?.boleto?.dueAt)}>
                    <p className="text-sm leading-6 text-slate-600">Após o vencimento, os dados podem ser atualizados pelo gateway.</p>
                  </InfoCard>
                  <InfoCard title="Arquivo" icon={<Barcode size={18} />} value={boletoPdf ? "Baixar boleto" : "Aguardando"}>
                    <p className="text-sm leading-6 text-slate-600">Você pode abrir o PDF para pagamento ou arquivar o comprovante.</p>
                  </InfoCard>
                  <InfoCard title="Verificação" icon={<CheckCircle2 size={18} />} value="Já paguei, verificar" onClick={verifyPayment}>
                    <p className="text-sm leading-6 text-slate-600">Depois do pagamento, confirme aqui sem sair da Blu.</p>
                  </InfoCard>
                </aside>
              </div>
            ) : (
              <form
                onSubmit={submitCardPayment}
                className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"
                data-pagarmecheckout-form
                id="blu-card-checkout-form"
              >
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{paymentMethod === "debit_card" ? "Cartão de débito (Pinless)" : "Cartão de crédito"}</p>
                  <h3 className="mt-2 text-2xl font-black">Pagamento transparente dentro da Blu</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Os dados do cartão são tokenizados pelo Pagar.me no navegador. A Blu recebe apenas o token, sem armazenar dados sensíveis.</p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <CardField label="Nome no cartão" value={cardForm.holder_name} onChange={(holder_name) => setCardForm((current) => ({ ...current, holder_name }))} name="holder_name" dataElement="holder_name" />
                    <CardField label="CPF/CNPJ do titular" value={cardForm.holder_document} onChange={(holder_document) => setCardForm((current) => ({ ...current, holder_document }))} name="holder_document" dataElement="holder_document" inputMode="numeric" />
                    <CardField label="Número do cartão" value={cardForm.number} onChange={(number) => setCardForm((current) => ({ ...current, number }))} name="number" dataElement="number" inputMode="numeric" className="md:col-span-2" />
                    <CardField label="Mês de validade" value={cardForm.exp_month} onChange={(exp_month) => setCardForm((current) => ({ ...current, exp_month }))} name="exp_month" dataElement="exp_month" inputMode="numeric" />
                    <CardField label="Ano de validade" value={cardForm.exp_year} onChange={(exp_year) => setCardForm((current) => ({ ...current, exp_year }))} name="exp_year" dataElement="exp_year" inputMode="numeric" />
                    <CardField label="CVV" value={cardForm.cvv} onChange={(cvv) => setCardForm((current) => ({ ...current, cvv }))} name="cvv" dataElement="cvv" inputMode="numeric" />
                  </div>

                    <button
                      type="submit"
                    disabled={submitting || !tokenizerReady || publicKeyLoading}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting || publicKeyLoading ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                    {publicKeyLoading ? "Carregando checkout..." : submitting ? "Processando pagamento..." : "Pagar agora"}
                  </button>
                </section>

                <aside className="space-y-4">
                  <InfoCard title="Checkout interno" icon={<Sparkles size={18} />} value="100% Blu">
                    <p className="text-sm leading-6 text-slate-600">Sem redirecionamento, sem iframe, sem sair da navegação do cliente. O cartão é tokenizado e a cobrança segue por API.</p>
                  </InfoCard>
                  <InfoCard title="Status do tokenizador" icon={<ShieldCheck size={18} />} value={tokenizerReady ? "Pronto" : "Carregando"}>
                    <p className="text-sm leading-6 text-slate-600">A chave pública é usada apenas para gerar o token seguro no navegador.</p>
                  </InfoCard>
                  <InfoCard title="Verificação" icon={<CheckCircle2 size={18} />} value="Já paguei, verificar" onClick={verifyPayment}>
                    <p className="text-sm leading-6 text-slate-600">Se o cartão já foi aprovado, podemos confirmar o pedido agora.</p>
                  </InfoCard>
                </aside>
              </form>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
            <h3 className="text-sm font-black uppercase tracking-[.18em] text-blue-700">Fluxo interno</h3>
            <p className="mt-3 text-sm leading-6">Tudo acontece dentro da Blu. A API do gateway gera a cobrança e a interface exibe os dados nativos aqui mesmo.</p>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[.18em] text-slate-400">Atalhos</h3>
            <div className="mt-4 space-y-3">
              <button onClick={verifyPayment} disabled={creating || !orderNsu} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                <ShieldCheck size={16} />
                Confirmar pagamento
              </button>
              {copySuccess && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{copySuccess}</p>}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <p><b className="text-slate-900">Pedido:</b> {orderId || "—"}</p>
                <p className="mt-1"><b className="text-slate-900">Método:</b> {isBoleto ? "Boleto" : paymentMethod === "debit_card" ? "Cartão de débito (Pinless)" : "Cartão de crédito"}</p>
                <p className="mt-1"><b className="text-slate-900">Plano:</b> {planName}</p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};

function CardField({
  label,
  value,
  onChange,
  name,
  dataElement,
  className = "",
  inputMode = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name: string;
  dataElement: string;
  className?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className={`text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input
        name={name}
        data-pagarmecheckout-element={dataElement}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={label}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

function InfoCard({
  title,
  value,
  icon,
  children,
  onClick,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">{title}</p>
          <h4 className="mt-2 text-lg font-black">{value}</h4>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">{icon}</span>
      </div>
      <div className="mt-4 text-sm text-slate-600">{children}</div>
      {onClick && (
        <button onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
          <CheckCircle2 size={16} />
          Verificar
        </button>
      )}
    </article>
  );
}
