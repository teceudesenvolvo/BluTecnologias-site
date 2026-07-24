import type { ProcurementConnector } from "../core/ProcurementConnector";
import type {
  ConnectorConfiguration,
  OpportunityQuery,
  ExternalOpportunity,
  ExternalBiddingItem,
  ExternalDocument,
} from "../core/integrationTypes";
import { IntegrationError } from "../core/IntegrationError";
import { pncpProvider } from "./pncpProvider";
import { PncpMapper } from "./PncpMapper";
import type {
  PncpModality,
  PncpOpportunityBundle,
  PncpPage,
} from "./pncpTypes";

/**
 * URLs oficiais do PNCP.
 *
 * Não usamos caminhos relativos como "/api/pncp/..." porque eles dependem
 * do proxy do Vite e quebram quando o frontend é publicado na Vercel.
 */
const PNCP_ORIGIN =
  String(import.meta.env.VITE_PNCP_ORIGIN || "https://pncp.gov.br").replace(
    /\/+$/,
    "",
  );

const BASE_URL = `${PNCP_ORIGIN}/api/consulta/v1`;
const DOMAIN_BASE_URL = `${PNCP_ORIGIN}/api/pncp/v1`;

const REQUEST_TIMEOUT_MS = 15_000;

const ymd = (value: string): string =>
  value.replace(/-/g, "").slice(0, 8);

const requestWithTimeout = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const responseErrorDetails = async (
  response: Response,
): Promise<Record<string, unknown>> => {
  const body = await response.text().catch(() => "");

  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    body: body.slice(0, 500),
  };
};

export class PncpConnector implements ProcurementConnector {
  readonly provider = pncpProvider;

  private readonly mapper = new PncpMapper();

  async validateConfiguration(configuration: ConnectorConfiguration) {
    return {
      valid: Boolean(configuration.companyId),
      errors: configuration.companyId
        ? []
        : ["Empresa não informada."],
      warnings: [
        "A consulta pública não exige credenciais. Sincronizações agendadas deverão migrar para o backend.",
      ],
    };
  }

  async listModalities(): Promise<PncpModality[]> {
    const url = `${DOMAIN_BASE_URL}/modalidades?statusAtivo=true`;

    try {
      const response = await requestWithTimeout(url);

      if (!response.ok) {
        throw new IntegrationError(
          "PROVIDER_UNAVAILABLE",
          "Não foi possível carregar as modalidades oficiais do PNCP.",
          "pncp",
          "listModalities",
          true,
          await responseErrorDetails(response),
        );
      }

      const data = (await response.json()) as PncpModality[];

      if (!Array.isArray(data)) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "O PNCP retornou um formato inválido para as modalidades.",
          "pncp",
          "listModalities",
          true,
          { url },
        );
      }

      return data;
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível carregar as modalidades oficiais do PNCP.",
        "pncp",
        "listModalities",
        true,
        error,
      );
    }
  }

  private parseControlNumber(externalId: string) {
    const match = /^(\d{14})-1-(\d+)\/(\d{4})$/.exec(externalId);

    if (!match) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "Identificador PNCP inválido.",
        "pncp",
        "parseControlNumber",
      );
    }

    return {
      cnpj: match[1],
      sequencial: String(Number(match[2])),
      ano: match[3],
    };
  }

  private async getJson<T>(
    path: string,
    fallback: T,
    baseUrl = BASE_URL,
  ): Promise<T> {
    const url = `${baseUrl}${path}`;

    const response = await requestWithTimeout(url);

    if (response.status === 204 || response.status === 404) {
      return fallback;
    }

    if (!response.ok) {
      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível carregar todos os dados desta oportunidade.",
        "pncp",
        "getDetail",
        true,
        {
          path,
          ...(await responseErrorDetails(response)),
        },
      );
    }

    return (await response.json()) as T;
  }

  private async getOptionalJson<T>(
    path: string,
    fallback: T,
    baseUrl = DOMAIN_BASE_URL,
  ): Promise<T> {
    try {
      return await this.getJson(path, fallback, baseUrl);
    } catch (error) {
      console.warn("[PNCP] Dado opcional indisponível:", {
        path,
        error,
      });

      return fallback;
    }
  }

  async getOpportunityBundle(
    externalId: string,
  ): Promise<PncpOpportunityBundle> {
    const { cnpj, ano, sequencial } =
      this.parseControlNumber(externalId);

    const base = `/orgaos/${cnpj}/compras/${ano}/${sequencial}`;

    try {
      const [detail, items, documents, history, contracts] =
        await Promise.all([
          this.getJson<Record<string, unknown>>(base, {}),

          this.getOptionalJson<Array<Record<string, unknown>>>(
            `${base}/itens`,
            [],
          ),

          this.getOptionalJson<Array<Record<string, unknown>>>(
            `${base}/arquivos`,
            [],
          ),

          this.getOptionalJson<Array<Record<string, unknown>>>(
            `${base}/historico`,
            [],
          ),

          this.getOptionalJson<Array<Record<string, unknown>>>(
            `/orgaos/${cnpj}/contratos/contratacao/${ano}/${sequencial}`,
            [],
          ),
        ]);

      const resultGroups = await Promise.all(
        items
          .filter((item) => item.temResultado === true)
          .map(async (item) => {
            const numero = Number(item.numeroItem);

            const results = await this.getOptionalJson<
              Array<Record<string, unknown>>
            >(`${base}/itens/${numero}/resultados`, []);

            return results.map((result) => ({
              ...result,
              numeroItem: numero,
              descricaoItem: item.descricao,
            }));
          }),
      );

      return {
        detail,
        items,
        results: resultGroups.flat(),
        documents,
        history,
        contracts,
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível carregar os detalhes do PNCP.",
        "pncp",
        "getOpportunityBundle",
        true,
        error,
      );
    }
  }

  async testConnection(_configuration: ConnectorConfiguration) {
    const started = Date.now();
    const today = ymd(new Date().toISOString());

    try {
      const params = new URLSearchParams({
        dataInicial: today,
        dataFinal: today,
        codigoModalidadeContratacao: "8",
        pagina: "1",
      });

      const response = await requestWithTimeout(
        `${BASE_URL}/contratacoes/publicacao?${params.toString()}`,
      );

      if (!response.ok && response.status !== 204) {
        throw new Error(`PNCP respondeu com status ${response.status}`);
      }

      return {
        success: true,
        message: "API pública do PNCP disponível.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    } catch {
      return {
        success: false,
        message: "O PNCP não respondeu. Tente novamente mais tarde.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    }
  }

  async listOpportunities(
    filters: OpportunityQuery,
    cursor = "1",
  ) {
    if (!filters.modalityCode) {
      throw new IntegrationError(
        "CONFIGURATION_REQUIRED",
        "Selecione uma modalidade para consultar o PNCP.",
        "pncp",
        "listOpportunities",
      );
    }

    const params = new URLSearchParams({
      dataInicial: ymd(filters.startDate),
      dataFinal: ymd(filters.endDate),
      codigoModalidadeContratacao: String(filters.modalityCode),
      pagina: cursor,
    });

    if (filters.state) {
      params.set("uf", filters.state);
    }

    const url =
      `${BASE_URL}/contratacoes/publicacao?${params.toString()}`;

    try {
      const response = await requestWithTimeout(url);

      if (response.status === 429) {
        throw new IntegrationError(
          "RATE_LIMITED",
          "O PNCP limitou temporariamente as consultas.",
          "pncp",
          "listOpportunities",
          true,
          { url },
        );
      }

      if (response.status === 204) {
        return {
          data: [],
          total: 0,
        };
      }

      if (!response.ok) {
        throw new IntegrationError(
          "PROVIDER_UNAVAILABLE",
          "O PNCP está temporariamente indisponível.",
          "pncp",
          "listOpportunities",
          true,
          await responseErrorDetails(response),
        );
      }

      const page = (await response.json()) as PncpPage;

      return {
        data: (page.data || []).map((item) =>
          this.mapper.toExternal(item),
        ),

        nextCursor:
          page.paginasRestantes && page.paginasRestantes > 0
            ? String(Number(cursor) + 1)
            : undefined,

        total: page.totalRegistros,
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível consultar o PNCP agora.",
        "pncp",
        "listOpportunities",
        true,
        error,
      );
    }
  }

  async getOpportunityById(
    externalId: string,
  ): Promise<ExternalOpportunity | null> {
    const bundle = await this.getOpportunityBundle(externalId);

    return this.mapper.toExternal(
      bundle.detail as unknown as import("./pncpTypes").PncpPublication,
    );
  }

  async listOpportunityItems(
    _externalId: string,
  ): Promise<ExternalBiddingItem[]> {
    throw new IntegrationError(
      "NOT_SUPPORTED",
      "Consulta de itens preparada para a próxima etapa.",
      "pncp",
      "listOpportunityItems",
    );
  }

  async listOpportunityDocuments(
    _externalId: string,
  ): Promise<ExternalDocument[]> {
    throw new IntegrationError(
      "NOT_SUPPORTED",
      "Consulta de documentos preparada para a próxima etapa.",
      "pncp",
      "listOpportunityDocuments",
    );
  }

  async normalizeOpportunity(external: ExternalOpportunity) {
    return this.mapper.toNormalized(external);
  }
}