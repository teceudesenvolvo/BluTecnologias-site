import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  CalendarDays,
  ExternalLink,
  FileArchive,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { ExternalOpportunity } from "../integrations/core/integrationTypes";
import type { PncpModality } from "../integrations/pncp/pncpTypes";
import { integrationOpportunityService } from "../services/integrationOpportunityService";
import { OpportunityDetailsModal } from "../components/OpportunityDetailsModal";
import type { TceCeMunicipality } from "../integrations/tce-ce/TceCeConnector";
import { useBluAuth } from "../contexts/BluAuthContext";
import { opportunityFavoritesService } from "../services/opportunityFavoritesService";
import { interestSettingsService } from "../services/interestSettingsService";
import { InterestSettingsPage } from "./InterestSettingsPage";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const money = (value?: number) =>
  value === undefined
    ? "Não informado"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value);
const parseDate = (value?: string) => {
  if (!value) return undefined;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})(.*)$/.exec(value);
  const parsed = new Date(br ? `${br[3]}-${br[2]}-${br[1]}${br[4]}` : value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};
const dateLabel = (value?: string) => {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: value?.includes("T") ? "short" : undefined,
      }).format(date)
    : "Não informada";
};
const portalUrl = (item: ExternalOpportunity) => {
  if (item.sourceUrl) return item.sourceUrl;
  const match = /^(\d{14})-1-(\d+)\/(\d{4})$/.exec(item.externalId);
  if (match)
    return `https://pncp.gov.br/app/editais/${match[1]}/${match[3]}/${Number(match[2])}`;
  if (item.source === "tce-ce")
    return "https://municipios-licitacoes.tce.ce.gov.br/";
  if (item.source === "portal-compras-publicas")
    return "https://www.portaldecompraspublicas.com.br/";
  return "https://www.gov.br/compras/pt-br";
};
type Stage = "receiving" | "contracting" | "finished";
const procurementStage = (item: ExternalOpportunity): Stage => {
  const raw = item.raw as Record<string, unknown>;
  const text = normalizeText(
    `${item.status || ""} ${raw.situacaoCompraNome || ""} ${raw.situacao || ""}`,
  );
  if (/final|encerr|fech|homolog|adjud|conclu|cancel|revog/.test(text))
    return "finished";
  const proposalEnd = parseDate(
    String(
      raw.dataEncerramentoProposta ||
        raw.dataFinalPropostas ||
        raw.DATA_FINAL_PROPOSTAS ||
        "",
    ),
  );
  if (proposalEnd && proposalEnd.getTime() < Date.now()) return "contracting";
  const opening = parseDate(item.openingDate);
  if (opening && opening.getTime() < Date.now()) return "contracting";
  if (/contrat|habilit|julg|avaliacao/.test(text)) return "contracting";
  return "receiving";
};
const stageMeta: Record<Stage, { label: string; color: string }> = {
  receiving: {
    label: "Recebendo propostas",
    color: "bg-emerald-50 text-emerald-700",
  },
  contracting: { label: "Em contratação", color: "bg-amber-50 text-amber-700" },
  finished: { label: "Finalizado", color: "bg-slate-100 text-slate-600" },
};
type ProcessStatus = "published" | "open" | "closed" | "contracting" | "finished" | "suspended" | "cancelled";
const processStatus = (item: ExternalOpportunity): ProcessStatus => {
  const raw = item.raw as Record<string, unknown>;
  const text = normalizeText(`${item.status || ""} ${raw.situacaoCompraNome || ""} ${raw.situacao || ""} ${raw.situacao_licitacao || ""}`);
  if (/cancel|revog|anulad/.test(text)) return "cancelled";
  if (/suspens/.test(text)) return "suspended";
  if (/homolog|adjud|finaliz|conclu/.test(text)) return "finished";
  if (/fechad|encerrad|fracassad|desert/.test(text)) return "closed";
  if (/contrata|habilita|julgamento|avaliacao/.test(text)) return "contracting";
  if (/abert|recebendo proposta|acolhimento de proposta/.test(text)) return "open";
  const proposalEnd = parseDate(String(raw.dataEncerramentoProposta || raw.dataFinalPropostas || raw.DATA_FINAL_PROPOSTAS || ""));
  if (proposalEnd) return proposalEnd.getTime() >= Date.now() ? "open" : "closed";
  if (/public|divulga|informado/.test(text)) return "published";
  return procurementStage(item) === "receiving" ? "open" : procurementStage(item) === "contracting" ? "contracting" : "finished";
};
const processStatusMeta:Record<ProcessStatus,{label:string;color:string}>={published:{label:"Publicado",color:"bg-blue-50 text-blue-700"},open:{label:"Aberto · recebendo propostas",color:"bg-emerald-50 text-emerald-700"},closed:{label:"Fechado",color:"bg-slate-100 text-slate-700"},contracting:{label:"Em contratação",color:"bg-amber-50 text-amber-700"},finished:{label:"Finalizado",color:"bg-violet-50 text-violet-700"},suspended:{label:"Suspenso",color:"bg-orange-50 text-orange-700"},cancelled:{label:"Cancelado",color:"bg-rose-50 text-rose-700"}};

export const OpportunitiesPage: React.FC = () => {
  const { user } = useBluAuth();
  const [interestKeywords, setInterestKeywords] = useState<string[]>([]);
  const [statusFilter,setStatusFilter]=useState<"all"|ProcessStatus>("all");
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 7);
    return isoDate(date);
  });
  const [endDate, setEndDate] = useState(() => isoDate(today));
  const [modalities, setModalities] = useState<PncpModality[]>([]);
  const [modality, setModality] = useState("");
  const [state, setState] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ExternalOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string>();
  const [total, setTotal] = useState<number>();
  const [selected, setSelected] = useState<ExternalOpportunity | null>(null);
  const [interestOpen, setInterestOpen] = useState(false);
  const [source, setSource] = useState<
    "pncp" | "compras-gov" | "tce-ce" | "portal-compras-publicas"
  >("pncp");
  const [municipalities, setMunicipalities] = useState<TceCeMunicipality[]>([]);
  const [municipality, setMunicipality] = useState("");
  const changeSource = (
    next: "pncp" | "compras-gov" | "tce-ce" | "portal-compras-publicas",
  ) => {
    setSource(next);
    setQuery("");
    if (next === "tce-ce") {
      setMunicipality("");
      setStartDate(`${today.getFullYear()}-01-01`);
      setEndDate(isoDate(today));
    } else {
      const date = new Date(today);
      date.setDate(date.getDate() - 7);
      setStartDate(isoDate(date));
      setEndDate(isoDate(today));
    }
  };

  useEffect(() => {
    integrationOpportunityService
      .listModalities()
      .then((data) => {
        const active = data.filter((item) => item.statusAtivo !== false);
        setModalities(active);
        const electronicAuction = active.find(
          (item) =>
            item.nome.toLowerCase().includes("pregão") &&
            item.nome.toLowerCase().includes("eletr"),
        );
        if (electronicAuction) setModality(String(electronicAuction.id));
        else if (active[0]) setModality(String(active[0].id));
      })
      .catch(() => {
        setError("Não foi possível carregar as modalidades oficiais do PNCP.");
        setLoading(false);
      });
  }, []);
  useEffect(() => {
    if (source === "tce-ce" && municipalities.length === 0)
      integrationOpportunityService
        .listTceCeMunicipalities()
        .then(setMunicipalities)
        .catch(() =>
          setError("Não foi possível carregar os municípios do TCE-CE."),
        );
  }, [source]);
  const load = async (cursor = source === "tce-ce" ? "0" : "1") => {
    if (
      source !== "tce-ce" &&
      source !== "portal-compras-publicas" &&
      !modality
    )
      return;
    setLoading(true);
    setError("");
    try {
      const filters = {
        startDate,
        endDate,
        state: state || undefined,
        municipalityCode: municipality || undefined,
        modalityCode: Number(modality),
        pageSize: 40,
      };
      let result = await integrationOpportunityService.list(
        source,
        filters,
        cursor,
      );
      let combined = [...result.data];
      let following = result.nextCursor;
      const searching =
        query.trim().length > 0 && source !== "tce-ce" && cursor === "1";
      let requests = 1;
      while (searching && following && requests < 5) {
        const next = await integrationOpportunityService.list(
          source,
          filters,
          following,
        );
        combined = [...combined, ...next.data];
        following = next.nextCursor;
        requests += 1;
      }
      setItems(combined);
      setNextCursor(searching ? undefined : result.nextCursor);
      setTotal(result.total);
      setPage(source === "tce-ce" ? Number(cursor) + 1 : Number(cursor));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar as oportunidades agora.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (source === "tce-ce" || source === "portal-compras-publicas" || modality)
      void load();
  }, [modality, source, municipality]);
  useEffect(() => {
    if (user)
      interestSettingsService.get(user.companyId).then(setInterestKeywords);
  }, [user]);
  const visible = items.filter((item) => {
    const searchable = normalizeText(
      `${item.object} ${item.organizationName} ${item.processNumber || ""}`,
    );
    const normalizedQuery = normalizeText(query.trim());
    const matchesSearch =
      !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesInterest =
      normalizedQuery.length > 0 ||
      interestKeywords.length === 0 ||
      interestSettingsService.matches(item.object, interestKeywords);
    const matchesStatus=statusFilter==="all"||processStatus(item)===statusFilter;
    return matchesSearch && matchesInterest && matchesStatus;
  });
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Fonte oficial ·{" "}
              {source === "pncp"
                ? "PNCP"
                : source === "compras-gov"
                  ? "Compras.gov.br"
                  : source === "portal-compras-publicas"
                    ? "Portal de Compras Públicas"
                    : "TCE-CE"}
            </span>
            <span className="text-xs text-slate-400">
              Atualização sob demanda
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Radar de oportunidades
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Processos publicados por APIs oficiais de compras públicas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setInterestOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings size={17} />
            Áreas de interesse
          </button>
          <button
            onClick={() => load()}
            disabled={loading || (source === "pncp" || source === "compras-gov" ? !modality : false)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0877ff] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
            Atualizar oportunidades
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          className="mb-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Fonte de oportunidades"
        >
          <button
            onClick={() => changeSource("pncp")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${source === "pncp" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            PNCP
          </button>
          <button
            onClick={() => changeSource("compras-gov")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${source === "compras-gov" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Compras.gov.br
          </button>
          <button
            onClick={() => changeSource("tce-ce")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${source === "tce-ce" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            TCE-CE
          </button>
          <button
            onClick={() => changeSource("portal-compras-publicas")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${source === "portal-compras-publicas" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Portal de Compras Públicas
          </button>
          <span className="self-center px-2 text-xs text-slate-400">
            Licitações-e: aguardando acesso oficial
          </span>
        </div>
        {source === "tce-ce" && (
          <select
            value={municipality}
            onChange={(event) => setMunicipality(event.target.value)}
            className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            aria-label="Município do Ceará"
          >
            <option value="">Todos os municípios do Ceará</option>
            {municipalities.map((item) => (
              <option key={item.codigo_municipio} value={item.codigo_municipio}>
                {item.nome_municipio}
              </option>
            ))}
          </select>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_.7fr_1fr_auto]">
          <label className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={17}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void load(source === "tce-ce" ? "0" : "1");
                }
              }}
              placeholder="Buscar por objeto, órgão ou processo"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          {source !== "tce-ce" && source !== "portal-compras-publicas" ? (
            <select
              value={modality}
              onChange={(event) => setModality(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Modalidade"
            >
              <option value="">Modalidade oficial</option>
              {modalities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              {source === "tce-ce" ? "Todas as modalidades do TCE-CE" : "Todas as modalidades do Portal"}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-xs"
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-xs"
              aria-label="Data final"
            />
          </div>
          {source !== "tce-ce" ? (
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Estado"
            >
              <option value="">Todos os estados</option>
              {["CE", "RN", "PB", "PE", "BA", "PI", "MA", "AL", "SE"].map(
                (uf) => (
                  <option key={uf}>{uf}</option>
                ),
              )}
            </select>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              Estado: Ceará
            </div>
          )}
          <select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value as "all"|ProcessStatus)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" aria-label="Situação do processo">
            <option value="all">Todas as situações</option><option value="published">Publicados</option><option value="open">Abertos / recebendo propostas</option><option value="closed">Fechados</option><option value="contracting">Em contratação</option><option value="finished">Finalizados</option><option value="suspended">Suspensos</option><option value="cancelled">Cancelados</option>
          </select>
          <button
            onClick={() => load(source === "tce-ce" ? "0" : "1")}
            disabled={(source === "pncp" || source === "compras-gov" ? !modality : false) || loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Filter size={16} />
            {query.trim() ? "Buscar" : "Aplicar"}
          </button>
        </div>
        {query.trim() && source !== "tce-ce" && (
          <p className="mt-3 text-xs text-slate-400">
            A busca por objeto consulta até 200 registros do período
            selecionado, pois a API oficial do PNCP não possui filtro textual.
          </p>
        )}
        {source === "tce-ce" && (
          <p className="mt-3 text-xs text-slate-400">
            Por padrão, a Blu consulta todos os municípios em grupos para preservar o desempenho da API do TCE-CE. Se preferir, selecione uma cidade específica.
          </p>
        )}
        {source === "portal-compras-publicas" && (
          <p className="mt-3 text-xs text-slate-400">A API oficial exige uma publicKey. Configure VITE_PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY no ambiente da aplicação.</p>
        )}
      </section>
      {error && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle className="mx-auto text-rose-500" />
          <h3 className="mt-3 font-semibold text-rose-900">
            Consulta temporariamente indisponível
          </h3>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <button
            onClick={() => load("1")}
            className="mt-4 text-sm font-semibold text-rose-800"
          >
            Tentar novamente
          </button>
        </section>
      )}
      {loading ? (
        <OpportunitySkeleton />
      ) : (
        !error && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h3 className="text-sm font-bold">Processos encontrados</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {total !== undefined
                    ? `${total.toLocaleString("pt-BR")} registros na fonte`
                    : `${visible.length} registros nesta página`}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <SlidersHorizontal size={14} />
                Página {page}
              </span>
            </div>
            {visible.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="mx-auto text-slate-300" size={28} />
                <h3 className="mt-3 font-semibold">
                  Nenhum processo encontrado
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ajuste o período, modalidade, estado ou termo de busca.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visible.map((item, index) => (
                  <OpportunityRow
                    key={`${item.source}:${item.externalId}:${index}`}
                    item={item}
                    open={() => setSelected(item)}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 p-4">
              <button
                onClick={() => load(String(page - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                <ArrowLeft size={14} />
                Anterior
              </button>
              <span className="text-xs text-slate-400">
                Dados consultados diretamente da fonte oficial selecionada
              </span>
              <button
                onClick={() => nextCursor && load(nextCursor)}
                disabled={!nextCursor || loading}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Próxima
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )
      )}
      {selected && (
        <OpportunityDetailsModal
          opportunity={selected}
          initialTab={
            sessionStorage.getItem("blu:opportunity-tab") === "documents"
              ? "documents"
              : "overview"
          }
          close={() => {
            sessionStorage.removeItem("blu:opportunity-tab");
            setSelected(null);
          }}
        />
      )}
      {interestOpen && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl">
            <div className="mb-3 flex justify-end">
              <button onClick={() => { setInterestOpen(false); if (user) interestSettingsService.get(user.companyId).then(setInterestKeywords); }} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow">
                Fechar
              </button>
            </div>
            <InterestSettingsPage />
          </div>
        </div>
      )}
    </div>
  );
};

const OpportunityRow = ({
  item,
  open,
}: {
  item: ExternalOpportunity;
  open: () => void;
}) => {
  const { user } = useBluAuth();
  const [favorite, setFavorite] = useState(false);
  const raw = item.raw as {
    modalidadeNome?: string;
    unidadeOrgao?: { municipioNome?: string; ufSigla?: string };
    situacaoCompraNome?: string;
    dataInicioPropostas?: string;
    dataFinalPropostas?: string;
    dataEncerramentoProposta?: string;
    municipio?: string;
  };
  const stage = procurementStage(item);
  const status=processStatus(item);
  const stageIndex = stage === "receiving" ? 0 : stage === "contracting" ? 1 : 2;
  const proposalEnd = raw.dataEncerramentoProposta || raw.dataFinalPropostas;
  useEffect(() => {
    if (user)
      opportunityFavoritesService
        .list(user.companyId)
        .then((saved) =>
          setFavorite(saved.has(`${item.source}:${item.externalId}`)),
        )
        .catch(() => {});
  }, [user, item.source, item.externalId]);
  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const toggle = async (event: React.MouseEvent) => {
    stop(event);
    if (!user) return;
    if (favorite)
      await opportunityFavoritesService.remove(user.companyId, item);
    else await opportunityFavoritesService.save(user.companyId, user.id, item);
    setFavorite(!favorite);
  };
  const show = (tab: "overview" | "documents", event: React.MouseEvent) => {
    stop(event);
    sessionStorage.setItem("blu:opportunity-tab", tab);
    open();
  };
  return (
    <article
      onClick={open}
      className="cursor-pointer p-5 transition hover:bg-slate-50"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 size={18} />
            <p className="text-xs font-bold uppercase text-slate-400">
              {item.organizationName}
            </p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {item.source === "tce-ce"
                ? "TCE-CE"
                : item.source === "compras-gov"
                  ? "Compras.gov.br"
                  : item.source === "portal-compras-publicas"
                    ? "Portal de Compras Públicas"
                    : "PNCP"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${processStatusMeta[status].color}`}>{processStatusMeta[status].label}</span>
          </div>
          <h4 className="mt-2 line-clamp-2 font-semibold leading-6">
            {item.object}
          </h4>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {raw.unidadeOrgao?.municipioNome || raw.municipio || "Local não informado"}
            </span>
            <span>
              Processo:{" "}
              <strong>
                {item.processNumber || item.procurementNumber || "—"}
              </strong>
            </span>
            <span>{raw.modalidadeNome || "Modalidade não informada"}</span>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-4 text-sm xl:w-[520px]">
          <div>
            <p className="text-[10px] uppercase text-slate-400">Publicação</p>
            <p className="font-semibold">{dateLabel(item.publicationDate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">
              Valor estimado
            </p>
            <p className="font-bold">{money(item.estimatedValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Abertura</p>
            <p className="flex items-center gap-1 font-semibold">
              <CalendarDays size={14} />
              {dateLabel(item.openingDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Fim das propostas</p>
            <p className="font-semibold">{dateLabel(proposalEnd)}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex items-start">
          {["Recebendo propostas", "Em contratação", "Finalizado"].map((label,index)=><React.Fragment key={label}><div className="min-w-0 flex-1"><div className={`h-2.5 w-2.5 rounded-full ${index<=stageIndex?'bg-blue-600':'bg-slate-300'}`}/><p className={`mt-1 text-[10px] font-bold ${index===stageIndex?'text-blue-700':'text-slate-400'}`}>{label}</p></div>{index<2&&<div className={`mt-1 h-0.5 flex-1 ${index<stageIndex?'bg-blue-600':'bg-slate-200'}`}/>}</React.Fragment>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <a
          onClick={stop}
          href={portalUrl(item)}
          target="_blank"
          rel="noreferrer"
          className="action-card"
        >
          <ExternalLink size={14} />
          Ver no portal
        </a>
        <a
          onClick={stop}
          href={portalUrl(item)}
          target="_blank"
          rel="noreferrer"
          className="action-card"
        >
          <ExternalLink size={14} />
          Participar
        </a>
        <button
          onClick={toggle}
          className={`action-card ${favorite ? "is-favorite" : ""}`}
          aria-pressed={favorite}
        >
          <Bookmark size={14} fill={favorite ? "currentColor" : "none"} />
          {favorite ? "Salvo para análise" : "Salvar para análise"}
        </button>
        <button
          onClick={(event) => show("overview", event)}
          className="action-card"
        >
          <Sparkles size={14} />
          Análise com IA
        </button>
        <button
          onClick={(event) => show("documents", event)}
          className="action-card"
        >
          <FileArchive size={14} />
          Arquivos
        </button>
      </div>
    </article>
  );
};
const OpportunitySkeleton = () => (
  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />
    ))}
  </div>
);
