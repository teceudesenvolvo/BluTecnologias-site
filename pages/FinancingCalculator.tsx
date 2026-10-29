import React,{useState} from 'react';
type Key='price'|'down'|'rate'|'months'|'payment';
const fmt=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parse=(s:string)=>Number(s.replace(/\s/g,'').replace(/\./g,'').replace(',','.'));
const installment=(principal:number,r:number,n:number)=>r===0?principal/n:principal*r/(-Math.expm1(-n*Math.log1p(r)));
function solve(values:Record<Key,number>,missing:Key,unit:'monthly'|'annual'){
 let {price,down,rate,months,payment}=values;let r=unit==='annual'?Math.expm1(Math.log1p(rate/100)/12):rate/100;
 if(missing==='rate'){
  const principal=price-down;if(principal<=0||payment<=0||months<=0)return 'O valor financiado, as parcelas e o prazo devem ser positivos.';
  if(payment<principal/months-1e-7)return 'Parcela insuficiente para amortizar o financiamento, mesmo sem juros.';
  let lo=0,hi=1;while(installment(principal,hi,months)<payment&&hi<1e5)hi*=2;
  if(hi>=1e5)return 'Não foi possível estimar uma taxa compatível.';
  for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(installment(principal,mid,months)>payment)hi=mid;else lo=mid}r=(lo+hi)/2;rate=(unit==='annual'?Math.expm1(12*Math.log1p(r)):r)*100;
 }else if(missing==='months'){
  const principal=price-down;if(principal<=0||payment<=0)return 'Informe um valor financiado e uma parcela positivos.';
  if(r>0&&payment<=principal*r)return 'A parcela não cobre os juros mensais; o saldo não seria quitado.';
  months=r===0?principal/payment:-Math.log1p(-principal*r/payment)/Math.log1p(r);
  if(!Number.isFinite(months)||months<=0||months>1200)return 'Prazo fora do intervalo de simulação (até 1.200 meses).';
  months=Math.ceil(months);
 }else if(missing==='payment'){
  if(price<down||months<=0)return 'O bem deve custar pelo menos o valor da entrada, e o prazo deve ser positivo.';
  payment=installment(price-down,r,months);
 }else if(missing==='price'){
  if(months<=0)return 'Informe um prazo válido.';
  price=down+(r===0?payment*months:payment*(-Math.expm1(-months*Math.log1p(r)))/r);
 }else{
  if(months<=0)return 'Informe um prazo válido.';
  down=price-(r===0?payment*months:payment*(-Math.expm1(-months*Math.log1p(r)))/r);
  if(down< -0.01)return 'Os valores informados exigiriam uma entrada negativa. Confira os dados.';
 }
 const principal=price-down;if([price,down,rate,months,payment,principal].some(v=>!Number.isFinite(v))||price<=0||down<0||principal<0||rate<0||payment<0||months<=0)return 'Os valores informados não formam um financiamento válido.';
 const total=payment*months,interest=total-principal;
 return {price,down,rate,months,payment,principal,total,interest,overall:total+down};
}
export function FinancingCalculator(){
 const [asset,setAsset]=useState<'car'|'home'>('car'),[unit,setUnit]=useState<'monthly'|'annual'>('monthly');
 const [values,setValues]=useState<Record<Key,string>>({price:'80000',down:'20000',rate:'1,5',months:'48',payment:''});
 const keys:Key[]=['price','down','rate','months','payment'];
 const labels:Record<Key,string>={price:'Valor do bem (R$)',down:'Entrada (R$)',rate:'Taxa de juros (%)',months:'Quantidade de parcelas (meses)',payment:'Valor de cada parcela (R$)'};
 const blank=keys.filter(k=>values[k].trim()==='');
 const nums=Object.fromEntries(keys.map(k=>[k,parse(values[k])])) as Record<Key,number>;
 const invalid=keys.filter(k=>values[k].trim()!==''&&(!Number.isFinite(nums[k])||nums[k]<0||(k==='months'&&(!Number.isInteger(nums[k])||nums[k]>1200)))).length>0;
 const result=blank.length===1&&!invalid?solve(nums,blank[0],unit):null;
 const missing=blank.length===1?blank[0]:null;
 const format=(k:Key,n:number)=>k==='rate'?n.toLocaleString('pt-BR',{maximumFractionDigits:5})+'% '+(unit==='monthly'?'ao mês':'ao ano'):k==='months'?String(Math.ceil(n))+' meses':fmt(n);
 return <section className="space-y-6"><div className="rounded-2xl bg-slate-50 border p-5"><p className="font-semibold text-lg">O que você deseja financiar?</p><div className="flex gap-3 mt-3">{([['car','Carro'],['home','Casa / imóvel']] as const).map(([v,label])=><button key={v} onClick={()=>setAsset(v)} aria-pressed={asset===v} className={`px-5 py-3 rounded-xl border font-semibold ${asset===v?'bg-slate-900 text-white':'bg-white'}`}>{label}</button>)}</div><p className="text-sm text-slate-500 mt-3">Simulação de {asset==='car'?'financiamento de veículo':'financiamento imobiliário'} com parcelas fixas (Tabela Price).</p></div>
 <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-900">Preencha <strong>quatro dos cinco campos</strong> e deixe <strong>apenas um vazio</strong>. A calculadora descobrirá automaticamente o valor que falta.</div>
 <div className="grid sm:grid-cols-2 gap-5">{keys.map(k=><label key={k} className="block font-medium">{labels[k]}{k==='rate'&&<select aria-label="Periodicidade da taxa" className="block mt-2 border rounded-xl p-3 w-full bg-white" value={unit} onChange={e=>setUnit(e.target.value as 'monthly'|'annual')}><option value="monthly">Juros ao mês</option><option value="annual">Juros ao ano (taxa efetiva)</option></select>}<input type="text" inputMode="decimal" placeholder="Deixe vazio para calcular" className={`block mt-2 w-full border rounded-xl p-3 ${values[k]===''?'border-blue-400 bg-blue-50':'border-slate-300'}`} value={values[k]} onChange={e=>setValues(v=>({...v,[k]:e.target.value}))}/></label>)}</div>
 {blank.length!==1?<p role="status" className="text-amber-800 bg-amber-50 rounded-xl p-4">{blank.length===0?'Apague o campo que deseja descobrir.':'Deixe apenas um campo vazio para calcular.'}</p>:invalid?<p role="alert" className="text-red-700 bg-red-50 rounded-xl p-4">Verifique os números informados. Use valores não negativos e prazo inteiro de até 1.200 meses.</p>:typeof result==='string'?<p role="alert" className="text-red-700 bg-red-50 rounded-xl p-4">{result}</p>:result&&missing?<div className="border rounded-2xl p-6 bg-white"><p className="text-slate-500 text-sm">Resultado: {labels[missing]}</p><strong className="text-3xl text-blue-700 block mt-2">{format(missing,result[missing])}</strong><div className="grid sm:grid-cols-2 gap-3 mt-6">{[['Valor financiado',fmt(result.principal)],['Prestação mensal',fmt(result.payment)],['Total das parcelas',fmt(result.total)],['Juros totais',fmt(result.interest)],['Custo total com entrada',fmt(result.overall)],['Prazo',String(result.months)+' meses']].map(([name,value])=><div key={name} className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500 text-sm">{name}</p><strong className="block mt-1">{value}</strong></div>)}</div>{missing==='months'&&<p className="text-sm text-slate-500 mt-3">Prazo arredondado para cima. A última parcela pode ser menor que o valor informado.</p>}<button className="mt-5 border rounded-xl px-4 py-2" onClick={()=>window.print()}>Imprimir / salvar PDF</button></div>:null}
 <p className="text-sm text-slate-500">Estimativa matemática pelo sistema Price, com taxa efetiva e pagamentos mensais. Não inclui IOF, seguros, tarifas, correção monetária, TR, CET ou custos cartorários. Em imóveis, o banco pode usar SAC ou outros sistemas. Consulte as condições reais da instituição financeira.</p></section>;
}
