const BASE='https://apiapex.tesouro.gov.br/aria/v1/transferencias_constitucionais/custom';
const paths:{[key:string]:string}={states:'estados',types:'transferencias',cities:'municipios',data:'por_estado_municipio'};
export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const kind=String(req.query.kind||'');
 if(!paths[kind])return res.status(400).json({error:'Consulta inválida'});
 const params=new URLSearchParams();
 if(kind==='cities'){if(!/^\d+$/.test(String(req.query.state||'')))return res.status(400).json({error:'Estado inválido'});params.set('p_uf',String(req.query.state))}
 if(kind==='data'){
  for(const [key,param] of [['state','p_estado'],['year','p_ano'],['month','p_mes'],['type','p_transferencia']] as const){
   const v=String(req.query[key]||'');
   if(!/^\d+(?::\d+)*$/.test(v))return res.status(400).json({error:'Parâmetros incompletos ou inválidos'});
   params.set(param,v);
  }
 }
 const url=BASE+'/'+paths[kind]+(params.size?'?'+params.toString():'');
 try{
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Tesouro indisponível');
  const raw=await response.json();
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json({source:'Tesouro Nacional — Transferências Constitucionais',retrievedAt:new Date().toISOString(),data:raw});
 }catch{return res.status(503).json({error:'A consulta oficial está indisponível no momento. Nenhum valor estimado foi apresentado.'})}
}
