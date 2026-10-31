const BASE='https://apiapex.tesouro.gov.br/aria/v1/transferencias_constitucionais/custom';
const paths:Record<string,string>={states:'estados',types:'transferencias',cities:'municipios',data:'por_municipio'};
const rows=(raw:any):any[]=>{
 if(Array.isArray(raw))return raw;
 if(!raw||typeof raw!=='object')return [];
 for(const key of ['registros','items','data','result','resultado','results','rows','value','response','transferencias','estados']){
  if(raw[key]!==undefined){const found=rows(raw[key]);if(found.length)return found}
 }
 if(raw.codigo!==undefined||raw.CODIGO!==undefined||raw.transferencia!==undefined||raw.TRANSFERENCIA!==undefined)return [raw];
 const values=Object.values(raw);
 if(values.length&&values.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&('codigo' in (v as any)||'nome' in (v as any)||'CODIGO' in (v as any)||'NOME' in (v as any))))return values as any[];
 return [];
};
async function treasury(url:string){const response=await fetch(url,{headers:{Accept:'*/*'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Tesouro retornou HTTP '+response.status+' no endpoint '+new URL(url).pathname.split('/').pop());return response.json()}
export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const kind=String(req.query.kind||'');
 if(!paths[kind])return res.status(400).json({error:'Consulta inválida'});
 const params=new URLSearchParams();
 if(kind==='cities'){if(!/^\d+$/.test(String(req.query.state||'')))return res.status(400).json({error:'Estado inválido'});params.set('p_uf',String(req.query.state))}
 if(kind==='data'){
  for(const [key,param] of [['state','p_estado'],['year','p_ano'],['month','p_mes']] as const){
   const v=String(req.query[key]||'');
   if(!/^\d+$/.test(v))return res.status(400).json({error:'Parâmetros incompletos ou inválidos'});
   params.set(param,v);
  }
  const transferType=String(req.query.type||'');
  if(transferType){if(!/^\\d+$/.test(transferType))return res.status(400).json({error:'Transferência inválida'});params.set('p_transferencia',transferType)}
 }
 const base=BASE+'/'+paths[kind];
 try{
  let data:any;
  if(kind==='data'){
   const all:any[]=[];const pageSize=250;let complete=false;
   for(let page=1;page<=30;page++){
    const p=new URLSearchParams(params);p.set('page',String(page));p.set('pageSize',String(pageSize));
    const raw=await treasury(base+'?'+p.toString());const batch=rows(raw);all.push(...batch);
    if(raw?.hasMore===false||raw?.has_more===false||raw?.next===null||batch.length<pageSize){complete=true;break}
   }
   if(!complete)return res.status(503).json({error:'O Tesouro retornou mais registros do que o limite seguro de consulta. Nenhum total parcial será exibido.'});
   data=all;
  }else{const raw=await treasury(base+(params.size?'?'+params.toString():''));data=rows(raw);if(!data.length){return res.status(502).json({error:'Catálogo do Tesouro sem registros reconhecíveis.',diagnostics:{kind,topLevelType:Array.isArray(raw)?'array':typeof raw,keys:raw&&typeof raw==='object'?Object.keys(raw).slice(0,12):[],sample:JSON.stringify(raw).slice(0,220)}})}}
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({source:'Tesouro Nacional — Transferências Constitucionais',retrievedAt:new Date().toISOString(),data});
 }catch(e){return res.status(503).json({error:'Consulta oficial indisponível: '+(e instanceof Error?e.message:'falha de conexão')+'. Nenhum valor estimado foi apresentado.'})}
}
