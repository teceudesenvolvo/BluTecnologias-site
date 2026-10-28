export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=1800');
 const start='01/09/2026';const now=new Date();const end=[String(now.getUTCDate()).padStart(2,'0'),String(now.getUTCMonth()+1).padStart(2,'0'),now.getUTCFullYear()].join('/');
 const url='https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial='+encodeURIComponent(start)+'&dataFinal='+encodeURIComponent(end);
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('BCB indisponível');
  const raw=await response.json();
  if(!Array.isArray(raw))throw Error('Formato inesperado');
  const points=raw.filter((v:any)=>/^\d{2}\/\d{2}\/\d{4}$/.test(v?.data)&&Number.isFinite(Number(v?.valor))&&Number(v.valor)>0).map((v:any)=>({date:v.data,value:Number(v.valor)})).slice(-150);
  if(!points.length)throw Error('Sem dados');
  return res.status(200).json({series:'BCB SGS 1 — taxa de câmbio livre, dólar americano (venda), diária',source:'https://dadosabertos.bcb.gov.br/dataset/1-taxa-de-cambio---livre---dolar-americano-venda---diario',fetchedAt:new Date().toISOString(),points});
 }catch{return res.status(503).json({error:'Dados oficiais temporariamente indisponíveis. Tente novamente mais tarde.'})}
}
