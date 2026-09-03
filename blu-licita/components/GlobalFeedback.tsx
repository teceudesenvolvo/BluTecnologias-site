import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useLocation } from "react-router-dom";

export type FeedbackKind = "error" | "success" | "info";
type FeedbackDetail = { message: string; kind?: FeedbackKind; duration?: number };

const EVENT_NAME = "blu:feedback";

export const notifyFeedback = (message: string, kind: FeedbackKind = "error", duration = 5000) => {
  const text = String(message || "").trim();
  if (!text || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FeedbackDetail>(EVENT_NAME, { detail: { message: text, kind, duration } }));
};

/** Mirrors a form message in the global, fixed feedback balloon. */
export const useFeedbackMessage = (message: string, kind: FeedbackKind = "error") => {
  React.useEffect(() => {
    if (message) notifyFeedback(message, kind);
  }, [kind, message]);
};

const kindFromMessage = (message: string): FeedbackKind =>
  /sucesso|conclu[ií]d|salv[oa]|enviado|atualizado/i.test(message) ? "success" : "error";

export const GlobalFeedback: React.FC = () => {
  const location = useLocation();
  const [feedback, setFeedback] = React.useState<(FeedbackDetail & { id: number }) | null>(null);

  React.useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackDetail>).detail;
      if (!detail?.message) return;
      setFeedback({ ...detail, kind: detail.kind || "error", id: Date.now() });
    };
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, []);

  React.useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message?: unknown) => notifyFeedback(String(message || ""), kindFromMessage(String(message || "")));
    return () => { window.alert = originalAlert; };
  }, []);

  React.useEffect(() => { setFeedback(null); }, [location.pathname]);
  React.useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), feedback.duration || 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!feedback) return null;
  const kind = feedback.kind || "error";
  const Icon = kind === "success" ? CheckCircle2 : kind === "info" ? Info : AlertCircle;
  const colors = kind === "success"
    ? "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-950/95 dark:text-emerald-100"
    : kind === "info"
      ? "border-sky-200 bg-sky-50/95 text-sky-800 dark:border-sky-400/25 dark:bg-sky-950/95 dark:text-sky-100"
      : "border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-400/25 dark:bg-rose-950/95 dark:text-rose-100";

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[9999] flex justify-end sm:top-6" role="region" aria-live="assertive">
      <div role={kind === "error" ? "alert" : "status"} className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${colors}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.16em]">{kind === "success" ? "Tudo certo" : kind === "info" ? "Informação" : "Não foi possível concluir"}</p>
          <p className="mt-1 break-words text-sm font-semibold leading-5">{feedback.message}</p>
        </div>
        <button type="button" onClick={() => setFeedback(null)} className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Fechar aviso"><X size={16}/></button>
      </div>
    </div>
  );
};
