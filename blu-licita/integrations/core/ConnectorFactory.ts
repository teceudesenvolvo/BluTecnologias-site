import type { ProcurementConnector } from './ProcurementConnector';
import { IntegrationError } from './IntegrationError';
import type { ConnectorRegistry } from './ConnectorRegistry';
export class ConnectorFactory { constructor(private readonly registry: ConnectorRegistry) {} create(providerId: string): ProcurementConnector { const connector = this.registry.get(providerId); if (!connector) throw new IntegrationError('NOT_SUPPORTED', 'Integração ainda não disponível.', providerId, 'create'); return connector; } }
