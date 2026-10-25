import React from "react";
import { Activity, ExternalLink, RefreshCw } from "lucide-react";

const TSE_RESULT_URL = "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json";
const TSE_HOME_URL = "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6258/uf/br/cargo/1/vis/nominal/resultados";
const TSE_CONFIG_URL = "https://resultados.tse.jus.br/oficial/comum/config/ele-c.json";
const REFRESH_INTERVAL = 60_000;

type TseCandidate = { n?: string | number; nm?: string; nmu?: string; sg?: string; vap?: string | number; pvap?: string | number; st?: string; e?: string };
type TseData = {
  dg?: string; hg?: string; dt?: string; ht?: string; and?: string; tf?: string; dv?: string;
  s?: { ts?: string | number; st?: string | number; pst?: string | number };
  e?: { te?: string | number; est?: string | number };
  v?: { tv?: string | number; vv?: string | number; vb?: string | number; vn?: string | number };
  carg?: Array<{ cd?: string | number; agr?: Array<{ par?: Array<{ sg?: string; cand?: TseCandidate[] }> }> }>;
};

const number = (value: string | number | undefined) => Number(String(value ?? 0).replace(",", ".")) || 0;
const integer = (value: string | number | undefined) => new Intl.NumberFormat("pt-BR").format(number(value));
const percent = (value: string | number | undefined) => `${number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function extractCandidates(data: TseData): TseCandidate[] {
  const candidates = (data.carg || []).filter((office) => String(office.cd) === "1")
    .flatMap((office) => office.agr || [])
    .flatMap((group) => group.par || [])
    .flatMap((party) => (party.cand || []).map((candidate) => ({ ...candidate, sg: candidate.sg || party.sg })));
  return candidates.sort((a, b) => number(b.vap) - number(a.vap));
}

export const ElectionResultsPage: React.FC = () => {
  const [data, setData] = React.useState<TseData | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(TSE_RESULT_URL, { signal, cache: "no-cache" });
      if (!response.ok) throw new Error(response.status === 404 ? "O TSE ainda não publicou o próximo boletim desta eleição." : `O TSE respondeu com status ${response.status}.`);
      const result = await response.json() as TseData;
      setData(result);
      setError("");
      setUpdatedAt(new Date());
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar os dados do TSE.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [refresh]);

  const candidates = data ? extractCandidates(data) : [];
  const totalSections = number(data?.s?.ts);
  const countedSections = number(data?.s?.st);
  const sectionPercent = number(data?.s?.pst) || (totalSections ? countedSections / totalSections * 100 : 0);
  const isFinal = data?.and === "f" || data?.tf === "s";
  const resultDate = data?.dg && data?.hg ? `${data.dg} às ${data.hg}` : "aguardando primeiro boletim";

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <a href="/" className="text-sm font-black tracking-[.12em] text-sky-300">BLU · ELEIÇÕES 2026</a>
          <a href={TSE_HOME_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/85 transition hover:bg-white/10">
            Resultado oficial do TSE <ExternalLink size={15}/>
          </a>
        </header>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#102844] via-[#10213a] to-[#10192b] p-6 shadow-2xl sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-sky-300"><Activity size={15}/> Apuração oficial · 2º turno</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Presidente do Brasil</h1>
              <p className="mt-3 text-sm text-slate-300">Acompanhe a totalização dos votos com dados publicados pelo Tribunal Superior Eleitoral.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm">
              <p className="text-xs text-slate-400">Situação</p>
              <p className="mt-1 flex items-center gap-2 font-bold"><span className={`h-2.5 w-2.5 rounded-full ${isFinal ? "bg-emerald-400" : "animate-pulse bg-sky-400"}`}/>{isFinal ? "Totalização finalizada" : "Acompanhamento em andamento"}</p>
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
              <span className="text-xs text-slate-400">Votos · percentual</span>
            </div>
            {loading && !data ? <div className="py-16 text-center text-sm text-slate-400">Conectando aos dados oficiais do TSE…</div>
              : candidates.length ? <div className="divide-y divide-white/10">{candidates.map((candidate, index) => <article key={`${candidate.n}-${candidate.nm}`} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 py-5 sm:grid-cols-[52px_minmax(0,1fr)_140px]">
                <div className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black ${index === 0 ? "bg-sky-400 text-[#061321]" : "bg-white/8 text-white"}`}>{candidate.n || "—"}</div>
                <div className="min-w-0"><h3 className="truncate font-black">{candidate.nmu || candidate.nm || "Candidatura"}</h3><p className="mt-1 text-xs text-slate-400">{candidate.sg || ""}{candidate.st ? ` · ${candidate.st}` : ""}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 sm:hidden"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(number(candidate.pvap), 100)}%` }}/></div></div>
                <div className="text-right"><strong className="block text-lg font-black tabular-nums">{integer(candidate.vap)}</strong><span className="text-sm text-sky-300">{percent(candidate.pvap)}</span><div className="mt-2 hidden h-1.5 overflow-hidden rounded-full bg-white/10 sm:block"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(number(candidate.pvap), 100)}%` }}/></div></div>
              </article>)}</div>
              : <div className="py-12 text-center"><p className="font-bold">{error ? "Os resultados ainda não estão disponíveis." : "Aguardando divulgação oficial."}</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">O TSE publicará os primeiros dados após o encerramento da votação e o início da totalização. Esta página exibirá os números assim que o arquivo oficial for disponibilizado.</p></div>}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1b2b] p-5"><h2 className="font-black">Resumo dos votos</h2><Stat label="Votos válidos" value={data?.v?.vv}/><Stat label="Brancos" value={data?.v?.vb}/><Stat label="Nulos" value={data?.v?.vn}/><Stat label="Total computado" value={data?.v?.tv}/></div>
            <div className="rounded-[1.5rem] border border-sky-300/15 bg-sky-400/5 p-5"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-sky-300"><RefreshCw size={14}/> Atualização automática</div><p className="mt-3 text-sm leading-6 text-slate-300">Consultamos a fonte oficial a cada minuto.</p><p className="mt-3 text-xs text-slate-400">Última consulta: {updatedAt ? updatedAt.toLocaleTimeString("pt-BR") : "—"}</p><p className="mt-1 text-xs text-slate-400">Boletim TSE: {resultDate}</p>{error && <p className="mt-3 rounded-lg bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">{error} <button onClick={() => { setLoading(true); void refresh(); }} className="ml-1 underline">Tentar novamente</button></p>}</div>
            <p className="px-1 text-xs leading-5 text-slate-500">Dados oficiais do TSE. A Blu apenas apresenta as informações publicadas pelo tribunal. Em caso de divergência, prevalece o portal oficial.</p>
          </aside>
        </section>
        <footer className="mt-8 text-center text-xs text-slate-500">Fonte: <a className="underline hover:text-slate-300" href={TSE_CONFIG_URL} target="_blank" rel="noreferrer">arquivos oficiais de resultados do TSE</a> · Eleição 6258 · Cargo 1</footer>
      </div>
    </main>
  );
};

const Metric = ({ label, value, detail, children }: { label: string; value: string; detail?: string; children?: React.ReactNode }) => <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}{children}</div>;
const Stat = ({ label, value }: { label: string; value: string | number | undefined }) => <div className="mt-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-sm last:border-0 last:pb-0"><span className="text-slate-400">{label}</span><strong className="tabular-nums">{value === undefined ? "—" : integer(value)}</strong></div>;
