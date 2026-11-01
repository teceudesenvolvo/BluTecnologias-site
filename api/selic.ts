export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=3600');
 const now=new Date(),pad=(n:number)=>String(n).padStart(2,'0');
 const end=pad(now.getUTCDate())+'/'+pad(now.getUTCMonth()+1)+'/'+now.getUTCFullYear();
 const start=pad(now.getUTCDate())+'/'+pad(now.getUTCMonth()+1)+'/'+(now.getUTCFullYear()-10);
 const series='https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial='+start+'&dataFinal='+end;
 const newsUrl='https://www.bcb.gov.br/api/servico/sitebcb/copom/comunicados?quantidade=30';
 const request=async(url:string)=>{const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});if(!response.ok)throw Error('HTTP '+response.status);return response.json()};
 const [rates,news]=await Promise.allSettled([request(series),request(newsUrl)]);
 if(rates.status!=='fulfilled'||!Array.isArray(rates.value)||!rates.value.length)return res.status(503).json({error:'Série oficial da Selic temporariamente indisponível'});
 const points=rates.value.filter((p:any)=>/^\d{2}\/\d{2}\/\d{4}$/.test(p.data)&&Number.isFinite(Number(p.valor))).map((p:any)=>({date:p.data.slice(6)+'-'+p.data.slice(3,5)+'-'+p.data.slice(0,2),value:Number(p.valor)})).sort((a:any,b:any)=>a.date.localeCompare(b.date));
 const raw=news.status==='fulfilled'?(Array.isArray(news.value)?news.value:Array.isArray(news.value?.conteudo)?news.value.conteudo:[]):[];
 const publications=raw.filter((n:any)=>Number.isInteger(n.nro_reuniao)&&/^\d{4}-\d{2}-\d{2}$/.test(n.dataReferencia)).map((n:any)=>({date:n.dataReferencia,title:String(n.titulo||'Comunicado do Copom'),meeting:n.nro_reuniao,url:'https://www.bcb.gov.br/controleinflacao/comunicadoscopom'})).sort((a:any,b:any)=>b.date.localeCompare(a.date));
 return res.status(200).json({points,publications,updatedAt:new Date().toISOString(),newsAvailable:news.status==='fulfilled'});
}
