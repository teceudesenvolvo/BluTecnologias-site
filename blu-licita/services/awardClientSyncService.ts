import { auth, clientService, contactService, type ClientContract } from '../../services/firebase';
import { companySettingsService } from '../../services/firestoreSettingsService';
import type { ExternalOpportunity } from '../integrations/core/integrationTypes';
import type { PncpOpportunityBundle } from '../integrations/pncp/pncpTypes';

export type AwardSyncResult = { status:'not-winner'|'imported'|'updated'|'signed-out'; companyName?:string; clientName?:string };
const digits=(value:unknown)=>String(value||'').replace(/\D/g,'');
const activeResult=(item:Record<string,unknown>)=>Number(item.situacaoCompraItemResultadoId||1)!==2;

export const awardClientSyncService={
  async sync(opportunity:ExternalOpportunity,bundle:PncpOpportunityBundle):Promise<AwardSyncResult>{
    const user=auth.currentUser;if(!user)return {status:'signed-out'};
    const companies=await companySettingsService.getAll();
    const company=companies.find((candidate)=>bundle.results.some((result)=>activeResult(result)&&digits(result.niFornecedor)===digits(candidate.cnpj)));
    if(!company)return {status:'not-winner'};
    const winningResults=bundle.results.filter((result)=>activeResult(result)&&digits(result.niFornecedor)===digits(company.cnpj));
    const detail=bundle.detail;
    const organizationCnpj=digits(opportunity.organizationCnpj||((detail.orgaoEntidade as Record<string,unknown>|undefined)?.cnpj));
    const clientName=opportunity.organizationName||String((detail.orgaoEntidade as Record<string,unknown>|undefined)?.razaoSocial||'Órgão público');
    const total=winningResults.reduce((sum,result)=>sum+Number(result.valorTotalHomologado||0),0);
    const firstDate=String(winningResults.map((result)=>result.dataResultado).filter(Boolean).sort()[0]||new Date().toISOString()).slice(0,10);
    const contract:ClientContract={id:`pncp:${opportunity.externalId}`,title:`${opportunity.procurementNumber||'Licitação'} — ${opportunity.object}`,startDate:firstDate,endDate:'',value:total,fileUrl:opportunity.sourceUrl,source:'pncp',sourceId:opportunity.externalId,sourceUrl:opportunity.sourceUrl,processNumber:opportunity.processNumber,procurementNumber:opportunity.procurementNumber,supplierCnpj:digits(company.cnpj),importedAt:new Date().toISOString()};
    const contacts=await contactService.getAll();
    const existing=contacts.find((contact)=>digits(contact.organizationCnpj||contact.cnpj)===organizationCnpj);
    if(existing){const contracts=[...(existing.contracts||[]).filter((item)=>item.id!==contract.id),contract];await clientService.update(existing.id,{contracts,source:'pncp',organizationCnpj});return {status:'updated',companyName:company.razaoSocial,clientName};}
    await clientService.create({name:clientName,razaoSocial:clientName,cnpj:organizationCnpj,organizationCnpj,role:'Órgão contratante',email:'',phone:'',city:String((detail.unidadeOrgao as Record<string,unknown>|undefined)?.municipioNome||''),state:String((detail.unidadeOrgao as Record<string,unknown>|undefined)?.ufSigla||''),solution:opportunity.object,message:`Cliente importado automaticamente após vitória da empresa ${company.razaoSocial} no PNCP.`,contracts:[contract],source:'pncp'});
    return {status:'imported',companyName:company.razaoSocial,clientName};
  }
};
