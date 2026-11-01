// Indicadores oficiais: cada série falha isoladamente; não estimar valores ausentes.
const definitions=[
 {id:'selic',name:'Meta Selic',code:432,unit:'% a.a.',category:'Juros',frequency:'Diária'},
 {id:'dolar',name:'Dólar PTAX venda',code:1,unit:'R$/US$',category:'Câmbio',frequency:'Dias úteis'},
 {id:'ipca',name:'IPCA mensal',code:433,unit:'% no mês',category:'Inflação',frequency:'Mensal'},
 {id:'ipca12',name:'IPCA acumulado 12 meses',code:13522,unit:'% em 12 meses',category:'Inflação',frequency:'Mensal'},
 {id:'selicEfetiva',name:'Selic efetiva anualizada',code:4189,unit:'% a.a.',category:'Juros',frequency:'Diária'},
 {id:'ibcBr',name:'IBC-Br (atividade econômica)',code:24363,unit:'índice',category:'Atividade',frequency:'Mensal'},
 {id:'pibMensal',name:'PIB mensal em valores correntes (estimativa BCB)',code:4380,unit:'R$ milhões',category:'Atividade',frequency:'Mensal'}
] as const;
async function load(def:typeof definitions[number]){
 const now=new Date(); const end=[String(now.getUTCDate()).padStart(2,'0'),String(now.getUTCMonth()+1).padStart(2,'0'),now.getUTCFullYear()].join('/');
 const startDate=new Date(Date.UTC(now.getUTCFullYear()-9,now.getUTCMonth(),now.getUTCDate())); const start=[String(startDate.getUTCDate()).padStart(2,'0'),String(startDate.getUTCMonth()+1).padStart(2,'0'),startDate.getUTCFullYear()].join('/');
 const url='https://api.bcb.gov.br/dados/serie/bcdata.sgs.'+def.code+'/dados?formato=json&dataInicial='+start+'&dataFinal='+end;
 try{
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const raw=await response.json();
  if(!Array.isArray(raw))throw Error('Formato inesperado');
  const points=raw.filter((p:any)=>/^\d{2}\/\d{2}\/\d{4}$/.test(p.data)&&Number.isFinite(Number(String(p.valor).replace(',','.')))).map((p:any)=>({date:p.data.slice(6)+'-'+p.data.slice(3,5)+'-'+p.data.slice(0,2),value:Number(String(p.valor).replace(',','.'))})).sort((a:any,b:any)=>a.date.localeCompare(b.date));
  if(!points.length)throw Error('Sem registros');
  return {...def,points,status:'ok',source:'https://dadosabertos.bcb.gov.br/dataset/'+def.code};
 }catch(e){return {...def,points:[],status:'unavailable',source:'https://dadosabertos.bcb.gov.br/',error:e instanceof Error?e.message:'Falha de consulta'};}
}
export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=3600');
 const indicators:Awaited<ReturnType<typeof load>>[]=[];
 // Avoid simultaneous bursts against the BCB public API.
 for(let i=0;i<definitions.length;i+=2){indicators.push(...await Promise.all(definitions.slice(i,i+2).map(load)));}
 return res.status(200).json({indicators,updatedAt:new Date().toISOString(),note:'Dados oficiais sujeitos à periodicidade e revisão da fonte. Juros futuros e comércio exterior aguardam integração validada.'});
}
