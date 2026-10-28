import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import type {VercelRequest,VercelResponse} from '@vercel/node';

function publicIp(ip:string){
 if(isIP(ip)===4){const p=ip.split('.').map(Number);return !(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]===192&&p[1]===0)||(p[0]===198&&(p[1]===18||p[1]===19)));}
 if(isIP(ip)===6){const v=ip.toLowerCase();return !(v==='::1'||v==='::'||v.startsWith('fc')||v.startsWith('fd')||v.startsWith('fe8')||v.startsWith('fe9')||v.startsWith('fea')||v.startsWith('feb')||v.startsWith('::ffff:'));}
 return false;
}
const checks=[
 {id:'transparencia',name:'Acesso ao portal da transparência',words:['transparência','transparencia','portal da transparência']},
 {id:'receitas',name:'Receitas',words:['receitas','arrecadação']},
 {id:'despesas',name:'Despesas',words:['despesas','empenhos','pagamentos']},
 {id:'licitacoes',name:'Licitações',words:['licitações','licitacoes','pregão']},
 {id:'contratos',name:'Contratos',words:['contratos','contratações']},
 {id:'pessoal',name:'Recursos humanos',words:['servidores','remuneração','folha de pagamento']},
 {id:'sic',name:'Acesso à informação (SIC/e-SIC)',words:['e-sic','serviço de informação ao cidadão','acesso à informação']},
 {id:'ouvidoria',name:'Ouvidoria',words:['ouvidoria']},
 {id:'lgpd',name:'Privacidade e LGPD',words:['lgpd','política de privacidade','proteção de dados']},
 {id:'planejamento',name:'Planejamento e contas',words:['ppa','loa','ldo','prestação de contas']}
];
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const raw=typeof req.body?.url==='string'?req.body.url.trim():'';
 if(raw.length>500)return res.status(400).json({error:'URL inválida'});
 let url:URL;try{url=new URL(raw)}catch{return res.status(400).json({error:'Informe uma URL completa com https://'})}
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!url.hostname.includes('.')||isIP(url.hostname))return res.status(400).json({error:'Apenas domínios públicos HTTPS são aceitos'});
 try{
  const ips=await lookup(url.hostname,{all:true,verbatim:true});
  if(!ips.length||ips.some(v=>!publicIp(v.address)))return res.status(400).json({error:'Endereço de rede não permitido'});
  const response=await fetch(url.href,{redirect:'manual',signal:AbortSignal.timeout(9000),headers:{'User-Agent':'BluToolsTransparencyPreview/1.0','Accept':'text/html'}});
  if(!response.ok)return res.status(422).json({error:'O site não respondeu com uma página acessível',httpStatus:response.status});
  if(!(response.headers.get('content-type')||'').includes('text/html'))return res.status(422).json({error:'O endereço não retornou HTML'});
  const reader=response.body?.getReader();if(!reader)throw Error('Sem conteúdo');
  let size=0;const parts:Uint8Array[]=[];
  while(size<500000){const part=await reader.read();if(part.done)break;size+=part.value.length;parts.push(part.value)}
  await reader.cancel().catch(()=>{});
  const html=new TextDecoder().decode(Buffer.concat(parts.map(p=>Buffer.from(p)))).toLowerCase();
  const results=checks.map(c=>({id:c.id,name:c.name,status:c.words.some(w=>html.includes(w))?'indicio':'nao_identificado'}));
  return res.status(200).json({url:url.href,checkedAt:new Date().toISOString(),results,scope:'Verificação preliminar da página inicial: termos encontrados no HTML não comprovam atendimento aos critérios PNTP. Não é nota nem selo oficial.'});
 }catch{return res.status(422).json({error:'Não foi possível examinar o site. Verifique se ele permite acesso público automatizado.'})}
}
