import type { ProcurementConnector } from '../core/ProcurementConnector';
import type { ConnectorConfiguration, ExternalBiddingItem, ExternalDocument, ExternalOpportunity, NormalizedOpportunity, OpportunityQuery, PaginatedResult } from '../core/integrationTypes';
import { IntegrationError } from '../core/IntegrationError';
import { comprasGovProvider } from './comprasGovProvider';

type ComprasGovRecord = Record<string, unknown> & {
  numeroControlePNCP?: string; orgaoEntidadeRazaoSocial?: string; orgaoEntidadeCnpj?: string;
  processo?: string; numeroCompra?: string; objetoCompra?: string; valorTotalEstimado?: number;
  dataPublicacaoPncp?: string; dataAberturaPropostaPncp?: string; situacaoCompraNomePncp?: string;
};
type ComprasGovPage = { resultado?: ComprasGovRecord[]; totalRegistros?: number; paginasRestantes?: number };

const BASE='/api/compras-gov';
const endpoint='/modulo-contratacoes/1_consultarContratacoes_PNCP_14133';

export class ComprasGovConnector implements ProcurementConnector {
  readonly provider=comprasGovProvider;
  async validateConfiguration(configuration:ConnectorConfiguration){return {valid:Boolean(configuration.companyId),errors:configuration.companyId?[]:['Empresa não informada.'],warnings:['A API de Dados Abertos não exige credenciais.']};}
  async testConnection(_configuration:ConnectorConfiguration){const started=Date.now();try{const now=new Date().toISOString().slice(0,10);const params=new URLSearchParams({pagina:'1',tamanhoPagina:'10',dataPublicacaoPncpInicial:now,dataPublicacaoPncpFinal:now,codigoModalidade:'8'});const response=await fetch(`${BASE}${endpoint}?${params}`);return {success:response.ok,message:response.ok?'API pública do Compras.gov.br disponível.':'API do Compras.gov.br não respondeu.',checkedAt:new Date().toISOString(),latencyMs:Date.now()-started};}catch{return {success:false,message:'API do Compras.gov.br não respondeu.',checkedAt:new Date().toISOString(),latencyMs:Date.now()-started};}}
  async listOpportunities(filters:OpportunityQuery,cursor='1'):Promise<PaginatedResult<ExternalOpportunity>>{if(!filters.modalityCode)throw new IntegrationError('CONFIGURATION_REQUIRED','Selecione uma modalidade.','compras-gov','listOpportunities');const params=new URLSearchParams({pagina:cursor,tamanhoPagina:String(Math.max(10,Math.min(filters.pageSize||40,500))),dataPublicacaoPncpInicial:filters.startDate,dataPublicacaoPncpFinal:filters.endDate,codigoModalidade:String(filters.modalityCode)});if(filters.state)params.set('unidadeOrgaoUfSigla',filters.state);try{const response=await fetch(`${BASE}${endpoint}?${params}`);if(!response.ok)throw new Error(String(response.status));const page=await response.json() as ComprasGovPage;const data=(page.resultado||[]).filter((item)=>item.numeroControlePNCP).map((item)=>this.toExternal(item));return {data,total:page.totalRegistros,nextCursor:(page.paginasRestantes||0)>0?String(Number(cursor)+1):undefined};}catch(error){throw new IntegrationError('PROVIDER_UNAVAILABLE','Não foi possível consultar o Compras.gov.br agora.','compras-gov','listOpportunities',true,error);}}
  private toExternal(item:ComprasGovRecord):ExternalOpportunity{return {externalId:item.numeroControlePNCP!,source:'compras-gov',organizationName:item.orgaoEntidadeRazaoSocial||'Órgão não informado',organizationCnpj:item.orgaoEntidadeCnpj,processNumber:item.processo,procurementNumber:item.numeroCompra,object:item.objetoCompra||'Objeto não informado',estimatedValue:item.valorTotalEstimado,publicationDate:item.dataPublicacaoPncp,openingDate:item.dataAberturaPropostaPncp,status:item.situacaoCompraNomePncp,raw:item};}
  async getOpportunityById(_externalId:string){return null;}
  async listOpportunityItems(_externalId:string):Promise<ExternalBiddingItem[]>{return [];}
  async listOpportunityDocuments(_externalId:string):Promise<ExternalDocument[]>{return [];}
  async normalizeOpportunity(external:ExternalOpportunity):Promise<NormalizedOpportunity>{const raw=external.raw as ComprasGovRecord;const now=new Date().toISOString();return {id:`compras-gov:${external.externalId}`,source:'compras-gov',sourceId:external.externalId,organization:{cnpj:external.organizationCnpj,name:external.organizationName,city:String(raw.unidadeOrgaoMunicipioNome||''),state:String(raw.unidadeOrgaoUfSigla||'')},processNumber:external.processNumber,procurementNumber:external.procurementNumber,modality:String(raw.modalidadeNome||''),object:external.object,estimatedValue:external.estimatedValue,currency:'BRL',publicationDate:external.publicationDate,openingDate:external.openingDate,status:'UNKNOWN',items:[],documents:[],rawData:raw,importedAt:now,updatedAt:now};}
}
