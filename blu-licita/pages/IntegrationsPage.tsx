import React, { useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Database,
  ExternalLink,
  FileUp,
  History,
  Loader2,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { connectorRegistry } from "../integrations/registry";
import { manualImportProvider } from "../integrations/manual-import/manualImportProvider";
import { syncJobsMock } from "../integrations/mocks/syncJobs";
import type { IntegrationProvider } from "../integrations/core/IntegrationProvider";

const availability: Record<
  IntegrationProvider["availability"],
  { label: string; tone: string }
> = {
  PUBLIC_API: { label: "API pública", tone: "bg-emerald-50 text-emerald-700" },
  OPEN_DATA: { label: "Dados abertos", tone: "bg-emerald-50 text-emerald-700" },
  PARTNER_API: { label: "Requer parceria", tone: "bg-amber-50 text-amber-700" },
  PRIVATE_API: { label: "API privada", tone: "bg-amber-50 text-amber-700" },
  MANUAL_IMPORT: { label: "Importação manual", tone: "bg-blue-50 text-blue-700" },
  UNDER_RESEARCH: { label: "Em pesquisa", tone: "bg-slate-100 text-slate-600" },
  UNAVAILABLE: { label: "Indisponível", tone: "bg-rose-50 text-rose-700" },
};

const capabilities = (provider: IntegrationProvider) =>
  [
    ["Oportunidades", provider.supportsOpportunities],
    ["Documentos", provider.supportsDocuments],
    ["Itens", provider.supportsItems],
    ["Resultados", provider.supportsResults],
    ["Contratos", provider.supportsContracts],
    ["Atas", provider.supportsMinutes],
  ]
    .filter(([, supported]) => supported)
    .map(([name]) => name as string);

export const IntegrationsPage: React.FC = () => {
  const providers = useMemo(
    () => [...connectorRegistry.list().map((item) => item.provider), manualImportProvider],
    [],
  );
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"catalog" | "history">("catalog");
  const [selected, setSelected] = useState<IntegrationProvider | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const visible = providers.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );

  const test = (provider: IntegrationProvider) => {
    setTesting(provider.id);
    window.setTimeout(() => {
      setTesting(null);
      setNotice(
        provider.id === "pncp"
          ? "Configuração pública validada. A consulta real será executada sob demanda."
          : provider.id === "m2a"
            ? "Integração M2A — Aguardando homologação/parceria."
            : "Nenhuma chamada externa realizada. Acesso depende de pesquisa ou parceria.",
      );
    }, 600);
  };

  return (
    <div className="mx-auto max-w-[1450px] space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-600">
            Configurações
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Integrações</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Conecte fontes oficiais e organize importações com segurança,
            rastreabilidade e segregação por empresa.
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/8">
          <button
            onClick={() => setTab("catalog")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "catalog" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 dark:text-slate-300"
            }`}
          >
            <PlugZap size={16} />
            Conectores
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "history" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 dark:text-slate-300"
            }`}
          >
            <History size={16} />
            Histórico
          </button>
        </div>
      </section>

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-300/20 dark:bg-blue-500/10 dark:text-blue-100">
          <ShieldCheck size={18} />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {tab === "catalog" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Metric label="FONTES MAPEADAS" value={String(providers.length)} />
            <Metric label="ACESSO PÚBLICO" value="2" tone="emerald" />
            <Metric label="AGUARDANDO PARCERIA" value="4" tone="amber" />
          </section>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/8">
            <Search size={17} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Buscar plataforma..."
            />
          </div>

          <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {visible.map((provider) => (
              <IntegrationCard
                key={provider.id}
                provider={provider}
                testing={testing === provider.id}
                onConfigure={() => setSelected(provider)}
                onTest={() => test(provider)}
              />
            ))}
          </section>
        </>
      ) : (
        <SyncHistory />
      )}

      {selected && (
        <ConfigurationDrawer provider={selected} close={() => setSelected(null)} />
      )}
    </div>
  );
};

const Metric = ({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) => {
  const color =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-slate-950 dark:text-white";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
};

const IntegrationCard = ({
  provider,
  testing,
  onConfigure,
  onTest,
}: {
  provider: IntegrationProvider;
  testing: boolean;
  onConfigure: () => void;
  onTest: () => void;
}) => {
  const providerCapabilities = capabilities(provider);

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/8">
      <div className="flex items-start gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
            provider.id === "pncp"
              ? "bg-emerald-50 text-emerald-600"
              : provider.id === "manual-import"
                ? "bg-blue-50 text-blue-600"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {provider.id === "manual-import" ? <FileUp /> : <Database />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">{provider.name}</h3>
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
                availability[provider.availability].tone
              }`}
            >
              {availability[provider.availability].label}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500 dark:text-slate-300">
            {provider.description}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {providerCapabilities.slice(0, 4).map((item) => (
          <span
            key={item}
            className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300"
          >
            {item}
          </span>
        ))}
        {providerCapabilities.length > 4 && (
          <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400 dark:bg-white/10">
            +{providerCapabilities.length - 4}
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
        <button
          onClick={onConfigure}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <Settings2 size={15} />
          Configurar
        </button>
        <button
          onClick={onTest}
          disabled={testing}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white disabled:opacity-60 dark:bg-blue-600"
        >
          {testing ? <Loader2 className="animate-spin" size={15} /> : <Activity size={15} />}
          Testar
        </button>
      </div>

      {provider.documentationUrl && (
        <a
          href={provider.documentationUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-200"
        >
          Documentação oficial <ExternalLink size={12} />
        </a>
      )}
    </article>
  );
};

const SyncHistory = () => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/8">
    <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/10">
      <div>
        <h3 className="font-bold">Histórico de sincronizações</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
          Execuções demonstrativas; agendamento real será responsabilidade do backend.
        </p>
      </div>
      <RefreshCw size={18} className="text-slate-400" />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 dark:bg-white/5">
          <tr>
            <th className="px-5 py-3">Fonte</th>
            <th className="px-5 py-3">Tipo</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Lidos</th>
            <th className="px-5 py-3">Criados</th>
            <th className="px-5 py-3">Atualizados</th>
            <th className="px-5 py-3">Data</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
          {syncJobsMock.map((job) => (
            <tr key={job.id}>
              <td className="px-5 py-4 font-semibold uppercase">{job.providerId}</td>
              <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-300">{job.type}</td>
              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    job.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {job.status === "COMPLETED" ? "Concluído" : "Parcial"}
                </span>
              </td>
              <td className="px-5 py-4">{job.recordsRead}</td>
              <td className="px-5 py-4 text-emerald-600">+{job.recordsCreated}</td>
              <td className="px-5 py-4 text-blue-600">{job.recordsUpdated}</td>
              <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-300">
                {new Date(job.startedAt || "").toLocaleString("pt-BR")}
              </td>
              <td className="px-5 py-4">
                <ChevronRight size={16} className="text-slate-300" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const ConfigurationDrawer = ({
  provider,
  close,
}: {
  provider: IntegrationProvider;
  close: () => void;
}) => (
  <>
    <button className="fixed inset-0 z-[60] bg-slate-950/30" onClick={close} />
    <aside className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600">CONFIGURAÇÃO</p>
          <h3 className="mt-1 text-xl font-bold">{provider.name}</h3>
        </div>
        <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10">
          <X size={20} />
        </button>
      </div>

      {provider.id === "m2a" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Integração M2A — Aguardando homologação/parceria
        </div>
      )}

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-300/20 dark:bg-blue-500/10">
        <div className="flex gap-3">
          <LockKeyhole className="shrink-0 text-blue-600 dark:text-blue-200" size={19} />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Segredos bloqueados no frontend
            </p>
            <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-200">
              Tokens, senhas, certificados e client secrets serão configurados
              exclusivamente no backend seguro futuro.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {[
          ["Nome da conexão", `${provider.name} · Principal`],
          ["Órgão ou conta", "Não informado"],
          ["Estados monitorados", "CE, RN, PB, PE"],
        ].map(([label, value]) => (
          <label key={label} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {label}
            <input
              defaultValue={value}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/10"
            />
          </label>
        ))}
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Periodicidade
          <select className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none dark:border-white/10 dark:bg-white/10">
            <option>Manual</option>
            <option>Diária (backend futuro)</option>
            <option>Semanal (backend futuro)</option>
          </select>
        </label>
      </div>

      <div className="mt-7 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:bg-white/8 dark:text-slate-300">
        <strong className="text-slate-700 dark:text-slate-100">Configuração não sensível:</strong>{" "}
        pode guardar filtros, periodicidade e identificação da conexão. Nenhuma
        credencial será persistida.
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={close} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-white/10">
          Cancelar
        </button>
        <button onClick={close} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0877ff] py-3 text-sm font-semibold text-white">
          <Check size={17} />
          Salvar rascunho
        </button>
      </div>
    </aside>
  </>
);
