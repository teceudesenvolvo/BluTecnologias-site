import * as functions from 'firebase-functions';
import * as https from 'https';
const get=(url:string)=>new Promise<any>((resolve,reject)=>{https.get(url,{headers:{'User-Agent':'BluTecnologias-SelicPanel/1.0','Accept':'application/json'},timeout:12000},res=>{let body='';res.on('data',chunk=>{body+=chunk;if(body.length>2000000)res.destroy()});res.on('end',()=>{if(res.statusCode!==200)return reject(new Error('Fonte oficial indisponível: '+res.statusCode));try{resolve(JSON.parse(body))}catch{reject(new Error('Resposta inválida da fonte oficial'))}})}).on('error',reject)});
export const selicPanel=functions.https.onRequest(async(req,res)=>{
 res.set('Access-Control-Allow-Origin','*');res.set('Access-Control-Allow-Methods','GET, OPTIONS');
 if(req.method==='OPTIONS'){res.status(204).send('');return}
 if(req.method!=='GET'){res.status(405).json({error:'Método não permitido'});return}
 res.set('Cache-Control','public, max-age=300, s-maxage=3600');
 const now=new Date(),end=[String(now.getUTCDate()).padStart(2,'0'),String(now.getUTCMonth()+1).padStart(2,'0'),now.getUTCFullYear()].join('/');
 const start=[String(now.getUTCDate()).padStart(2,'0'),String(now.getUTCMonth()+1).padStart(2,'0'),now.getUTCFullYear()-10].join('/');
 const series='https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial='+start+'&dataFinal='+end;
 const notices='https://www.bcb.gov.br/api/servico/sitebcb/copom/comunicados?quantidade=30';
 const [rates,news]=await Promise.allSettled([get(series),get(notices)]);
 if(rates.status!=='fulfilled'||!Array.isArray(rates.value)||!rates.value.length){res.status(503).json({error:'Não foi possível consultar a série oficial da Selic neste momento.'});return}
 const points=rates.value.filter((p:any)=>/^\d{2}\/\d{2}\/\d{4}$/.test(p.data)&&Number.isFinite(Number(p.valor))).map((p:any)=>({date:p.data.slice(6)+'-'+p.data.slice(3,5)+'-'+p.data.slice(0,2),value:Number(p.valor)})).sort((a:any,b:any)=>a.date.localeCompare(b.date));
 const publications=news.status==='fulfilled'&&Array.isArray(news.value?.conteudo)?news.value.conteudo.filter((n:any)=>Number.isInteger(n.nro_reuniao)&&/^\d{4}-\d{2}-\d{2}$/.test(n.dataReferencia)).map((n:any)=>({date:n.dataReferencia,title:String(n.titulo||''),meeting:n.nro_reuniao,url:'https://www.bcb.gov.br/controleinflacao/comunicadoscopom/'+n.nro_reuniao})).sort((a:any,b:any)=>b.date.localeCompare(a.date)):[];
 res.json({points,publications,updatedAt:new Date().toISOString(),sources:{series:'https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom',publications:'https://dadosabertos.bcb.gov.br/dataset/atas-comunicados-copom'},newsAvailable:news.status==='fulfilled'});
});
