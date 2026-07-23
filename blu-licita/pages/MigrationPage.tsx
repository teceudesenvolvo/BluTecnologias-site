import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import {
  backendMigrationBaseUrl,
  backendMigrationService,
  type FirebaseMigrationMode,
  type FirebaseMigrationResult,
} from "../services/backendMigrationService";

const defaultCollections = [
  ["companies", "Empresas"],
  ["companyUsers", "Usuários e vínculos"],
  ["clients", "Clientes"],
  ["contracts", "Contratos"],
  ["companyDocuments", "Documentos e certidões"],
  ["bankAccounts", "Contas bancárias"],
  ["financialTransactions", "Fluxo de caixa"],
  ["collections", "Cobranças"],
  ["fiscalDocuments", "Notas fiscais"],
  ["taxRecords", "Gestão tributária"],
  ["projects", "Projetos"],
  ["costCenters", "Centros de custo"],
  ["budgets", "Orçamentos"],
  ["crmBoards", "Quadros CRM"],
  ["crmColumns", "Colunas CRM"],
  ["crmCards", "Cards CRM"],
  ["teamMembers", "Equipe"],
  ["subscriptions", "Assinaturas"],
  ["plans", "Planos"],
] as const;

export const MigrationPage: React.FC = () => {
  const { user } = useBluAuth();
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    () => defaultCollections.map(([key]) => key),
  );
  const [runningMode, setRunningMode] = useState<FirebaseMigrationMode | null>(null);
  const [result, setResult] = useState<FirebaseMigrationResult | null>(null);
  const [error, setError] = useState("");

  const isPlatformAdmin =
    String(user?.email || "").toLowerCase() === "admin@blutecnologias.com.br";
  const canRun = Boolean(user?.companyId) && isPlatformAdmin;
  const endpoint = `${backendMigrationBaseUrl()}/api/v1/migrations/firebase`;
  const selectedCount = selectedCollections.length;

  const collectionCards = useMemo(
    () =>
      defaultCollections.map(([key, label]) => ({
        key,
        label,
        selected: selectedCollections.includes(key),
      })),
    [selectedCollections],
  );

  const toggleCollection = (key: string) => {
    setSelectedCollections((items) =>
      items.includes(key) ? items.filter((item) => item !== key) : [...items, key],
    );
  };

  const runMigration = async (mode: FirebaseMigrationMode) => {
    if (!canRun || !user?.companyId) {
      setError("Esta página é restrita ao administrador da plataforma Blu.");
      return;
    }

    if (!selectedCollections.length) {
      setError("Selecione ao menos uma coleção para solicitar a migração.");
      return;
    }

    const confirmMessage =
      mode === "dry-run"
        ? `Solicitar prévia da migração de ${selectedCount} coleção(ões)?`
        : "Iniciar migração real? Confirme que há backup, schemas de destino validados e janela de manutenção.";

    if (!window.confirm(confirmMessage)) return;

    setRunningMode(mode);
    setError("");
    setResult(null);

    try {
      const response = await backendMigrationService.startFirebaseMigration({
        companyId: user.companyId,
        mode,
        collections: selectedCollections,
      });
      setResult(response);
    } catch (migrationError) {
      setError(
        migrationError instanceof Error
          ? migrationError.message
          : "Não foi possível solicitar a migração.",
      );
    } finally {
      setRunningMode(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="rounded-3xl border border-blue-200 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-7 text-white shadow-sm dark:border-white/10">
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-200">
          Administração da plataforma
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Migração Firebase → Backend Blu
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Solicite a prévia ou execução da migração dos dados atuais do Firebase
          para o backend próprio da Blu, mantendo segregação por empresa,
          auditoria e validação de totais.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={<ServerCog />}
          label="API configurada"
          value={backendMigrationBaseUrl()}
          detail="/api/v1/migrations/firebase"
        />
        <InfoCard
          icon={<Database />}
          label="Coleções selecionadas"
          value={String(selectedCount)}
          detail={`${defaultCollections.length} coleções mapeadas`}
        />
        <InfoCard
          icon={<ShieldCheck />}
          label="Acesso"
          value={isPlatformAdmin ? "Liberado" : "Restrito"}
          detail="Somente admin@blutecnologias.com.br"
          tone={isPlatformAdmin ? "emerald" : "amber"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <div>
              <h2 className="text-xl font-black">Escopo da migração</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Marque as coleções que o backend deverá inventariar e migrar.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCollections(defaultCollections.map(([key]) => key))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Selecionar tudo
              </button>
              <button
                onClick={() => setSelectedCollections([])}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {collectionCards.map((item) => (
              <button
                key={item.key}
                onClick={() => toggleCollection(item.key)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  item.selected
                    ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-100"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    item.selected
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {item.selected && <CheckCircle2 size={14} />}
                </span>
                <span>
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-xs opacity-70">{item.key}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
            <h2 className="text-lg font-black">Executar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              Comece sempre pela prévia. A execução real deve ocorrer apenas
              após validação do inventário e conferência dos dados críticos.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                onClick={() => runMigration("dry-run")}
                disabled={!canRun || Boolean(runningMode)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-300/20 dark:bg-white/10 dark:text-blue-100"
              >
                {runningMode === "dry-run" ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
                Prévia da migração
              </button>
              <button
                onClick={() => runMigration("execute")}
                disabled={!canRun || Boolean(runningMode)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {runningMode === "execute" ? <Loader2 className="animate-spin" size={17} /> : <Database size={17} />}
                Migrar dados
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" size={20} />
              <div>
                <h3 className="font-black">Ponto de atenção</h3>
                <p className="mt-1 text-sm leading-6">
                  O backend atual valida Supabase Auth. O frontend ainda usa
                  Firebase Auth. Até a ponte de autenticação estar concluída, a
                  API pode retornar permissão negada.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
            <p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">
              Endpoint
            </p>
            <p className="mt-2 break-all rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
              {endpoint}
            </p>
          </section>
        </aside>
      </section>

      {error && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-100">
          {error}
        </section>
      )}

      {result && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-100">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0" />
            <div>
              <h2 className="font-black">Solicitação enviada</h2>
              <p className="mt-1 text-sm">{result.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {result.jobId && <span className="rounded-full bg-white/70 px-3 py-1">Job: {result.jobId}</span>}
                {result.requestId && <span className="rounded-full bg-white/70 px-3 py-1">Request: {result.requestId}</span>}
              </div>
              {result.summary && (
                <pre className="mt-4 max-h-80 overflow-auto rounded-2xl bg-white/70 p-4 text-xs text-emerald-950">
                  {JSON.stringify(result.summary, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const InfoCard = ({
  icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "emerald" | "amber";
}) => {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-100"
        : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-100";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-all text-lg font-black text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{detail}</p>
    </article>
  );
};
