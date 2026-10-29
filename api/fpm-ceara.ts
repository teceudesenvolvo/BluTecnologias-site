const BASE='https://apiapex.tesouro.gov.br/aria/v1/transferencias_constitucionais/custom';
const paths:Record<string,string>={states:'estados',types:'transferencias',cities:'municipios',data:'por_estado_municipio'};
const rows=(raw:any):any[]=>Array.isArray(raw)?raw:Array.isArray(raw?.registros)?raw.registros:Array.isArray(raw?.items)?raw.items:Array.isArray(raw?.data)?raw.data:[];
async function treasury(url:string){const response=await fetch(url,{headers:{Accept:'*/*'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Tesouro retornou HTTP '+response.status);return response.json()}
export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const kind=String(req.query.kind||'');
 if(!paths[kind])return res.status(400).json({error:'Consulta inválida'});
 const params=new URLSearchParams();
 if(kind==='cities'){if(!/^\d+$/.test(String(req.query.state||'')))return res.status(400).json({error:'Estado inválido'});params.set('p_uf',String(req.query.state))}
 if(kind==='data'){
  for(const [key,param] of [['state','p_estado'],['year','p_ano'],['month','p_mes'],['type','p_transferencia']] as const){
   const v=String(req.query[key]||'');
   if(!/^\d+$/.test(v))return res.status(400).json({error:'Parâmetros incompletos ou inválidos'});
   params.set(param,v);
  }
 }
 const base=BASE+'/'+paths[kind];
 try{
  let data:any;
  if(kind==='data'){
   const all:any[]=[];const pageSize=500;let complete=false;
   for(let page=1;page<=12;page++){
    const p=new URLSearchParams(params);p.set('page',String(page));p.set('pageSize',String(pageSize));
    const raw=await treasury(base+'?'+p.toString());const batch=rows(raw);all.push(...batch);
    if(batch.length<pageSize){complete=true;break}
   }
   if(!complete)return res.status(503).json({error:'O Tesouro retornou mais registros do que o limite seguro de consulta. Nenhum total parcial será exibido.'});
   data=all;
  }else{const raw=await treasury(base+(params.size?'?'+params.toString():''));data=rows(raw)}
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({source:'Tesouro Nacional — Transferências Constitucionais',retrievedAt:new Date().toISOString(),data});
 }catch(e){return res.status(503).json({error:'Consulta oficial indisponível: '+(e instanceof Error?e.message:'falha de conexão')+'. Nenhum valor estimado foi apresentado.'})}
}
