import type { IntegrationProvider } from '../core/IntegrationProvider';

const research = (id: string, name: string, website: string, description: string, availability: IntegrationProvider['availability'] = 'UNDER_RESEARCH'): IntegrationProvider => ({ id, name, website, description, availability, authenticationType: 'UNKNOWN', supportsOpportunities: true, supportsDocuments: false, supportsItems: false, supportsResults: false, supportsSuppliers: false, supportsContracts: false, supportsMinutes: false, supportsWebhooks: false, requiresCommercialAgreement: availability === 'PARTNER_API', notes: 'Nenhuma API pública para consumo por terceiros foi confirmada. Não realiza chamadas externas.' });
export const privateProviders: IntegrationProvider[] = [
  research('portal-compras-publicas','Portal de Compras Públicas','https://www.portaldecompraspublicas.com.br','Plataforma privada de contratações públicas.'),
  research('licitanet','Licitanet','https://www.licitanet.com.br','Plataforma privada de licitações eletrônicas.'),
  research('bll','BLL Compras','https://bll.org.br','Integrações com PNCP e ERPs anunciadas; documentação pública para terceiros não localizada.','PARTNER_API'),
  research('bnc','BNC Compras','https://bnc.org.br','Bolsa Nacional de Compras.','PARTNER_API'),
  research('bbmnet','BBMNet','https://bbmnet.com.br','Mantém APIs para ERPs e órgãos de controle, sujeitas a relacionamento comercial.','PARTNER_API'),
  research('licitar-digital','Licitar Digital','https://licitardigital.com.br','Plataforma privada de compras públicas.'),
  research('licitacoes-e','Licitações-e','https://licitacoes-e2.bb.com.br','Plataforma de licitações do Banco do Brasil.','PARTNER_API'),
];
