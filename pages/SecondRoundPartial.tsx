import React from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

type Candidate = { nm?: string; vap?: string | number; pvap?: string | number; n?: string | number };
type Result = {
  dg?: string; hg?: string; dt?: string; ht?: string;
  s?: { ts?: string | number; st?: string | number; pst?: string | number };
  carg?: Array<{ cd?: string | number; agr?: Array<{ par?: Array<{ cand?: Candidate[] }> }> }>;
};
const base = "https://resultados.tse.jus.br/oficial/ele2026";
const url = (turn: number, place: string) => `${base}/${turn}/dados/${place}/${place}-c0001-e${String(turn).padStart(6, "0")}-u.json`;
const candidates = (data: Result | null) => (data?.carg || []).filter(c => String(c.cd) === "1").flatMap(c => c.agr || []).flatMap(a => a.par || []).flatMap(p => p.cand || []);
const num = (v: string | number | undefined) => Number(String(v ?? "0").replace(",", ".")) || 0;
const fmt = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
async function read(turn: number, place: string, signal: AbortSignal): Promise<Result> {
  const response = await fetch(url(turn, place) + "?_=" + Date.now(), { cache: "no-store", signal });
  if (!response.ok) throw new Error("TSE " + response.status);
  return response.json();
}

export const SecondRoundPartial: React.FC = () => {
  const [results, setResults] = React.useState<Record<string, Result>>({});
  const [checked, setChecked] = React.useState<Date | null>(null);
  const [error, setError] = React.useState("");
  const refresh = React.useCallback(async (signal: AbortSignal) => {
    const entries = await Promise.allSettled([
      read(6258, "br", signal), read(6258, "zz", signal),
      read(6257, "br", signal), read(6257, "zz", signal),
    ]);
    if (signal.aborted) return;
    const keys = ["secondBrazil", "secondExterior", "firstBrazil", "firstExterior"];
    const next: Record<string, Result> = {};
    entries.forEach((entry, i) => { if (entry.status === "fulfilled") next[keys[i]] = entry.value; });
    setResults(previous => ({ ...previous, ...next }));
    setError(entries[0].status === "rejected" ? "A totalização nacional ainda não está disponível nesta consulta ao TSE." : "");
    setChecked(new Date());
  }, []);
  React.useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(() => void refresh(controller.signal), 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [refresh]);
  const current = results.secondBrazil;
  const sections = current?.s;
  const rows = candidates(current).map(candidate => {
    const first = candidates(results.firstBrazil).find(other => String(other.n) === String(candidate.n));
    return { candidate, votes: num(candidate.vap), firstVotes: first ? num(first.vap) : null };
  }).sort((a, b) => b.votes - a.votes);
  const total = rows.reduce((sum, row) => sum + row.votes, 0);
  return (
    <section className="mt-10 space-y-6" aria-label="Parcial oficial do segundo turno">
      <div className="rounded-[2rem] border border-white/10 bg-[#10213a] p-6 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Dados oficiais · TSE</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Parcial 2º turno</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">Totalização oficial do Brasil, atualizada automaticamente a cada 60 segundos. O resultado nacional já inclui o exterior; não somamos as duas abrangências.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-bold text-sky-200"><RefreshCw size={14}/> Atualização automática</span>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><p className="text-xs text-slate-400">Votos dos candidatos · Brasil</p><p className="mt-2 text-3xl font-black">{current ? fmt(total) : "Aguardando"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><p className="text-xs text-slate-400">Seções totalizadas</p><p className="mt-2 text-3xl font-black">{sections ? pct(num(sections.pst)) : "—"}</p><p className="mt-1 text-xs text-slate-400">{sections ? `${fmt(num(sections.st))} de ${fmt(num(sections.ts))}` : "Aguardando TSE"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><p className="text-xs text-slate-400">Última publicação do TSE</p><p className="mt-2 text-lg font-bold">{current ? [current.dg || current.dt, current.hg || current.ht].filter(Boolean).join(" · ") || "Não informado" : "Aguardando"}</p><p className="mt-1 text-xs text-slate-400">Consulta: {checked?.toLocaleTimeString("pt-BR") || "—"}</p></div>
        </div>
        {error && <p className="mt-4 text-sm text-amber-200">{error}</p>}
        <div className="mt-7 space-y-5">
          {rows.map(({ candidate, votes, firstVotes }) => {
            const share = num(candidate.pvap) || (total ? votes / total * 100 : 0);
            return <div key={String(candidate.n)} className="rounded-2xl border border-white/10 bg-black/15 p-5">
              <div className="flex flex-wrap justify-between gap-2"><strong>{candidate.nm}</strong><span>{fmt(votes)} votos · {pct(share)}</span></div>
              <div className="mt-3 h-4 overflow-hidden rounded-lg bg-white/10"><div className="h-full rounded-lg bg-sky-400" style={{ width: `${Math.max(0, Math.min(100, share))}%` }}/></div>
              <p className="mt-3 text-xs text-slate-400">1º turno nacional: {firstVotes === null ? "Aguardando dados oficiais" : fmt(firstVotes) + " votos"} · Diferença absoluta entre turnos: {firstVotes === null ? "—" : fmt(votes - firstVotes)} votos</p>
            </div>;
          })}
          {!rows.length && <p className="text-sm text-slate-300">Aguardando publicação dos resultados oficiais do segundo turno.</p>}
        </div>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-5">
          <h2 className="font-black">Exterior · totalização oficial</h2>
          {results.secondExterior ? <p className="mt-2 text-sm text-slate-200">Seções totalizadas: {pct(num(results.secondExterior.s?.pst))} · {fmt(num(results.secondExterior.s?.st))} de {fmt(num(results.secondExterior.s?.ts))}</p> : <p className="mt-2 text-sm text-slate-300">Ainda não há dados disponíveis para esta abrangência na consulta atual.</p>}
          {candidates(results.secondExterior).map(candidate => {
            const previous = candidates(results.firstExterior).find(c => String(c.n) === String(candidate.n));
            return <p key={String(candidate.n)} className="mt-2 text-sm text-slate-200">{candidate.nm}: {fmt(num(candidate.vap))} votos ({pct(num(candidate.pvap))}) · 1º turno: {previous ? fmt(num(previous.vap)) : "—"}</p>;
          })}
          <p className="mt-3 text-xs text-slate-400">Os boletins antecipados de Ásia e Oceania não são misturados à totalização oficial. Para consultar países individualmente, utilize a abrangência Exterior no sistema do TSE.</p>
        </div>
        <a href="https://resultados.tse.jus.br/oficial/app/index.html" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-sky-300 underline">Consultar resultados oficiais no TSE <ExternalLink size={15}/></a>
        <p className="mt-4 text-xs text-slate-400">Comparações entre turnos usam totais oficiais de cada turno; durante a apuração parcial, as diferenças não representam transferência de votos.</p>
      </div>
    </section>
  );
};
