import React from "react";
import { Barcode, CreditCard, Loader2, WalletCards, X } from "lucide-react";

export type BillingPaymentMethod = "boleto" | "credit_card" | "debit_card";

const paymentMethodMeta: Record<BillingPaymentMethod, { title: string; description: string; icon: React.ReactNode }> = {
  boleto: {
    title: "Boleto",
    description: "Gerar boleto para pagamento bancário.",
    icon: <Barcode size={18} />,
  },
  credit_card: {
    title: "Cartão de crédito",
    description: "Pagamento imediato para assinatura, sem parcelamento.",
    icon: <CreditCard size={18} />,
  },
  debit_card: {
    title: "Cartão de débito (Pinless)",
    description: "Pagamento direto no cartão de débito suportado pelo gateway.",
    icon: <WalletCards size={18} />,
  },
};

type Props = {
  title: string;
  description?: string;
  confirmLabel?: string;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: BillingPaymentMethod) => void;
  defaultValue?: BillingPaymentMethod;
};

export const PaymentMethodModal: React.FC<Props> = ({
  title,
  description,
  confirmLabel = "Continuar para o checkout",
  open,
  loading = false,
  onClose,
  onConfirm,
  defaultValue = "credit_card",
}) => {
  const [selected, setSelected] = React.useState<BillingPaymentMethod>(defaultValue);

  React.useEffect(() => {
    if (open) setSelected(defaultValue);
  }, [defaultValue, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Forma de pagamento</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Fechar">
            <X size={22} />
          </button>
        </header>

        <div className="grid gap-3 px-6 py-6 sm:grid-cols-3">
          {(Object.keys(paymentMethodMeta) as BillingPaymentMethod[]).map((method) => {
            const meta = paymentMethodMeta[method];
            const active = selected === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setSelected(method)}
                className={`rounded-[1.4rem] border p-4 text-left transition ${
                  active ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-2xl ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                    {meta.icon}
                  </span>
                  {active && <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white">Selecionado</span>}
                </div>
                <h3 className="mt-4 text-lg font-black">{meta.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{meta.description}</p>
              </button>
            );
          })}
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : null}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
};
