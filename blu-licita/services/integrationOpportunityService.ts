import { connectorRegistry } from "../integrations/registry";
import { PncpConnector } from "../integrations/pncp/PncpConnector";
import type { PncpModality } from "../integrations/pncp/pncpTypes";
import type { PncpOpportunityBundle } from "../integrations/pncp/pncpTypes";
import type {
  ExternalOpportunity,
  OpportunityQuery,
  PaginatedResult,
} from "../integrations/core/integrationTypes";
import { TceCeConnector } from "../integrations/tce-ce/TceCeConnector";

const pncp = connectorRegistry.get("pncp");
if (!(pncp instanceof PncpConnector))
  throw new Error("Conector PNCP não registrado.");

export const integrationOpportunityService = {
  listModalities: (): Promise<PncpModality[]> => pncp.listModalities(),
  listTceCeMunicipalities: () => {
    const connector = connectorRegistry.get("tce-ce");
    if (!(connector instanceof TceCeConnector))
      throw new Error("TCE-CE não registrado.");
    return connector.listMunicipalities();
  },
  list: async (
    source: "pncp" | "compras-gov" | "tce-ce" | "portal-compras-publicas",
    filters: OpportunityQuery,
    cursor?: string,
  ): Promise<PaginatedResult<ExternalOpportunity>> => {
    const connector = connectorRegistry.get(source);
    if (!connector) throw new Error("Fonte não registrada.");
    try {
      if (source !== "pncp") return await connector.listOpportunities(filters, cursor);
      return await Promise.race([
        connector.listOpportunities(filters, cursor),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("PNCP_TIMEOUT")), 8000)),
      ]);
    } catch (error) {
      if (source !== "pncp") throw error;
      const fallback = connectorRegistry.get("compras-gov");
      if (!fallback) throw error;
      return await fallback.listOpportunities(filters, cursor);
    }
  },
  getDetails: (externalId: string): Promise<PncpOpportunityBundle> =>
    pncp.getOpportunityBundle(externalId),
};
