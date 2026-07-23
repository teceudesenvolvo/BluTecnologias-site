import React from "react";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { billingClient } from "../services/billingClient";

export const CheckoutReturnPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = React.useState<"confirming" | "approved" | "pending" | "failed">("confirming");
  const [message, setMessage] = React.useState("Confirmando pagamento com segurança...");

  React.useEffect(() => {
    const order_nsu = params.get("order_nsu") || "";
    const transaction_nsu = params.get("transaction_nsu") || "";
    const slug = params.get("slug") || "";
    if (!order_nsu || !transaction_nsu || !slug) {
      setState("pending");
      setMessage("Não recebemos todos os dados para verificar o pagamento. Abra a página de Assinatura para consultar a cobrança.");
      return;
    }
    billingClient.checkPayment({ order_nsu, transaction_nsu, slug })
      .then(() => {
        setState("approved");
        setMessage("Pagamento confirmado pelo backend. Sua assinatura foi atualizada.");
      })
      .catch((error) => {
        setState("failed");
        setMessage(error?.message || "Pagamento ainda não confirmado.");
      });
  }, [params]);

  const Icon = state === "approved" ? CheckCircle2 : state === "confirming" ? Loader2 : state === "pending" ? Clock3 : XCircle;
  const tone = state === "approved" ? "text-emerald-600 bg-emerald-50" : state === "failed" ? "text-rose-600 bg-rose-50" : "text-blue-600 bg-blue-50";

  return (
    <div className="mx-auto grid min-h-[620px] max-w-2xl place-items-center">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${tone}`}>
          <Icon className={state === "confirming" ? "animate-spin" : ""} size={30} />
        </div>
        <h1 className="mt-6 text-2xl font-black">{state === "approved" ? "Pagamento aprovado" : state === "confirming" ? "Confirmando pagamento" : state === "pending" ? "Pagamento pendente" : "Falha na verificação"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-7 flex justify-center gap-2">
          <button onClick={() => navigate("/admin/assinatura")} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Ver assinatura</button>
          <button onClick={() => navigate("/admin/dashboard")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Voltar ao sistema</button>
        </div>
      </section>
    </div>
  );
};
