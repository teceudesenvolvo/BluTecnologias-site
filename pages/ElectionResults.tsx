import React from "react";
import { SecondRoundPartial } from "./SecondRoundPartial";
import { Activity, ArrowRight, ExternalLink, RefreshCw, Search, Scale, X } from "lucide-react";
import { Link } from "react-router-dom";

const TSE_CONFIG_URL = "https://resultados.tse.jus.br/oficial/comum/config/ele-c.json";
const REFRESH_INTERVAL = 60_000;
const APURACAO_HISTORY_KEY = "blu-election-apuracao-history-v1";
const readApuracaoHistory = (): ApuracaoSnapshot[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(APURACAO_HISTORY_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((item) => item && (item.turn === 1 || item.turn === 2) && Number.isFinite(item.timestamp) && Array.isArray(item.candidates)) : [];
  } catch { return []; }
};
const IBGE_STATE_CODES: Record<string, string> = { ac: "12", al: "27", ap: "16", am: "13", ba: "29", ce: "23", df: "53", es: "32", go: "52", ma: "21", mt: "51", ms: "50", mg: "31", pa: "15", pb: "25", pr: "41", pe: "26", pi: "22", rj: "33", rn: "24", rs: "43", ro: "11", rr: "14", sc: "42", sp: "35", se: "28", to: "17" };
const STATE_CODES = [
  ["ac", "Acre"], ["al", "Alagoas"], ["ap", "Amapá"], ["am", "Amazonas"], ["ba", "Bahia"], ["ce", "Ceará"],
  ["df", "Distrito Federal"], ["es", "Espírito Santo"], ["go", "Goiás"], ["ma", "Maranhão"], ["mt", "Mato Grosso"],
  ["ms", "Mato Grosso do Sul"], ["mg", "Minas Gerais"], ["pa", "Pará"], ["pb", "Paraíba"], ["pr", "Paraná"], ["pe", "Pernambuco"],
  ["pi", "Piauí"], ["rj", "Rio de Janeiro"], ["rn", "Rio Grande do Norte"], ["rs", "Rio Grande do Sul"], ["ro", "Rondônia"],
  ["rr", "Roraima"], ["sc", "Santa Catarina"], ["sp", "São Paulo"], ["se", "Sergipe"], ["to", "Tocantins"],
] as const;

type TseCandidate = { n?: string | number; nm?: string; nmu?: string; sg?: string; vap?: string | number; pvap?: string | number; st?: string; e?: string };
type TseData = {
  dg?: string; hg?: string; dt?: string; ht?: string; and?: string; tf?: string; dv?: string; esae?: string;
  s?: { ts?: string | number; st?: string | number; pst?: string | number };
  e?: { te?: string | number; est?: string | number };
  v?: { tv?: string | number; vv?: string | number; vb?: string | number; vn?: string | number };
  carg?: Array<{ cd?: string | number; agr?: Array<{ par?: Array<{ sg?: string; cand?: TseCandidate[] }> }> }>;
};
type StateResult = { uf: string; name: string; data: TseData; candidates: TseCandidate[] };
type ApuracaoSnapshot = { timestamp: number; turn: 1 | 2; sections: number; candidates: Array<{ key: string; name: string; percent: number; votes: number }> };
type Municipality = { code: string; name: string };
type ElectionOfficeKey = "president" | "governor" | "senator" | "federalDeputy" | "stateDeputy";
type ElectionOffice = { key: ElectionOfficeKey; label: string; title: string; code: number; twoRounds: boolean };
const ELECTION_OFFICES: ElectionOffice[] = [
  { key: "president", label: "Presidente", title: "Presidente do Brasil", code: 1, twoRounds: true },
  { key: "governor", label: "Governador", title: "Governador", code: 3, twoRounds: true },
  { key: "senator", label: "Senador", title: "Senador", code: 5, twoRounds: false },
  { key: "federalDeputy", label: "Deputado federal", title: "Deputado federal", code: 6, twoRounds: false },
  { key: "stateDeputy", label: "Deputado estadual/distrital", title: "Deputado estadual/distrital", code: 7, twoRounds: false },
];
type GeoFeature = { type: string; id?: string | number; properties?: Record<string, string | number>; geometry?: { type: string; coordinates: unknown } };
type GeoCollection = { type: string; features: GeoFeature[] };
type AnyMapApi = { map: () => any; scales: { linearColor: (from: string, to: string) => any } };

declare global { interface Window { anychart?: AnyMapApi } }

const number = (value: string | number | undefined) => Number(String(value ?? 0).replace(",", ".")) || 0;
const integer = (value: string | number | undefined) => new Intl.NumberFormat("pt-BR").format(number(value));
const percent = (value: string | number | undefined) => `${number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const electionCode = (turn: 1 | 2) => turn === 1 ? 6257 : 6258;
const resultUrl = (uf: string, electionId: number, officeCode = 1) => {
  const code = uf === "df" && officeCode === 7 ? 8 : officeCode;
  return `https://resultados.tse.jus.br/oficial/ele2026/${electionId}/dados/${uf}/${uf}-c${String(code).padStart(4, "0")}-e${String(electionId).padStart(6, "0")}-u.json`;
};
const officialResultsUrl = (electionId: number, officeCode = 1, uf = "br") => `https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/${electionId}/uf/${uf}/cargo/${officeCode}/vis/nominal/resultados`;
const municipalityConfigUrl = (electionId: number) => `https://resultados.tse.jus.br/oficial/ele2026/${electionId}/config/mun-e${String(electionId).padStart(6, "0")}-cm.json`;
const municipalityResultUrl = (uf: string, code: string, electionId: number) => `https://resultados.tse.jus.br/oficial/ele2026/${electionId}/dados/${uf}/${uf}${code.padStart(5, "0")}-c0001-e${String(electionId).padStart(6, "0")}-u.json`;
const stateMapUrl = (uf: string) => `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf.toUpperCase()}?formato=application/vnd.geo+json&qualidade=minima`;
const municipalityListUrl = (uf: string) => `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
let anyMapLoadPromise: Promise<AnyMapApi> | undefined;

function loadAnyMapScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") { resolve(); return; }
    const script = existing || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => { script.remove(); reject(new Error("Não foi possível carregar AnyMap.")); };
    if (!existing) document.head.appendChild(script);
  });
}

function loadAnyMap(): Promise<AnyMapApi> {
  if (window.anychart?.map) return Promise.resolve(window.anychart);
  if (!anyMapLoadPromise) {
    anyMapLoadPromise = loadAnyMapScript("https://cdn.anychart.com/releases/9.0.0/js/anychart-core.min.js")
      .then(() => loadAnyMapScript("https://cdn.anychart.com/releases/9.0.0/js/anychart-map.min.js"))
      .then(() => {
        if (!window.anychart?.map) throw new Error("AnyMap não ficou disponível após o carregamento.");
        return window.anychart;
      }).catch((error) => { anyMapLoadPromise = undefined; throw error; });
  }
  return anyMapLoadPromise;
}

function readMunicipalities(config: unknown, uf: string): Municipality[] {
  const root = config as { abr?: Array<{ cdabr?: string; cd?: string; nmabr?: string; nm?: string; mu?: Array<{ cd?: string | number; nm?: string }> }> };
  const state = root.abr?.find((item) => String(item.cdabr || item.cd || item.nmabr || item.nm).toLowerCase() === uf);
  return (state?.mu || []).map((item) => ({ code: String(item.cd || "").trim(), name: String(item.nm || "").trim() }))
    .filter((item) => item.code && item.name).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

async function fetchResult(url: string, signal?: AbortSignal) {
  const freshUrl = new URL(url);
  freshUrl.searchParams.set("_", String(Date.now()));
  const response = await fetch(freshUrl, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`TSE ${response.status}`);
  return await response.json() as TseData;
}

function extractCandidates(data: TseData, officeCode = 1): TseCandidate[] {
  const candidates = (data.carg || []).filter((office) => String(office.cd) === String(officeCode))
    .flatMap((office) => office.agr || [])
    .flatMap((group) => group.par || [])
    .flatMap((party) => (party.cand || []).map((candidate) => ({ ...candidate, sg: candidate.sg || party.sg })));
  return candidates.sort((a, b) => number(b.vap) - number(a.vap));
}

export const ElectionResultsPage: React.FC = () => {
  const [selectedTurn, setSelectedTurn] = React.useState<1 | 2>(2);
  const [selectedOfficeKey, setSelectedOfficeKey] = React.useState<ElectionOfficeKey>("president");
  const [officeData, setOfficeData] = React.useState<TseData | null>(null);
  const [officeLoading, setOfficeLoading] = React.useState(false);
  const [officeError, setOfficeError] = React.useState("");
  const [showBluIntro, setShowBluIntro] = React.useState(false);
  React.useEffect(() => {
    try { if (sessionStorage.getItem("blu-election-intro-dismissed") === "1") return; } catch { /* storage disabled */ }
    const timer = window.setTimeout(() => setShowBluIntro(true), 60_000);
    return () => window.clearTimeout(timer);
  }, []);
  const dismissBluIntro = () => { setShowBluIntro(false); try { sessionStorage.setItem("blu-election-intro-dismissed", "1"); } catch { /* storage disabled */ } };
  const [showPartial, setShowPartial] = React.useState(false);
  const [showComparison, setShowComparison] = React.useState(false);
  const [data, setData] = React.useState<TseData | null>(null);
  const [comparisonData, setComparisonData] = React.useState<TseData | null>(null);
  const [comparisonLoading, setComparisonLoading] = React.useState(false);
  const [apuracaoHistory, setApuracaoHistory] = React.useState<ApuracaoSnapshot[]>(readApuracaoHistory);
  const [stateResults, setStateResults] = React.useState<StateResult[]>([]);
  const [selectedUf, setSelectedUf] = React.useState("ac");
  const [stateMap, setStateMap] = React.useState<GeoCollection | null>(null);
  const [stateMapLoading, setStateMapLoading] = React.useState(true);
  const [mapRetry, setMapRetry] = React.useState(0);
  const [mapError, setMapError] = React.useState("");
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [municipalities, setMunicipalities] = React.useState<Municipality[]>([]);
  const [municipalityQuery, setMunicipalityQuery] = React.useState("");
  const [selectedMunicipality, setSelectedMunicipality] = React.useState<Municipality | null>(null);
  const [municipalityData, setMunicipalityData] = React.useState<TseData | null>(null);
  const [municipalitiesLoading, setMunicipalitiesLoading] = React.useState(false);
  const [municipalityLoading, setMunicipalityLoading] = React.useState(false);
  const [municipalityError, setMunicipalityError] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);
  const [checkedAt, setCheckedAt] = React.useState<Date | null>(null);
  const requestInFlight = React.useRef(false);
  const electionId = electionCode(selectedTurn);
  const selectedOffice = ELECTION_OFFICES.find((office) => office.key === selectedOfficeKey) || ELECTION_OFFICES[0];

  React.useEffect(() => {
    if (!showComparison || selectedOfficeKey !== "president") return;
    const controller = new AbortController();
    setComparisonLoading(true);
    setComparisonData(null);
    fetchResult(resultUrl("br", electionCode(selectedTurn === 1 ? 2 : 1)), controller.signal)
      .then((result) => { if (!controller.signal.aborted) setComparisonData(result); })
      .catch(() => { if (!controller.signal.aborted) setComparisonData(null); })
      .finally(() => { if (!controller.signal.aborted) setComparisonLoading(false); });
    return () => controller.abort();
  }, [showComparison, selectedTurn, selectedOfficeKey]);

  React.useEffect(() => {
    if (selectedOfficeKey === "president") {
      setOfficeData(null);
      setOfficeError("");
      return;
    }
    const controller = new AbortController();
    const loadOfficeResults = async () => {
      setOfficeLoading(true);
      setOfficeError("");
      try {
        const code = selectedOfficeKey === "stateDeputy" && selectedUf === "df" ? 8 : selectedOffice.code;
        const result = await fetchResult(resultUrl(selectedUf, electionId, code), controller.signal);
        if (!controller.signal.aborted) setOfficeData(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setOfficeData(null);
          setOfficeError(cause instanceof Error && cause.message === "TSE 404"
            ? "O TSE ainda não publicou resultados para este cargo, turno e UF."
            : "Não foi possível consultar os dados do TSE.");
        }
      } finally {
        if (!controller.signal.aborted) setOfficeLoading(false);
      }
    };
    void loadOfficeResults();
    const timer = window.setInterval(() => void loadOfficeResults(), REFRESH_INTERVAL);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [selectedOfficeKey, selectedUf, electionId, selectedOffice.code]);

  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    if (selectedOfficeKey !== "president") { setLoading(false); return; }
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    try {
      const result = await fetchResult(resultUrl("br", electionId), signal);
      if (signal?.aborted) return;
      setData(result);
      const snapshotCandidates = extractCandidates(result).map((candidate) => ({
        key: String(candidate.n || candidate.nm || ""), name: candidate.nmu || candidate.nm || "Candidatura",
        percent: number(candidate.pvap), votes: number(candidate.vap),
      }));
      const total = number(result.s?.ts);
      const sections = number(result.s?.pst) || (total ? number(result.s?.st) / total * 100 : 0);
      const snapshot: ApuracaoSnapshot = { timestamp: Date.now(), turn: selectedTurn, sections, candidates: snapshotCandidates };
      setApuracaoHistory((previous) => {
        const last = [...previous].reverse().find((item) => item.turn === selectedTurn);
        const changed = !last || last.sections !== snapshot.sections || last.candidates.length !== snapshot.candidates.length || snapshot.candidates.some((candidate) => {
          const old = last.candidates.find((item) => item.key === candidate.key);
          return !old || old.percent !== candidate.percent || old.votes !== candidate.votes;
        });
        if (!changed) return previous;
        const next = [...previous, snapshot].slice(-1000);
        try { window.localStorage.setItem(APURACAO_HISTORY_KEY, JSON.stringify(next)); } catch { /* O histórico da sessão continua disponível em memória. */ }
        return next;
      });
      setError("");
      setUpdatedAt(new Date());
      const stateFiles = await Promise.all(STATE_CODES.map(async ([uf, name]) => {
        try {
          const stateData = await fetchResult(resultUrl(uf, electionId), signal);
          return { uf, name, data: stateData, candidates: extractCandidates(stateData) };
        } catch {
          return null;
        }
      }));
      if (signal?.aborted) return;
      setStateResults(stateFiles.filter((item): item is StateResult => item !== null));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error && cause.message === "TSE 404" ? "O TSE ainda não publicou o próximo boletim desta eleição." : "Não foi possível consultar os dados do TSE.");
    } finally {
      setCheckedAt(new Date());
      setLoading(false);
      requestInFlight.current = false;
    }
  }, [electionId, selectedTurn, selectedOfficeKey]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setStateResults([]);
    void refresh(controller.signal);
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => { controller.abort(); requestInFlight.current = false; window.clearInterval(timer); };
  }, [refresh]);

  React.useEffect(() => {
    const controller = new AbortController();
    setStateMapLoading(true);
    setMapError("");
    const loadMapData = async () => {
      try {
        const stateShapes = await Promise.allSettled(STATE_CODES.map(async ([uf]) => {
          const response = await fetch(stateMapUrl(uf), { signal: controller.signal, cache: "force-cache" });
          if (!response.ok) throw new Error(`${uf.toUpperCase()}: HTTP ${response.status}`);
          const shape = await response.json() as GeoCollection | GeoFeature;
          const features = shape.type === "FeatureCollection" ? (shape as GeoCollection).features : shape.type === "Feature" ? [shape as GeoFeature] : [];
          return { uf, features: features.map((feature) => ({
              ...feature,
              id: uf,
              properties: { ...(feature.properties || {}), codarea: IBGE_STATE_CODES[uf], id: uf, uf },
            })) };
        }));
        const availableShapes = stateShapes.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        const features = availableShapes.flatMap((shape) => shape.features);
        if (!features.length) throw new Error("O IBGE não retornou geometrias estaduais reconhecidas.");
        if (!controller.signal.aborted) {
          setStateMap({ type: "FeatureCollection", features });
          const unavailableCount = STATE_CODES.length - availableShapes.filter((shapes) => shapes.features.length > 0).length;
          if (unavailableCount) setMapError(`A malha de ${unavailableCount} UF(s) não foi carregada; exibindo as demais.`);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStateMap(null);
          setMapError(cause instanceof Error ? cause.message : "Não foi possível consultar o IBGE.");
        }
      } finally {
        if (!controller.signal.aborted) setStateMapLoading(false);
      }
    };
    void loadMapData();
    return () => controller.abort();
  }, [mapRetry]);

  React.useEffect(() => {
    const controller = new AbortController();
    setMunicipalities([]); setMunicipalityQuery(""); setSelectedMunicipality(null); setMunicipalityData(null); setMunicipalityError(""); setMunicipalitiesLoading(true);
    const load = async () => {
      try {
        const [configResponse, ibgeResponse] = await Promise.all([
          fetch(municipalityConfigUrl(electionId), { signal: controller.signal, cache: "no-store" }),
          fetch(municipalityListUrl(selectedUf), { signal: controller.signal, cache: "force-cache" }),
        ]);
        const tseConfig = configResponse.ok ? await configResponse.json() : null;
        const ibgeCities = ibgeResponse.ok ? await ibgeResponse.json() as Array<{ id: number; nome: string }> : [];
        const officialCities = tseConfig ? readMunicipalities(tseConfig, selectedUf) : [];
        const cities = officialCities.length ? officialCities : ibgeCities.map((city) => ({ code: "", name: city.nome })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        if (!controller.signal.aborted) {
          setMunicipalities(cities);
          if (!officialCities.length) setMunicipalityError("A lista de municípios veio do IBGE. O TSE ainda não publicou os códigos desta eleição para consultar resultados municipais.");
        }
      } catch {
        if (!controller.signal.aborted) setMunicipalityError("Não foi possível carregar a lista de municípios.");
      } finally { if (!controller.signal.aborted) setMunicipalitiesLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [selectedUf, electionId]);

  React.useEffect(() => {
    if (!selectedMunicipality?.code) { setMunicipalityData(null); return; }
    const controller = new AbortController(); let active = true;
    const load = async () => {
      setMunicipalityLoading(true);
      try {
        const result = await fetchResult(municipalityResultUrl(selectedUf, selectedMunicipality.code, electionId), controller.signal);
        if (active) { setMunicipalityData(result); setMunicipalityError(""); }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === "AbortError")) {
          setMunicipalityData(null); setMunicipalityError(cause instanceof Error && cause.message === "TSE 404" ? "O TSE ainda não publicou a apuração desta cidade." : "Não foi possível consultar os dados municipais do TSE.");
        }
      } finally { if (active) setMunicipalityLoading(false); }
    };
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_INTERVAL);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [selectedMunicipality, selectedUf, electionId]);

  const mapFeatures = React.useMemo(() => {
    if (!stateMap) return [];
    return stateMap.features.map((feature) => {
      const props = feature.properties || {};
      const rawId = String(props.codarea || props.CD_UF || props.id || feature.id || "").padStart(2, "0");
      const uf = Object.entries(IBGE_STATE_CODES).find(([, id]) => id === rawId)?.[0];
      return uf ? { uf, feature: { ...feature, id: uf, properties: { ...props, id: uf, uf } } } : null;
    }).filter((item): item is { uf: string; feature: GeoFeature } => Boolean(item));
  }, [stateMap]);

  React.useEffect(() => {
    if (!mapContainerRef.current || !mapFeatures.length) return;
    let chart: any;
    let cancelled = false;
    const draw = async () => {
      try {
        const anychart = await loadAnyMap();
        if (cancelled || !mapContainerRef.current) return;
        const chartMap = anychart.map();
        chart = chartMap;
        const featureCollection: GeoCollection = { type: "FeatureCollection", features: mapFeatures.map((item) => item.feature) };
        chartMap.geoData(featureCollection);
        chartMap.background().fill("transparent");
        chartMap.padding(8);
        const stateData = mapFeatures.map(({ uf }) => {
          const state = stateResults.find((item) => item.uf === uf);
          if (!state) return { id: uf, uf, value: 0, tooltipText: `${STATE_CODES.find(([code]) => code === uf)?.[1] || uf.toUpperCase()}\nAguardando arquivo estadual do TSE.` };
          const sections = number(state.data.s?.ts);
          const counted = number(state.data.s?.st);
          const progress = number(state.data.s?.pst) || (sections ? counted / sections * 100 : 0);
          const candidates = state.candidates.slice().sort((a, b) => (a.nmu || a.nm || "").localeCompare(b.nmu || b.nm || "", "pt-BR"));
          const candidateSummary = candidates.map((candidate) => `${candidate.nmu || candidate.nm || "Candidatura"}: ${integer(candidate.vap)} votos (${percent(candidate.pvap)})`).join("\n");
          return { id: state.uf, uf: state.uf, value: progress, tooltipText: `${state.name} (${state.uf.toUpperCase()})\nVotos computados: ${integer(state.data.v?.tv)}\nSeções totalizadas: ${integer(counted)} / ${integer(sections)} (${percent(progress)})${candidateSummary ? `\n\nVotos por candidatura:\n${candidateSummary}` : ""}` };
        });
        const series = chartMap.choropleth(stateData);
        series.colorScale(anychart.scales.linearColor("#082f49", "#38bdf8"));
        series.normal().stroke("#07111f", 1.3);
        series.hovered().fill("#7dd3fc");
        series.tooltip().format(function (event: any) { return event.getData("tooltipText") || "Aguardando arquivo estadual do TSE."; });
        series.listen("pointClick", (event: any) => {
          const uf = String(event.point.getData("uf") || "").toLowerCase();
          if (STATE_CODES.some(([code]) => code === uf)) setSelectedUf(uf);
        });
        chartMap.container(mapContainerRef.current);
        chartMap.draw();
        setMapError("");
      } catch {
        if (!cancelled) setMapError("Não foi possível carregar o mapa AnyMap.");
      }
    };
    void draw();
    return () => { cancelled = true; if (chart?.dispose) chart.dispose(); };
  }, [mapFeatures, stateResults]);

  const candidates = data ? extractCandidates(data) : [];
  const leader = candidates[0];
  const electedPresident = data?.tf === "s" && data.esae !== "s"
    ? candidates.find((candidate) => Boolean(candidate.st && /^eleito(?:\b| por)/i.test(candidate.st)))
    : undefined;
  const selectedState = stateResults.find((state) => state.uf === selectedUf);
  const stateVoteRanking = [...stateResults]
    .map((state) => {
      const totalSections = number(state.data.s?.ts);
      const countedSections = number(state.data.s?.st);
      const progress = number(state.data.s?.pst) || (totalSections ? countedSections / totalSections * 100 : 0);
      return { ...state, totalVotes: number(state.data.v?.tv), progress };
    })
    .filter((state) => state.totalVotes > 0)
    .sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name, "pt-BR"));
  const selectedStateName = STATE_CODES.find(([uf]) => uf === selectedUf)?.[1] || selectedUf.toUpperCase();
  const stateCandidatesAlphabetical = selectedState?.candidates.slice().sort((a, b) => (a.nmu || a.nm || "").localeCompare(b.nmu || b.nm || "", "pt-BR")) || [];
  const visibleMunicipalities = municipalities.filter((municipality) => municipality.name.toLocaleLowerCase("pt-BR").includes(municipalityQuery.toLocaleLowerCase("pt-BR")));
  const totalSections = number(data?.s?.ts);
  const countedSections = number(data?.s?.st);
  const sectionPercent = number(data?.s?.pst) || (totalSections ? countedSections / totalSections * 100 : 0);
  const isFinal = data?.and === "f" || data?.tf === "s";
  const resultDate = data?.dg && data?.hg ? `${data.dg} às ${data.hg}` : "aguardando primeiro boletim";
  const turnHistory = apuracaoHistory.filter((snapshot) => snapshot.turn === selectedTurn);
  const latestSnapshot = turnHistory[turnHistory.length - 1];
  const trackedCandidates = candidates.length
    ? candidates.slice(0, selectedTurn === 2 ? 2 : 5).map((candidate) => ({ key: String(candidate.n || candidate.nm || ""), name: candidate.nmu || candidate.nm || "Candidatura" }))
    : (latestSnapshot?.candidates.slice().sort((a, b) => b.votes - a.votes).slice(0, selectedTurn === 2 ? 2 : 5).map(({ key, name }) => ({ key, name })) || []);
  const historyMax = Math.max(100, ...turnHistory.flatMap((snapshot) => snapshot.candidates.map((candidate) => candidate.percent)));
  const historyColors = ["#38bdf8", "#c4b5fd", "#34d399", "#fbbf24", "#fb7185"];

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        {showBluIntro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020916]/80 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissBluIntro(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="blu-intro-title" aria-describedby="blu-intro-description" className="relative w-full max-w-lg rounded-[2rem] border border-sky-300/20 bg-[#0d1b2b] p-7 shadow-2xl sm:p-9">
              <button type="button" onClick={dismissBluIntro} aria-label="Fechar apresentação da Blu" className="absolute right-5 top-5 rounded-xl border border-white/15 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={19}/></button>
              <p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Tecnologia que aproxima</p>
              <h2 id="blu-intro-title" className="mt-3 pr-10 text-3xl font-black tracking-tight">Conheça a Blu Tecnologias</h2>
              <p id="blu-intro-description" className="mt-4 text-sm leading-7 text-slate-300">Somos uma empresa de tecnologia que desenvolve soluções digitais para empresas e órgãos públicos. Criamos plataformas, aplicativos e ferramentas inteligentes para simplificar processos, melhorar o atendimento e conectar pessoas aos serviços de que precisam.</p>
              <p className="mt-3 text-xs leading-5 text-slate-400">Este painel eleitoral é uma iniciativa da Blu para facilitar o acompanhamento de informações públicas. Os resultados oficiais são fornecidos pelo TSE.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/empresas" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-[#061321] hover:bg-sky-300">Conhecer a Blu <ArrowRight size={16}/></Link>
                <button type="button" onClick={dismissBluIntro} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Fechar</button>
              </div>
            </div>
          </div>
        )}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <a href="/" className="text-sm font-black tracking-[.12em] text-sky-300">BLU · ELEIÇÕES 2026</a>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link to="/empresas" className="hidden text-right sm:block"><span className="block text-xs font-black text-white">Blu Tecnologias</span><span className="text-[10px] text-slate-400">Soluções digitais para empresas e órgãos públicos</span></Link>
            <Link to="/empresas" className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-3 py-2.5 text-xs font-black text-[#061321] transition hover:bg-sky-300 sm:px-4 sm:text-sm">Conheça a Blu <ArrowRight size={14}/></Link>
            <a href={officialResultsUrl(electionId, selectedOfficeKey === "stateDeputy" && selectedUf === "df" ? 8 : selectedOffice.code, selectedOfficeKey === "president" ? "br" : selectedUf)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-white/85 transition hover:bg-white/10 sm:gap-2 sm:px-4 sm:text-sm">
              Resultado oficial do TSE <ExternalLink size={14}/>
            </a>
          </div>
        </header>

        <nav aria-label="Cargo em apuração" className="mt-7 flex flex-wrap gap-2">
          {ELECTION_OFFICES.map((office) => <button key={office.key} type="button" onClick={() => {
            setSelectedOfficeKey(office.key);
            if (!office.twoRounds) setSelectedTurn(1);
            setShowPartial(false);
            setShowComparison(false);
          }} aria-pressed={selectedOfficeKey === office.key} className={`rounded-xl border px-4 py-3 text-sm font-black transition ${selectedOfficeKey === office.key ? "border-sky-300/40 bg-sky-300 text-[#061321]" : "border-white/10 bg-[#0d1b2b] text-slate-300 hover:bg-white/10"}`}>{office.label}</button>)}
        </nav>

        <nav aria-label="Turno da eleição" className="mt-7 inline-flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-[#0d1b2b] p-1.5">
          {([1, 2] as const).map((turn) => {
            const active = !showPartial && !showComparison && selectedTurn === turn;
            const unavailable = turn === 2 && !selectedOffice.twoRounds;
            return <button key={turn} type="button" disabled={unavailable} onClick={() => { setSelectedTurn(turn); setShowPartial(false); setShowComparison(false); }} aria-pressed={active} title={unavailable ? "Este cargo é definido no primeiro turno" : undefined} className={`rounded-xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? "bg-sky-400 text-[#061321] shadow-lg" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>{turn}º turno <span className={`ml-1 hidden text-xs font-medium sm:inline ${active ? "text-[#123047]/75" : "text-slate-500"}`}>{turn === 1 ? "4 de outubro" : unavailable ? "não se aplica" : "25 de outubro"}</span></button>;
          })}
          {selectedOfficeKey === "president" && <>
            <button type="button" onClick={() => { setShowComparison(true); setShowPartial(false); }} aria-pressed={showComparison} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition ${showComparison ? "border-violet-300/40 bg-violet-300 text-[#160b2b] shadow-lg" : "border-violet-300/20 text-violet-200 hover:bg-violet-300/10"}`}><Scale size={15}/>Comparativo</button>
            <button type="button" onClick={() => { setSelectedTurn(2); setShowComparison(false); setShowPartial(true); }} aria-pressed={showPartial} className={`ml-1 rounded-xl border px-5 py-3 text-sm font-black transition ${showPartial ? "border-amber-300/40 bg-amber-300 text-[#221600] shadow-lg" : "border-amber-300/20 text-amber-200 hover:bg-amber-300/10"}`}>Parcial 2º turno · exterior</button>
          </>}
        </nav>

        {selectedOfficeKey !== "president" ? <>
          <section className="mt-10 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#102844] via-[#10213a] to-[#10192b] p-6 shadow-2xl sm:p-9">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-sky-300"><Activity size={15}/>Apuração oficial · {selectedTurn}º turno</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{selectedOffice.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Resumo da totalização oficial do TSE por unidade da federação. Consulte a página oficial para ver os detalhes das candidaturas.</p>
          </section>
          <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Unidade da federação</p><h2 className="mt-1 text-xl font-black">Selecione o estado</h2></div><span className="text-xs text-slate-400">{selectedUf.toUpperCase()} · atualização automática a cada minuto</span></div>
            <div className="mt-4 flex flex-wrap gap-2">{STATE_CODES.map(([uf, name]) => <button key={uf} type="button" onClick={() => setSelectedUf(uf)} aria-pressed={selectedUf === uf} aria-label={name} className={`rounded-lg px-3 py-2 text-xs font-black transition ${selectedUf === uf ? "bg-sky-300 text-[#061321]" : "bg-white/8 text-slate-300 hover:bg-white/15"}`}>{uf.toUpperCase()}</button>)}</div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5"><div><h3 className="text-lg font-black">{STATE_CODES.find(([uf]) => uf === selectedUf)?.[1]} · {selectedOffice.title}</h3><p className="mt-1 text-xs text-slate-400">{selectedOffice.twoRounds ? "Este cargo pode ter segundo turno quando aplicável." : "Este cargo é definido no primeiro turno."}</p></div><a href={officialResultsUrl(electionId, selectedOfficeKey === "stateDeputy" && selectedUf === "df" ? 8 : selectedOffice.code, selectedUf)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white/85 transition hover:bg-white/10">Abrir no TSE <ExternalLink size={14}/></a></div>
            {officeLoading ? <div className="grid min-h-44 place-items-center text-sm text-slate-400"><RefreshCw size={19} className="animate-spin"/></div> : officeError ? <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-amber-100">{officeError}</p> : officeData ? <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Seções apuradas" value={`${integer(officeData.s?.st)} / ${integer(officeData.s?.ts)}`} detail={`${percent(officeData.s?.pst)} do total`} /><Metric label="Votos computados" value={integer(officeData.v?.tv)} /><Metric label="Votos válidos" value={integer(officeData.v?.vv)} /></div>
              <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-5 text-slate-400">O detalhamento oficial das candidaturas e da votação está disponível no TSE pelo botão “Abrir no TSE”.</p>
            </> : <p className="mt-5 py-10 text-center text-sm text-slate-400">Os resultados deste cargo ainda não estão disponíveis.</p>}
          </section>
        </> : showPartial ? <SecondRoundPartial /> : showComparison ? <>
          <section className="mt-10 rounded-[2rem] border border-violet-300/20 bg-gradient-to-br from-[#21183a] via-[#151d35] to-[#10192b] p-6 shadow-2xl sm:p-9">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-violet-200"><Scale size={15}/>Comparação de resultados oficiais</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Comparativo entre os turnos</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Valores publicados pelo TSE para cada turno. A variação em votos é calculada como 2º turno menos 1º turno; percentuais usam os votos válidos de cada turno.</p>
          </section>
          {(() => {
            const firstTurn = selectedTurn === 1 ? data : comparisonData;
            const secondTurn = selectedTurn === 2 ? data : comparisonData;
            const firstCandidates = firstTurn ? extractCandidates(firstTurn) : [];
            const secondCandidates = secondTurn ? extractCandidates(secondTurn) : [];
            const byNumber = new Map<string, { first?: TseCandidate; second?: TseCandidate }>();
            firstCandidates.forEach((candidate) => { const key = String(candidate.n || candidate.nm || ""); byNumber.set(key, { ...byNumber.get(key), first: candidate }); });
            secondCandidates.forEach((candidate) => { const key = String(candidate.n || candidate.nm || ""); byNumber.set(key, { ...byNumber.get(key), second: candidate }); });
            const secondTurnCandidates = secondCandidates.length ? secondCandidates : firstCandidates;
            const rows = secondTurnCandidates.slice(0, 2).map((candidate) => byNumber.get(String(candidate.n || candidate.nm || "")) || { second: candidate });
            const delta = (second: string | number | undefined, first: string | number | undefined) => number(second) - number(first);
            const formatDelta = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${integer(Math.abs(value))}`;
            const firstTurnPair = rows.flatMap(({ first }) => first ? [first] : []);
            const secondTurnPair = rows.flatMap(({ second }) => second ? [second] : []);
            const firstTurnDifference = firstTurnPair.length === 2 ? Math.abs(number(firstTurnPair[0].vap) - number(firstTurnPair[1].vap)) : null;
            const secondTurnDifference = secondCandidates.length && secondTurnPair.length === 2 ? Math.abs(number(secondTurnPair[0].vap) - number(secondTurnPair[1].vap)) : null;
            const describeDifference = (pair: TseCandidate[], difference: number | null) => {
              if (difference === null || pair.length !== 2) return "Aguardando os resultados das duas candidaturas";
              const ahead = number(pair[0].vap) >= number(pair[1].vap) ? pair[0] : pair[1];
              return `${ahead.nmu || ahead.nm || "Candidatura"} à frente por ${integer(difference)} votos`;
            };
            return <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Presidência · Brasil</p><h2 className="mt-1 text-xl font-black">Votos por candidatura</h2></div><span className="text-xs text-slate-400">1º turno × 2º turno</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Diferença entre os dois candidatos · 1º turno</p><p className="mt-2 text-xl font-black tabular-nums">{firstTurnDifference === null ? "—" : `${integer(firstTurnDifference)} votos`}</p><p className="mt-1 text-xs text-slate-400">{describeDifference(firstTurnPair, firstTurnDifference)}</p></div>
                <div className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Diferença entre os dois candidatos · 2º turno</p><p className="mt-2 text-xl font-black tabular-nums">{secondTurnDifference === null ? "—" : `${integer(secondTurnDifference)} votos`}</p><p className="mt-1 text-xs text-slate-400">{describeDifference(secondTurnPair, secondTurnDifference)}</p></div>
              </div>
              {comparisonLoading && !comparisonData ? <p className="py-12 text-center text-sm text-slate-400">Consultando dados do outro turno no TSE…</p> : rows.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-white/10 text-xs text-slate-400"><th className="px-3 py-3 font-semibold">Candidatura</th><th className="px-3 py-3 text-right font-semibold">1º turno · votos</th><th className="px-3 py-3 text-right font-semibold">1º turno · %</th><th className="px-3 py-3 text-right font-semibold">2º turno · votos</th><th className="px-3 py-3 text-right font-semibold">2º turno · %</th><th className="px-3 py-3 text-right font-semibold">Variação em votos</th></tr></thead><tbody>{rows.map(({ first, second }) => { const candidate = second || first!; const change = delta(second?.vap, first?.vap); return <tr key={candidate.n || candidate.nm} className="border-b border-white/5 last:border-0"><th scope="row" className="px-3 py-4 font-semibold">{candidate.nmu || candidate.nm || "Candidatura"}<span className="ml-2 text-xs text-slate-500">{candidate.sg || (candidate.n ? `nº ${candidate.n}` : "")}</span></th><td className="px-3 py-4 text-right tabular-nums">{first ? integer(first.vap) : "—"}</td><td className="px-3 py-4 text-right tabular-nums text-slate-300">{first ? percent(first.pvap) : "—"}</td><td className="px-3 py-4 text-right tabular-nums">{second ? integer(second.vap) : "—"}</td><td className="px-3 py-4 text-right tabular-nums text-slate-300">{second ? percent(second.pvap) : "—"}</td><td className={`px-3 py-4 text-right font-bold tabular-nums ${change > 0 ? "text-sky-300" : change < 0 ? "text-amber-200" : "text-slate-300"}`}>{first && second ? formatDelta(change) : "—"}</td></tr>; })}</tbody><tfoot><tr className="border-t border-white/10 font-bold"><th className="px-3 py-4">Votos válidos</th><td className="px-3 py-4 text-right tabular-nums">{firstTurn?.v?.vv ? integer(firstTurn.v.vv) : "—"}</td><td></td><td className="px-3 py-4 text-right tabular-nums">{secondTurn?.v?.vv ? integer(secondTurn.v.vv) : "—"}</td><td></td><td className="px-3 py-4 text-right tabular-nums">{firstTurn?.v?.vv && secondTurn?.v?.vv ? formatDelta(delta(secondTurn.v.vv, firstTurn.v.vv)) : "—"}</td></tr></tfoot></table></div> : <p className="py-12 text-center text-sm text-slate-400">Os resultados de um ou dos dois turnos ainda não estão disponíveis no TSE.</p>}
              <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-5 text-slate-500">Fonte: arquivos oficiais de resultados do TSE. Diferenças entre turnos refletem totais de votações distintas e não indicam transferência individual de votos.</p>
            </section>;
          })()}
        </> : <>
        <section className="mt-10 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#102844] via-[#10213a] to-[#10192b] p-6 shadow-2xl sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-sky-300"><Activity size={15}/> Apuração oficial · {selectedTurn}º turno</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Presidente do Brasil</h1>
              <p className="mt-3 text-sm text-slate-300">Acompanhe a totalização dos votos com dados publicados pelo Tribunal Superior Eleitoral.</p>
            </div>
            <div className={`min-w-56 rounded-2xl border px-4 py-3 text-sm ${electedPresident ? "border-emerald-300/25 bg-emerald-400/10" : "border-white/10 bg-black/15"}`}>
              <p className={`text-xs font-bold ${electedPresident ? "text-emerald-300" : "text-slate-400"}`}>{electedPresident ? "Presidente eleito · resultado oficial" : leader ? "1º colocado · apuração parcial" : "Situação"}</p>
              <p className="mt-1 flex items-center gap-2 font-black"><span className={`h-2.5 w-2.5 rounded-full ${electedPresident ? "bg-emerald-400" : "animate-pulse bg-sky-400"}`}/>{electedPresident?.nmu || electedPresident?.nm || leader?.nmu || leader?.nm || (isFinal ? "Totalização finalizada" : "Acompanhamento em andamento")}</p>
              {(electedPresident || leader) && <p className={`mt-1 pl-4 text-xs tabular-nums ${electedPresident ? "text-emerald-200/80" : "text-slate-400"}`}>{integer((electedPresident || leader)?.vap)} votos · {percent((electedPresident || leader)?.pvap)}</p>}
            </div>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            <Metric label="Seções totalizadas" value={totalSections ? `${integer(countedSections)} / ${integer(totalSections)}` : "Aguardando dados"}/>
            <Metric label="Progresso da totalização" value={percent(sectionPercent)}>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${Math.min(sectionPercent, 100)}%` }}/></div>
            </Metric>
            <Metric label="Eleitorado" value={data?.e?.te ? integer(data.e.te) : "—"} detail={data?.e?.est ? `${integer(data.e.est)} em seções totalizadas` : undefined}/>
          </div>
        </section>

        <section className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Votação nominal</p><h2 className="mt-1 text-xl font-black">Candidaturas à Presidência</h2></div>
              <span className="text-xs text-slate-400">{selectedTurn === 2 ? "Ranking parcial por votos válidos · dados do TSE" : "Votos · percentual"}</span>
            </div>
            {loading && !data ? <div className="py-16 text-center text-sm text-slate-400">Conectando aos dados oficiais do TSE…</div>
              : candidates.length ? <div className="divide-y divide-white/10">{candidates.map((candidate, index) => <article key={`${candidate.n}-${candidate.nm}`} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 py-5 sm:grid-cols-[52px_minmax(0,1fr)_140px]">
                <div className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black ${index === 0 ? "bg-sky-400 text-[#061321]" : "bg-white/8 text-white"}`}>{index + 1}º</div>
                <div className="min-w-0"><h3 className="truncate font-black">{candidate.nmu || candidate.nm || "Candidatura"}</h3><p className="mt-1 text-xs text-slate-400">{candidate.n ? `Número ${candidate.n}` : ""}{candidate.sg ? ` · ${candidate.sg}` : ""}{candidate.st ? ` · ${candidate.st}` : ""}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 sm:hidden"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(number(candidate.pvap), 100)}%` }}/></div></div>
                <div className="text-right"><strong className="block text-lg font-black tabular-nums">{integer(candidate.vap)}</strong><span className="text-sm text-sky-300">{percent(candidate.pvap)}</span><div className="mt-2 hidden h-1.5 overflow-hidden rounded-full bg-white/10 sm:block"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(number(candidate.pvap), 100)}%` }}/></div></div>
              </article>)}</div>
              : <div className="py-12 text-center"><p className="font-bold">{error ? "Os resultados ainda não estão disponíveis." : "Aguardando divulgação oficial."}</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">O TSE publicará os primeiros dados após o encerramento da votação e o início da totalização. Esta página exibirá os números assim que o arquivo oficial for disponibilizado.</p></div>}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1b2b] p-5"><h2 className="font-black">Resumo dos votos</h2><Stat label="Votos válidos" value={data?.v?.vv}/><Stat label="Brancos" value={data?.v?.vb}/><Stat label="Nulos" value={data?.v?.vn}/><Stat label="Total computado" value={data?.v?.tv}/></div>
            <div className="rounded-[1.5rem] border border-sky-300/15 bg-sky-400/5 p-5"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-sky-300"><RefreshCw size={14}/> Atualização automática</div><p className="mt-3 text-sm leading-6 text-slate-300">Consultamos os dados oficiais do TSE a cada minuto, sem reutilizar o cache do navegador.</p><p className="mt-3 text-xs text-slate-400">Última consulta: {checkedAt ? checkedAt.toLocaleTimeString("pt-BR") : "—"}</p><p className="mt-1 text-xs text-slate-400">Dados atualizados: {updatedAt ? updatedAt.toLocaleTimeString("pt-BR") : "aguardando primeiro boletim"}</p><p className="mt-1 text-xs text-slate-400">Boletim TSE: {resultDate}</p>{error && <p className="mt-3 rounded-lg bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">{error} <button onClick={() => { setLoading(true); void refresh(); }} className="ml-1 underline">Tentar novamente</button></p>}</div>
            <p className="px-1 text-xs leading-5 text-slate-500">Dados oficiais do TSE. A Blu apenas apresenta as informações publicadas pelo tribunal. Em caso de divergência, prevalece o portal oficial.</p>
          </aside>
        </section>

        <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Gráfico nacional</p><h2 className="mt-1 text-xl font-black">Votos por candidatura</h2></div><span className="text-xs text-slate-400">Percentual dos votos computados</span></div>
          {candidates.length ? <div className="mt-5 space-y-5">{candidates.map((candidate, index) => <div key={`chart-${candidate.n}-${candidate.nm}`} className="grid gap-2 sm:grid-cols-[190px_minmax(0,1fr)_130px] sm:items-center"><div className="min-w-0"><span className="block truncate text-sm font-bold">{candidate.nmu || candidate.nm}</span><span className="text-xs text-slate-400">{candidate.sg || `Número ${candidate.n || "—"}`}</span></div><div className="h-4 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full transition-all ${index === 0 ? "bg-sky-400" : "bg-violet-400"}`} style={{ width: `${Math.max(number(candidate.pvap) ? Math.min(number(candidate.pvap), 100) : 0, 0)}%` }}/></div><div className="flex justify-between gap-2 text-sm tabular-nums sm:block sm:text-right"><strong>{percent(candidate.pvap)}</strong><span className="ml-2 text-slate-400">{integer(candidate.vap)} votos</span></div></div>)}</div>
            : <p className="py-8 text-center text-sm text-slate-400">O gráfico será preenchido quando o TSE publicar a votação.</p>}
        </section>

        <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7" aria-labelledby="apuracao-history-title">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Evolução da apuração</p><h2 id="apuracao-history-title" className="mt-1 text-xl font-black">Percentual de votos ao longo do tempo</h2></div>
            <span className="text-xs text-slate-400">{turnHistory.length} capturas salvas · {selectedTurn}º turno</span>
          </div>
          {turnHistory.length > 1 && trackedCandidates.length ? <>
            <div className="mt-5 overflow-x-auto">
              <svg viewBox="0 0 900 300" className="h-64 min-w-[680px] w-full" role="img" aria-label={`Evolução dos percentuais de votação nas últimas ${turnHistory.length} capturas do ${selectedTurn}º turno`}>
                {[0, 25, 50, 75, 100].map((tick) => { const y = 270 - tick / historyMax * 240; return <g key={tick}><line x1="58" x2="885" y1={y} y2={y} stroke="rgba(255,255,255,.08)"/><text x="48" y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{tick}%</text></g>; })}
                {trackedCandidates.map((candidate, candidateIndex) => {
                  const points = turnHistory.map((snapshot, index) => {
                    const value = snapshot.candidates.find((item) => item.key === candidate.key)?.percent;
                    const x = 58 + index / (turnHistory.length - 1) * 827;
                    return { x, y: 270 - (value ?? 0) / historyMax * 240, value, snapshot };
                  }).filter((point) => point.value !== undefined);
                  if (!points.length) return null;
                  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
                  return <g key={candidate.key}><path d={path} fill="none" stroke={historyColors[candidateIndex]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{points.map((point) => <circle key={`${point.snapshot.timestamp}-${candidate.key}`} cx={point.x} cy={point.y} r="4" fill={historyColors[candidateIndex]}><title>{`${candidate.name}: ${percent(point.value)} · ${new Date(point.snapshot.timestamp).toLocaleString("pt-BR")}`}</title></circle>)}</g>;
                })}
                <text x="58" y="294" fill="#94a3b8" fontSize="11">{new Date(turnHistory[0].timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</text>
                <text x="885" y="294" textAnchor="end" fill="#94a3b8" fontSize="11">{new Date(turnHistory[turnHistory.length - 1].timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</text>
              </svg>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{trackedCandidates.map((candidate, index) => <span key={candidate.key} className="inline-flex items-center gap-2 text-xs text-slate-300"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: historyColors[index] }}/>{candidate.name}</span>)}</div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Capturas dos arquivos oficiais do TSE salvas neste navegador quando os resultados mudam. A consulta ocorre a cada minuto e o histórico permanece disponível neste dispositivo.</p>
          </> : <div className="py-10 text-center"><p className="text-sm font-semibold text-slate-300">{turnHistory.length ? "Aguardando mudanças nos resultados para desenhar a evolução." : "O gráfico será criado após a primeira captura dos dados do TSE."}</p><p className="mt-2 text-xs text-slate-500">As capturas são salvas neste navegador quando os resultados mudam.</p></div>}
        </section>

        <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7" aria-labelledby="state-votes-title">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Apuração por UF</p><h2 id="state-votes-title" className="mt-1 text-xl font-black">Percentual apurado por estado</h2></div>
            <span className="text-xs text-slate-400">Ordenado por seções totalizadas · {stateVoteRanking.length} UFs</span>
          </div>
          {stateVoteRanking.length ? <div className="mt-6 space-y-3" role="list" aria-label="Estados ordenados por votos apurados">
            {stateVoteRanking.map((state) => {
              const progress = state.progress;
              return <div key={state.uf} role="listitem" className="grid grid-cols-[minmax(74px,110px)_minmax(0,1fr)_auto] items-center gap-3 sm:gap-5">
                <div className="min-w-0"><span className="block truncate text-sm font-bold">{state.name}</span><span className="text-[10px] font-black uppercase text-slate-500">{state.uf}</span></div>
                <div className="h-5 overflow-hidden rounded-md bg-white/8" role="progressbar" aria-label={`${state.name}: ${percent(progress)} das seções totalizadas`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(progress, 100)}>
                  <div className="h-full min-w-1 rounded-md bg-gradient-to-r from-sky-600 to-sky-300 transition-all" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
                </div>
                <div className="w-24 text-right sm:w-36"><strong className="block text-sm tabular-nums sm:text-base">{percent(progress)}</strong><span className="text-[10px] text-slate-500 sm:text-xs">{integer(state.data.s?.st)} / {integer(state.data.s?.ts)} seções</span></div>
              </div>;
            })}
          </div> : <p className="py-8 text-center text-sm text-slate-400">Os dados estaduais serão exibidos assim que o TSE publicar os arquivos de apuração.</p>}
          <p className="mt-5 border-t border-white/8 pt-4 text-xs text-slate-500">Barras proporcionais ao percentual de seções totalizadas em cada estado. Dados oficiais do TSE, atualizados junto com a apuração.</p>
        </section>

        <section className="mt-7 rounded-[1.75rem] border border-white/10 bg-[#0d1b2b] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Abrangência estadual</p><h2 className="mt-1 text-xl font-black">Mapa e apuração por município</h2></div><span className="text-xs text-slate-400">Selecione uma UF para consultar as cidades</span></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
            <div className="rounded-2xl border border-white/8 bg-black/10 p-3 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-300">Mapa AnyMap · Brasil</p><p className="mt-1 text-lg font-black">{selectedStateName} <span className="text-slate-400">· {selectedUf.toUpperCase()}</span></p></div>{selectedState && <p className="text-right text-xs text-slate-400">Seções: {integer(selectedState.data.s?.st)} / {integer(selectedState.data.s?.ts)}<span className="block text-sky-300">{percent(selectedState.data.s?.pst)}</span></p>}</div>
              {mapFeatures.length ? <div ref={mapContainerRef} role="group" aria-label="Mapa interativo AnyMap das unidades federativas do Brasil" className="mt-3 w-full" style={{ height: 360 }} /> : <div className="grid h-72 place-items-center text-center text-sm text-slate-400">{stateMapLoading ? "Carregando a malha geográfica do IBGE…" : <div><p className="text-amber-200">Não foi possível carregar o mapa dos estados.</p><p className="mt-2 text-xs text-slate-500">{mapError || "A malha do IBGE não retornou unidades federativas reconhecidas."}</p><button type="button" onClick={() => setMapRetry((attempt) => attempt + 1)} className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">Tentar novamente</button></div>}</div>}
              {mapFeatures.length > 0 && mapError && <p className="mt-2 text-center text-xs text-amber-200">{mapError} <button type="button" onClick={() => setMapRetry((attempt) => attempt + 1)} className="ml-1 underline">Tentar novamente</button></p>}
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">{STATE_CODES.map(([uf]) => <button key={uf} type="button" onClick={() => setSelectedUf(uf)} aria-pressed={selectedUf === uf} className={`rounded-md px-2 py-1 text-[10px] font-black transition ${selectedUf === uf ? "bg-sky-300 text-[#061321]" : "bg-white/8 text-slate-300 hover:bg-white/15"}`}>{uf.toUpperCase()}</button>)}</div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-white/8 pt-3 text-[10px] text-slate-400"><span className="font-semibold uppercase tracking-wide">Progresso das seções</span><span>menor</span><i className="h-2.5 w-24 rounded-sm bg-gradient-to-r from-sky-950 to-sky-300"/><span>maior</span></div>
              <p className="mt-3 text-center text-[11px] text-slate-500">Malha geográfica: IBGE · Dados de apuração: TSE</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4 sm:p-5">
              <div className="mb-5 border-b border-white/8 pb-4">
                <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Votos por candidatura</p><h3 className="mt-1 font-black">{selectedStateName}</h3></div>{selectedState && <p className="text-right text-xs text-slate-400">Votos computados<strong className="ml-2 text-sm text-white">{integer(selectedState.data.v?.tv)}</strong></p>}</div>
                {selectedState ? stateCandidatesAlphabetical.length ? <div className="mt-3 divide-y divide-white/8">{stateCandidatesAlphabetical.map((candidate) => <div key={`${selectedUf}-${candidate.n}-${candidate.nm}`} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><strong className="font-semibold">{candidate.nmu || candidate.nm}</strong><span className="ml-2 text-xs text-slate-400">{candidate.sg || ""}</span></span><span className="shrink-0 text-right tabular-nums"><strong>{integer(candidate.vap)}</strong><span className="ml-2 text-xs text-slate-400">{percent(candidate.pvap)}</span></span></div>)}</div> : <p className="mt-3 text-sm text-slate-400">Votos estaduais aguardando publicação pelo TSE.</p> : <p className="mt-3 text-sm text-slate-400">Aguardando arquivo estadual do TSE.</p>}
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-300">Municípios · {selectedUf.toUpperCase()}</p><h3 className="mt-1 text-xl font-black">{selectedStateName}</h3><p className="mt-1 text-xs text-slate-400">Lista em ordem alfabética</p></div><span className="rounded-lg bg-white/8 px-2.5 py-1.5 text-xs font-bold text-slate-300">{municipalities.length} cidades</span></div>
              <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[#07111f] px-3 py-2.5"><Search size={15} className="shrink-0 text-slate-400"/><input value={municipalityQuery} onChange={(event) => setMunicipalityQuery(event.target.value)} placeholder="Buscar município" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" aria-label="Buscar município"/></label>
              <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-white/8" aria-label={`Municípios de ${selectedStateName}`}>
                {municipalitiesLoading ? <p className="p-4 text-sm text-slate-400">Carregando municípios…</p> : visibleMunicipalities.length ? visibleMunicipalities.map((municipality) => <button key={`${municipality.code}-${municipality.name}`} type="button" onClick={() => { setSelectedMunicipality(municipality); setMunicipalityData(null); }} aria-pressed={selectedMunicipality?.name === municipality.name} className={`flex w-full items-center justify-between gap-3 border-b border-white/8 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-white/5 ${selectedMunicipality?.name === municipality.name ? "bg-sky-400/10 text-sky-200" : "text-slate-200"}`}><span>{municipality.name}</span><span className="text-[10px] text-slate-500">{selectedMunicipality?.name === municipality.name ? "Selecionado" : "Ver dados"}</span></button>) : <p className="p-4 text-sm text-slate-400">{municipalities.length ? "Nenhum município encontrado." : "Lista municipal indisponível."}</p>}
              </div>
              {municipalityError && <p className="mt-3 rounded-lg bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">{municipalityError}</p>}
              {selectedMunicipality && <div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-300">Dados municipais</p><h4 className="mt-1 font-black">{selectedMunicipality.name}</h4></div>{municipalityData && <p className="text-right text-xs text-slate-400">Seções: {integer(municipalityData.s?.st)} / {integer(municipalityData.s?.ts)}<span className="block text-sky-300">{percent(municipalityData.s?.pst)}</span></p>}</div>
                {municipalityLoading ? <p className="mt-3 text-sm text-slate-400">Consultando apuração oficial…</p> : municipalityData ? <div className="mt-3 divide-y divide-white/8">{extractCandidates(municipalityData).sort((a, b) => (a.nmu || a.nm || "").localeCompare(b.nmu || b.nm || "", "pt-BR")).map((candidate) => <div key={`${candidate.n}-${candidate.nm}`} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><strong className="font-semibold">{candidate.nmu || candidate.nm}</strong><span className="ml-2 text-xs text-slate-400">{candidate.sg || ""}</span></span><span className="shrink-0 text-right tabular-nums"><strong>{integer(candidate.vap)}</strong><span className="ml-2 text-xs text-slate-400">{percent(candidate.pvap)}</span></span></div>)}</div> : <p className="mt-3 text-sm leading-5 text-slate-400">{selectedMunicipality.code ? "Aguardando publicação do arquivo municipal do TSE." : "A cidade está na base do IBGE; aguardando o código municipal desta eleição na configuração do TSE."}</p>}
              </div>}
            </div>
          </div>
        </section>
        </>}
        <footer className="mt-8 text-center text-xs text-slate-500">Fontes: <a className="underline hover:text-slate-300" href={TSE_CONFIG_URL} target="_blank" rel="noreferrer">arquivos oficiais de resultados do TSE</a> · <a className="underline hover:text-slate-300" href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" target="_blank" rel="noreferrer">malha geográfica do IBGE</a> · Eleição {electionId} · Cargo {selectedOfficeKey === "stateDeputy" && selectedUf === "df" ? 8 : selectedOffice.code}</footer>
      </div>
    </main>
  );
};

const Metric = ({ label, value, detail, children }: { label: string; value: string; detail?: string; children?: React.ReactNode }) => <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}{children}</div>;
const Stat = ({ label, value }: { label: string; value: string | number | undefined }) => <div className="mt-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-sm last:border-0 last:pb-0"><span className="text-slate-400">{label}</span><strong className="tabular-nums">{value === undefined ? "—" : integer(value)}</strong></div>;
