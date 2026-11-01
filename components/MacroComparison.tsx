import React from 'react';
import {Download,Maximize2,Minimize2} from 'lucide-react';
type Point={date:string;value:number};type Indicator={id:string;name:string;unit:string;category:string;points:Point[];status:string};
const colors=['#2563eb','#dc2626','#059669','#9333ea','#ea580c','#0891b2','#ca8a04'];
const fmt=(v:number)=>v.toLocaleString('pt-BR',{maximumFractionDigits:2});
const month=(s:string)=>s.slice(0,7);
const average=(arr:number[])=>arr.reduce((a,b)=>a+b,0)/arr.length;
export function MacroComparison({indicators}:{indicators:Indicator[]}){
 const [ids,setIds]=React.useState<string[]>(['selic','dolar','ipca12']);
 const [mode,setMode]=React.useState<'indexed'|'change'|'raw'>('indexed');
 const [period,setPeriod]=React.useState(24);
 const [smooth,setSmooth]=React.useState(1);
 const [expanded,setExpanded]=React.useState(false);
 const [hover,setHover]=React.useState<number|null>(null);
 const available=indicators.filter(i=>i.points.length>0);
 const chosen=available.filter(i=>ids.includes(i.id));
 const toggle=(id:string)=>setIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<6?[...prev,id]:prev);
 // One monthly observation per series: last published observation in each month.
 const monthly=chosen.map(item=>{
  const byMonth=new Map<string,number>();
  item.points.forEach(p=>byMonth.set(month(p.date),p.value));
  const ordered=[...byMonth].sort(([a],[b])=>a.localeCompare(b));
  return {item,series:new Map(ordered)};
 });
 const lastMonth=[...monthly.flatMap(x=>[...x.series.keys()])].sort().pop()||new Date().toISOString().slice(0,7);
 const [year,mo]=lastMonth.split('-').map(Number);
 const start=new Date(Date.UTC(year,mo-1-period+1,1)).toISOString().slice(0,7);
 const months=[...new Set(monthly.flatMap(x=>[...x.series.keys()]))].filter(m=>m>=start&&m<=lastMonth).sort();
 const transformed=monthly.map(({item,series})=>{
  const points=months.map(m=>({month:m,value:series.get(m)}));
  const first=points.find(p=>p.value!==undefined)?.value;
  const base=first!==undefined&&first!==0?first:null;
  const mapped=points.map((p,i)=>{
   if(p.value===undefined)return {month:p.month,value:null as number|null,raw:null as number|null};
   const smoothed=smooth===1?p.value:average(points.slice(Math.max(0,i-smooth+1),i+1).filter(x=>x.value!==undefined).map(x=>x.value!));
   const value=mode==='raw'?smoothed:base===null?null:mode==='indexed'?smoothed/base*100:(smoothed/base-1)*100;
   return {month:p.month,value,raw:p.value};
  });
  return {item,points:mapped};
 });
 const vals=transformed.flatMap(s=>s.points.map(p=>p.value).filter((x):x is number=>x!==null&&Number.isFinite(x)));
 const lo=vals.length?Math.min(...vals):0,hi=vals.length?Math.max(...vals):100,margin=Math.max((hi-lo)*.12,1),min=lo-margin,max=hi+margin;
 const x=(i:number)=>58+i*810/Math.max(1,months.length-1);
 const y=(v:number)=>240-(v-min)/Math.max(.001,max-min)*200;
 const exportCsv=()=>{
  const rows=[['Mês',...transformed.map(s=>s.item.name)],...months.map((m,i)=>[m,...transformed.map(s=>s.points[i]?.value===null?'':String(s.points[i]?.value??''))])];
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='observatorio-macroeconomico-comparacao.csv';a.click();URL.revokeObjectURL(a.href);
 };
 const corr=transformed.length===2?(()=>{
  const pairs=months.map((_,i)=>[transformed[0].points[i]?.value,transformed[1].points[i]?.value]).filter((p):p is number[]=>p.every(v=>v!==null&&v!==undefined&&Number.isFinite(v)));
  if(pairs.length<4)return null;
  const mx=average(pairs.map(p=>p[0])),my=average(pairs.map(p=>p[1]));
  const cov=pairs.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0),sx=Math.sqrt(pairs.reduce((a,p)=>a+(p[0]-mx)**2,0)),sy=Math.sqrt(pairs.reduce((a,p)=>a+(p[1]-my)**2,0));
  return sx&&sy?cov/(sx*sy):null;
 })():null;
 return <section className={expanded?'fixed inset-0 z-50 overflow-auto bg-[#f5f7fb] p-4 md:p-10':'mt-6 rounded-3xl border bg-white p-5 md:p-8'} aria-label="Comparador de indicadores econômicos">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase font-bold text-blue-700">Análise interativa</p><h2 className="text-2xl font-bold mt-1">Comparar indicadores no mesmo gráfico</h2><p className="text-sm text-slate-500 mt-1">Selecione até seis séries. Comparações usam o último dado publicado de cada mês.</p></div><div className="flex gap-2"><button onClick={exportCsv} disabled={!months.length} className="inline-flex gap-2 items-center rounded-xl border px-3 py-2 text-sm disabled:opacity-50"><Download size={16}/> CSV</button><button onClick={()=>setExpanded(x=>!x)} className="inline-flex gap-2 items-center rounded-xl border px-3 py-2 text-sm">{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {expanded?'Fechar tela cheia':'Expandir'}</button></div></div>
 <div className="flex flex-wrap gap-2 mt-5">{indicators.map(item=><label key={item.id} className={'cursor-pointer rounded-xl border px-3 py-2 text-sm '+(ids.includes(item.id)?'bg-blue-50 border-blue-500 text-blue-900':'bg-white text-slate-600')+(item.points.length?'':' opacity-50')}><input type="checkbox" className="mr-2" checked={ids.includes(item.id)} disabled={!item.points.length||(!ids.includes(item.id)&&ids.length>=6)} onChange={()=>toggle(item.id)}/>{item.name}</label>)}</div>
 <div className="mt-5 flex flex-wrap gap-4 items-end"><label className="text-sm font-semibold">Análise<select value={mode} onChange={e=>setMode(e.target.value as typeof mode)} className="block mt-1 border rounded-xl p-2"><option value="indexed">Índice base 100</option><option value="change">Variação desde o início (%)</option><option value="raw">Valores originais</option></select></label><label className="text-sm font-semibold">Período<select value={period} onChange={e=>setPeriod(Number(e.target.value))} className="block mt-1 border rounded-xl p-2">{[6,12,24,36,60,108].map(n=><option key={n} value={n}>{n} meses</option>)}</select></label><label className="text-sm font-semibold">Suavização<select value={smooth} onChange={e=>setSmooth(Number(e.target.value))} className="block mt-1 border rounded-xl p-2"><option value={1}>Sem média móvel</option><option value={3}>Média móvel 3 meses</option><option value={6}>Média móvel 6 meses</option></select></label></div>
 {chosen.length&&months.length>1?<div className="mt-6 overflow-x-auto"><svg viewBox="0 0 900 275" className="w-full min-w-[580px]" role="img" aria-label="Gráfico comparativo mensal de indicadores macroeconômicos" onMouseLeave={()=>setHover(null)}>{[0,1,2,3,4].map(i=><g key={i}><line x1="58" x2="868" y1={40+i*50} y2={40+i*50} stroke="#e2e8f0"/><text x="4" y={44+i*50} fill="#64748b" fontSize="12">{fmt(max-(max-min)*i/4)}</text></g>)}{transformed.map((series,j)=>{const segments:string[][]=[];let current:string[]=[];series.points.forEach((p,i)=>{if(p.value===null){if(current.length>1)segments.push(current);current=[]}else current.push(x(i)+','+y(p.value))});if(current.length>1)segments.push(current);return <g key={series.item.id}>{segments.map((points,k)=><polyline key={k} points={points.join(' ')} fill="none" stroke={colors[j%colors.length]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>)}</g>})}{hover!==null&&<line x1={x(hover)} x2={x(hover)} y1="35" y2="240" stroke="#64748b" strokeDasharray="4 4"/>}{months.map((m,i)=><rect key={m} x={x(i)-405/Math.max(1,months.length-1)} y="35" width={810/Math.max(1,months.length-1)} height="205" fill="transparent" onMouseEnter={()=>setHover(i)}><title>{m}: {transformed.map(s=>s.item.name+' '+(s.points[i]?.value===null?'sem dado':fmt(s.points[i].value!))).join(' · ')}</title></rect>)}<text x="58" y="265" fontSize="12" fill="#64748b">{months[0]}</text><text x="868" y="265" textAnchor="end" fontSize="12" fill="#64748b">{months[months.length-1]}</text></svg><div className="flex flex-wrap gap-4 mt-2">{transformed.map((s,j)=><div key={s.item.id} className="flex gap-2 items-center text-sm"><span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor:colors[j%colors.length]}}/>{s.item.name}</div>)}</div>{hover!==null&&<div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><strong>{months[hover]}</strong><div className="mt-2 grid gap-2 sm:grid-cols-2">{transformed.map(s=><div key={s.item.id}>{s.item.name}: <b>{s.points[hover]?.value===null?'Sem dado':fmt(s.points[hover].value!)}{mode==='change'?'%':''}</b>{mode!=='raw'&&s.points[hover]?.raw!==null?' (original: '+fmt(s.points[hover].raw!)+' '+s.item.unit+')':''}</div>)}</div></div>}</div>:<p className="mt-6 py-12 text-slate-500">Selecione indicadores com dados suficientes para comparar.</p>}
 <div className="mt-6 grid sm:grid-cols-2 gap-4"><div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">Leitura de tendência</p><p className="text-sm mt-1">{mode==='indexed'?'Base 100: cada série começa em 100. Valores acima de 100 representam crescimento relativo ao primeiro dado disponível no intervalo.':mode==='change'?'Variação percentual em relação à primeira observação disponível no período.':'Valores nas unidades originais: escalas diferentes podem distorcer a comparação.'}</p></div><div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">Correlação de Pearson</p><strong className="text-xl">{corr===null?'Selecione exatamente 2 séries com pelo menos 4 meses coincidentes':fmt(corr)}</strong><p className="text-xs text-slate-500 mt-1">Correlação descritiva dos valores exibidos; não demonstra causalidade e pode ser afetada por tendências comuns.</p></div></div>
 <p className="text-xs text-slate-500 mt-4">Dados mensais alinhados pelo mês de referência, sem preencher lacunas artificialmente. Índices e variações normalizam as escalas, mas não tornam indicadores economicamente equivalentes. Médias móveis são análises derivadas, não números oficiais.</p>
 </section>;
}
