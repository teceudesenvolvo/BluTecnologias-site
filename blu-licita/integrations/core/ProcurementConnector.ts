import type { IntegrationProvider } from './IntegrationProvider';
import type { ConnectorConfiguration, ValidationResult, ConnectionTestResult, OpportunityQuery, PaginatedResult, ExternalOpportunity, ExternalBiddingItem, ExternalDocument, ExternalBiddingResult, ContractQuery, ExternalContract, NormalizedOpportunity, NormalizedContract } from './integrationTypes';

export interface ProcurementConnector {
  readonly provider: IntegrationProvider;
  validateConfiguration(configuration: ConnectorConfiguration): Promise<ValidationResult>;
  testConnection(configuration: ConnectorConfiguration): Promise<ConnectionTestResult>;
  listOpportunities(filters: OpportunityQuery, cursor?: string): Promise<PaginatedResult<ExternalOpportunity>>;
  getOpportunityById(externalId: string): Promise<ExternalOpportunity | null>;
  listOpportunityItems(externalId: string): Promise<ExternalBiddingItem[]>;
  listOpportunityDocuments(externalId: string): Promise<ExternalDocument[]>;
  getResult?(externalId: string): Promise<ExternalBiddingResult | null>;
  listContracts?(filters: ContractQuery): Promise<PaginatedResult<ExternalContract>>;
  normalizeOpportunity(external: ExternalOpportunity): Promise<NormalizedOpportunity>;
  normalizeContract?(external: ExternalContract): Promise<NormalizedContract>;
}
