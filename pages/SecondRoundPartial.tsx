import React from "react";
import { ExternalLink, Info, RefreshCw } from "lucide-react";

const preliminary = {
  capturedAt: "25/10/2026, 12h07 (horário de Brasília)",
  source: "Congresso em Foco — levantamento preliminar de boletins no exterior",
  sourceUrl: "https://www.congressoemfoco.com.br/amp/noticia/123603/primeiras-urnas-sao-apuradas-no-exterior-acompanhe-os-resultados",
  coverage: "22 países e territórios informados no levantamento",
  votes: [
    { name: "Luiz Inácio Lula da Silva", votes: 16585 },
    { name: "Flávio Bolsonaro", votes: 34056 },
  ],
  countries: [
    { name: "Arábia Saudita", lula: 49, flavio: 31 },
    { name: "Austrália", lula: 6017, flavio: 3465 },
    { name: "Catar", lula: 159, flavio: 195 },
    { name: "China continental", lula: 375, flavio: 134 },
    { name: "Coreia do Sul", lula: 148, flavio: 82 },
    { name: "Emirados Árabes Unidos", lula: 643, flavio: 772 },
    { name: "Egito", lula: 60, flavio: 16 },
    { name: "Filipinas", lula: 27, flavio: 39 },
    { name: "Hong Kong", lula: 127, flavio: 133 },
    { name: "Índia", lula: 25, flavio: 23, note: "1 de 2 urnas" },
    { name: "Indonésia", lula: 15, flavio: 23 },
    { name: "Japão", lula: 7098, flavio: 28538 },
    { name: "Jordânia", lula: 725, flavio: 76 },
    { name: "Quênia", lula: 29, flavio: 16 },
    { name: "Kuwait", lula: 62, flavio: 17 },
    { name: "Malásia", lula: 41, flavio: 44 },
    { name: "Nova Zelândia", lula: 418, flavio: 101 },
    { name: "Singapura", lula: 213, flavio: 121 },
    { name: "Síria", lula: 106, flavio: 11 },
    { name: "Tailândia", lula: 56, flavio: 60 },
    { name: "Taiwan", lula: 94, flavio: 130 },
    { name: "Turquia", lula: 98, flavio: 29, note: "1 de 2 urnas" },
  ],
};
const format = (value: number) => value.toLocaleString("pt-BR");
const total = preliminary.votes.reduce((sum, item) => sum + item.votes, 0);
const countryRanking = preliminary.countries
  .map((country) => ({ ...country, total: country.lula + country.flavio }))
  .sort((a, b) => b.total - a.total);

export const SecondRoundPartial: React.FC = () => (
  <section className="mt-10 space-y-6" aria-label="Parcial do segundo turno no exterior">
    <div className="rounded-[2rem] border border-amber-300/25 bg-[#10213a] p-6 sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Boletins preliminares · exterior</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Parcial 2º turno</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Levantamento jornalístico de boletins divulgados no exterior. Não representa a totalização nacional oficial do TSE.
          </p>
        </div>
        <span className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200">Não oficial</span>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
          <p className="text-xs font-semibold text-slate-400">Votos válidos nesta amostra</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{format(total)}</p>
        </div>
        {preliminary.votes.map((candidate) => (
          <div key={candidate.name} className="rounded-2xl border border-white/10 bg-black/15 p-5">
            <p className="text-sm font-semibold text-slate-200">{candidate.name}</p>
            <p className="mt-2 text-3xl font-black tabular-nums">{format(candidate.votes)}</p>
            <p className="mt-1 text-sm text-sky-300">{(candidate.votes / total * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% dos votos válidos desta amostra</p>
          </div>
        ))}
      </div>
      <div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-5 sm:p-6">
        <h2 className="text-lg font-black">Comparativo de votos por candidato</h2>
        <p className="mt-1 text-xs text-slate-400">Distribuição dos votos válidos da parcial do exterior — não é uma previsão nacional</p>
        <div className="mt-6 space-y-6">
          {preliminary.votes.map((candidate, index) => {
            const share = total > 0 ? candidate.votes / total * 100 : 0;
            return (
              <div key={candidate.name}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-bold">{candidate.name}</span>
                  <span className="tabular-nums text-slate-200">{format(candidate.votes)} votos · {share.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                </div>
                <div className="h-5 overflow-hidden rounded-lg bg-white/10" role="progressbar" aria-label={`Participação de ${candidate.name} na parcial do exterior`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
                  <div className={`h-full rounded-lg ${index === 0 ? "bg-sky-400" : "bg-amber-400"}`} style={{ width: `${share}%` }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Ranking por país ou território</h2>
            <p className="mt-1 text-xs text-slate-400">Ordenado pelo total de votos divulgados nesta parcial · 22 localidades</p>
          </div>
          <span className="text-xs text-slate-400">Votos por candidatura</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-white/10 text-xs text-slate-400"><th className="px-3 py-3 font-semibold">#</th><th className="px-3 py-3 font-semibold">País / território</th><th className="px-3 py-3 text-right font-semibold">Total</th><th className="px-3 py-3 text-right font-semibold">Lula</th><th className="px-3 py-3 text-right font-semibold">Flávio</th></tr></thead>
            <tbody>{countryRanking.map((country, index) => (
              <tr key={country.name} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-3 font-bold tabular-nums text-slate-400">{index + 1}</td>
                <th scope="row" className="px-3 py-3 text-left font-semibold">{country.name}{country.note && <span className="ml-2 rounded-md bg-amber-300/10 px-1.5 py-1 text-[10px] font-bold text-amber-200">{country.note}</span>}</th>
                <td className="px-3 py-3 text-right font-black tabular-nums">{format(country.total)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-sky-200">{format(country.lula)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-amber-200">{format(country.flavio)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Índia e Turquia: números parciais, com 1 de 2 urnas contabilizadas em cada localidade. Os demais valores refletem os boletins reunidos pela fonte no horário indicado.</p>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1b2b] p-5 sm:p-6">
        <h2 className="text-lg font-black">Projeção de resultado nacional</h2>
        <p className="mt-2 text-xl font-black text-amber-200">Indisponível com os dados atuais</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">A votação antecipada do exterior não constitui uma amostra representativa do eleitorado nacional. Uma extrapolação simples poderia produzir um vencedor fictício. O gráfico acima mostra somente a distribuição observada nos boletins incluídos nesta parcial.</p>
        <p className="mt-2 text-xs text-slate-400">Consulte a aba “2º turno” para acompanhar os resultados nacionais publicados pelo TSE.</p>
      </div>
      <div className="mt-6 space-y-2 text-sm text-slate-300">
        <p><strong className="text-white">Abrangência:</strong> {preliminary.coverage}.</p>
        <p><strong className="text-white">Horário do levantamento:</strong> {preliminary.capturedAt}.</p>
        <p><strong className="text-white">Fonte informada:</strong> {preliminary.source}.</p>
        <a href={preliminary.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sky-300 underline hover:text-sky-200">Consultar o veículo responsável <ExternalLink size={14}/></a>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-[#0d1b2b] p-5">
        <h2 className="flex items-center gap-2 font-black"><Info size={17} className="text-sky-300"/> Como interpretar</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">Os percentuais correspondem somente aos votos válidos incluídos neste levantamento, não ao eleitorado total do exterior ou do Brasil. Não é possível calcular um percentual de seções apuradas para todo o exterior com esses dados.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0d1b2b] p-5">
        <h2 className="flex items-center gap-2 font-black"><RefreshCw size={17} className="text-sky-300"/> Atualizações</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">Este é um registro fixo da parcial informada. A aba de 2º turno continua consultando automaticamente os arquivos oficiais do TSE. Não misturamos nem somamos os dois conjuntos de dados.</p>
      </div>
    </div>
  </section>
);
