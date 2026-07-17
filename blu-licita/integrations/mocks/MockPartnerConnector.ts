import type { ProcurementConnector } from '../core/ProcurementConnector';
import type { IntegrationProvider } from '../core/IntegrationProvider';
import type { ConnectorConfiguration, OpportunityQuery, ExternalOpportunity, PaginatedResult, NormalizedOpportunity } from '../core/integrationTypes';
import { IntegrationError } from '../core/IntegrationError';

export class MockPartnerConnector implements ProcurementConnector {
  constructor(public readonly provider: IntegrationProvider) {}
  async validateConfiguration(configuration: ConnectorConfiguration) { return { valid: Boolean(configuration.companyId && configuration.connectionName), errors: configuration.companyId ? [] : ['Empresa não informada.'], warnings: ['Credenciais e segredos só poderão ser configurados no backend seguro.'] }; }
  async testConnection(_configuration: ConnectorConfiguration) { return { success: false, message: this.provider.requiresCommercialAgreement ? 'Aguardando homologação ou parceria comercial.' : 'Conector em pesquisa. Nenhuma chamada externa foi realizada.', checkedAt: new Date().toISOString() }; }
  async listOpportunities(_filters: OpportunityQuery): Promise<PaginatedResult<ExternalOpportunity>> { throw new IntegrationError(this.provider.requiresCommercialAgreement ? 'PARTNERSHIP_REQUIRED' : 'NOT_SUPPORTED', 'Esta fonte ainda não está habilitada.', this.provider.id, 'listOpportunities'); }
  async getOpportunityById(_externalId: string): Promise<ExternalOpportunity | null> { return null; }
  async listOpportunityItems(_externalId: string) { return []; }
  async listOpportunityDocuments(_externalId: string) { return []; }
  async normalizeOpportunity(_external: ExternalOpportunity): Promise<NormalizedOpportunity> { throw new IntegrationError('NOT_SUPPORTED', 'Normalização indisponível até homologação do provedor.', this.provider.id, 'normalizeOpportunity'); }
}
