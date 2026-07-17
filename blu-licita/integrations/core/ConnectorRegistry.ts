import type { ProcurementConnector } from './ProcurementConnector';
export class ConnectorRegistry { private readonly connectors = new Map<string, ProcurementConnector>(); register(connector: ProcurementConnector) { this.connectors.set(connector.provider.id, connector); return this; } get(id: string) { return this.connectors.get(id); } list() { return [...this.connectors.values()]; } }
