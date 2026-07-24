import { connectorRegistry } from "../integrations/registry";
import { PncpConnector } from "../integrations/pncp/PncpConnector";
import type {
  PncpModality,
  PncpOpportunityBundle,
} from "../integrations/pncp/pncpTypes";
import type {
  ExternalOpportunity,
  OpportunityQuery,
  PaginatedResult,
} from "../integrations/core/integrationTypes";
import { TceCeConnector } from "../integrations/tce-ce/TceCeConnector";

export type OpportunitySource =
  | "pncp"
  | "compras-gov"
  | "tce-ce"
  | "portal-compras-publicas";

const PNCP_TIMEOUT_MS = 15_000;

const getPncpConnector = (): PncpConnector => {
  const connector = connectorRegistry.get("pncp");

  if (!(connector instanceof PncpConnector)) {
    throw new Error("Conector PNCP não registrado.");
  }

  return connector;
};

const getTceCeConnector = (): TceCeConnector => {
  const connector = connectorRegistry.get("tce-ce");

  if (!(connector instanceof TceCeConnector)) {
    throw new Error("Conector TCE-CE não registrado.");
  }

  return connector;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const pncp = getPncpConnector();

export const integrationOpportunityService = {
  async listModalities(): Promise<PncpModality[]> {
    try {
      return await withTimeout(
        pncp.listModalities(),
        PNCP_TIMEOUT_MS,
        "A consulta de modalidades do PNCP excedeu o tempo limite.",
      );
    } catch (error) {
      console.error("[PNCP] Erro ao consultar modalidades:", error);

      throw new Error(
        `Não foi possível carregar as modalidades do PNCP. ${errorMessage(
          error,
        )}`,
      );
    }
  },

  async listTceCeMunicipalities() {
    const connector = getTceCeConnector();

    try {
      return await connector.listMunicipalities();
    } catch (error) {
      console.error("[TCE-CE] Erro ao consultar municípios:", error);

      throw new Error(
        `Não foi possível carregar os municípios do TCE-CE. ${errorMessage(
          error,
        )}`,
      );
    }
  },

  async list(
    source: OpportunitySource,
    filters: OpportunityQuery,
    cursor?: string,
  ): Promise<PaginatedResult<ExternalOpportunity>> {
    const connector = connectorRegistry.get(source);

    if (!connector) {
      throw new Error(`Fonte não registrada: ${source}.`);
    }

    if (source !== "pncp") {
      try {
        return await connector.listOpportunities(filters, cursor);
      } catch (error) {
        console.error(
          `[${source}] Erro ao consultar oportunidades:`,
          error,
        );

        throw new Error(
          `Não foi possível consultar a fonte ${source}. ${errorMessage(
            error,
          )}`,
        );
      }
    }

    try {
      return await withTimeout(
        connector.listOpportunities(filters, cursor),
        PNCP_TIMEOUT_MS,
        "A consulta do PNCP excedeu o tempo limite.",
      );
    } catch (pncpError) {
      console.warn(
        "[PNCP] Consulta falhou. Tentando fallback no Compras.gov:",
        pncpError,
      );

      const fallback = connectorRegistry.get("compras-gov");

      if (!fallback) {
        throw new Error(
          `Falha na consulta do PNCP e o fallback Compras.gov não está registrado. ${errorMessage(
            pncpError,
          )}`,
        );
      }

      try {
        return await fallback.listOpportunities(filters, cursor);
      } catch (fallbackError) {
        console.error(
          "[Compras.gov] Falha no fallback:",
          fallbackError,
        );

        throw new Error(
          [
            "Não foi possível consultar as oportunidades.",
            `PNCP: ${errorMessage(pncpError)}.`,
            `Compras.gov: ${errorMessage(fallbackError)}.`,
          ].join(" "),
        );
      }
    }
  },

  async getDetails(
    externalId: string,
  ): Promise<PncpOpportunityBundle> {
    try {
      return await withTimeout(
        pncp.getOpportunityBundle(externalId),
        PNCP_TIMEOUT_MS,
        "A consulta dos detalhes do PNCP excedeu o tempo limite.",
      );
    } catch (error) {
      console.error(
        `[PNCP] Erro ao consultar detalhes ${externalId}:`,
        error,
      );

      throw new Error(
        `Não foi possível carregar os detalhes da oportunidade. ${errorMessage(
          error,
        )}`,
      );
    }
  },
};