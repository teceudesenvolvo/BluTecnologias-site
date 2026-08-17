import type { ProcurementConnector } from "../core/ProcurementConnector";
import type {
  ConnectorConfiguration,
  ExternalBiddingItem,
  ExternalDocument,
  ExternalOpportunity,
  NormalizedOpportunity,
  OpportunityQuery,
  PaginatedResult,
} from "../core/integrationTypes";
import { IntegrationError } from "../core/IntegrationError";
import { comprasGovProvider } from "./comprasGovProvider";

type ComprasGovRecord = Record<string, unknown> & {
  numeroControlePNCP?: string;
  orgaoEntidadeRazaoSocial?: string;
  orgaoEntidadeCnpj?: string;
  processo?: string;
  numeroCompra?: string;
  objetoCompra?: string;
  valorTotalEstimado?: number;
  dataPublicacaoPncp?: string;
  dataAberturaPropostaPncp?: string;
  situacaoCompraNomePncp?: string;
  unidadeOrgaoMunicipioNome?: string;
  unidadeOrgaoUfSigla?: string;
  modalidadeNome?: string;
};

type ComprasGovPage = {
  resultado?: ComprasGovRecord[];
  totalRegistros?: number;
  paginasRestantes?: number;
};

/**
 * Rota relativa.
 *
 * No localhost, o Vite encaminha a requisição.
 * Na produção, o vercel.json encaminha a requisição.
 */
const BASE = "/api/compras-gov";

const ENDPOINT =
  "/modulo-contratacoes/1_consultarContratacoes_PNCP_14133";

const REQUEST_TIMEOUT_MS = 20_000;

const requestWithTimeout = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

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
    window.clearTimeout(timeout);
  }
};

const readErrorDetails = async (
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

const buildUrl = (params: URLSearchParams): string =>
  `${BASE}${ENDPOINT}?${params.toString()}`;

const normalizePageSize = (pageSize?: number): number =>
  Math.max(10, Math.min(pageSize || 40, 500));

export class ComprasGovConnector
  implements ProcurementConnector
{
  readonly provider = comprasGovProvider;

  async validateConfiguration(
    configuration: ConnectorConfiguration,
  ) {
    return {
      valid: Boolean(configuration.companyId),

      errors: configuration.companyId
        ? []
        : ["Empresa não informada."],

      warnings: [
        "A API de Dados Abertos não exige credenciais.",
        "A consulta é encaminhada por um proxy para evitar bloqueios de CORS.",
      ],
    };
  }

  async testConnection(
    _configuration: ConnectorConfiguration,
  ) {
    const started = Date.now();

    try {
      const today = new Date().toISOString().slice(0, 10);

      const params = new URLSearchParams({
        pagina: "1",
        tamanhoPagina: "10",
        dataPublicacaoPncpInicial: today,
        dataPublicacaoPncpFinal: today,
        codigoModalidade: "8",
      });

      const response = await requestWithTimeout(
        buildUrl(params),
      );

      if (!response.ok && response.status !== 204) {
        throw new IntegrationError(
          "PROVIDER_UNAVAILABLE",
          "A API do Compras.gov.br não respondeu corretamente.",
          "compras-gov",
          "testConnection",
          true,
          await readErrorDetails(response),
        );
      }

      return {
        success: true,
        message: "API pública do Compras.gov.br disponível.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      console.error(
        "[Compras.gov.br] Falha no teste de conexão:",
        error,
      );

      return {
        success: false,
        message: "API do Compras.gov.br não respondeu.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    }
  }

  async listOpportunities(
    filters: OpportunityQuery,
    cursor = "1",
  ): Promise<PaginatedResult<ExternalOpportunity>> {
    const params = new URLSearchParams({
      pagina: cursor,
      tamanhoPagina: String(
        normalizePageSize(filters.pageSize),
      ),
      dataPublicacaoPncpInicial: filters.startDate,
      dataPublicacaoPncpFinal: filters.endDate,
    });

    if (filters.modalityCode) {
      params.set(
        "codigoModalidade",
        String(filters.modalityCode),
      );
    }

    if (filters.state) {
      params.set(
        "unidadeOrgaoUfSigla",
        filters.state,
      );
    }

    const url = buildUrl(params);

    try {
      const response = await requestWithTimeout(url);

      if (response.status === 204) {
        return {
          data: [],
          total: 0,
          nextCursor: undefined,
        };
      }

      if (response.status === 429) {
        throw new IntegrationError(
          "RATE_LIMITED",
          "O Compras.gov.br limitou temporariamente as consultas.",
          "compras-gov",
          "listOpportunities",
          true,
          {
            status: response.status,
            url,
          },
        );
      }

      if (!response.ok) {
        throw new IntegrationError(
          "PROVIDER_UNAVAILABLE",
          "O Compras.gov.br está temporariamente indisponível.",
          "compras-gov",
          "listOpportunities",
          true,
          await readErrorDetails(response),
        );
      }

      const page =
        (await response.json()) as ComprasGovPage;

      if (
        page.resultado !== undefined &&
        !Array.isArray(page.resultado)
      ) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "O Compras.gov.br retornou uma resposta inválida.",
          "compras-gov",
          "listOpportunities",
          true,
          {
            url,
            response: page,
          },
        );
      }

      const data = (page.resultado || [])
        .filter(
          (
            item,
          ): item is ComprasGovRecord & {
            numeroControlePNCP: string;
          } =>
            typeof item.numeroControlePNCP === "string" &&
            item.numeroControlePNCP.trim().length > 0,
        )
        .map((item) => this.toExternal(item));

      return {
        data,

        total:
          typeof page.totalRegistros === "number"
            ? page.totalRegistros
            : undefined,

        nextCursor:
          typeof page.paginasRestantes === "number" &&
          page.paginasRestantes > 0
            ? String(Number(cursor) + 1)
            : undefined,
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível consultar o Compras.gov.br agora.",
        "compras-gov",
        "listOpportunities",
        true,
        error,
      );
    }
  }

  private toExternal(
    item: ComprasGovRecord & {
      numeroControlePNCP: string;
    },
  ): ExternalOpportunity {
    return {
      externalId: item.numeroControlePNCP,
      source: "compras-gov",

      organizationName:
        item.orgaoEntidadeRazaoSocial ||
        "Órgão não informado",

      organizationCnpj:
        item.orgaoEntidadeCnpj,

      processNumber:
        item.processo,

      procurementNumber:
        item.numeroCompra,

      object:
        item.objetoCompra ||
        "Objeto não informado",

      estimatedValue:
        item.valorTotalEstimado,

      publicationDate:
        item.dataPublicacaoPncp,

      openingDate:
        item.dataAberturaPropostaPncp,

      status:
        item.situacaoCompraNomePncp,

      raw: item,
    };
  }

  async getOpportunityById(
    _externalId: string,
  ): Promise<ExternalOpportunity | null> {
    return null;
  }

  async listOpportunityItems(
    _externalId: string,
  ): Promise<ExternalBiddingItem[]> {
    return [];
  }

  async listOpportunityDocuments(
    _externalId: string,
  ): Promise<ExternalDocument[]> {
    return [];
  }

  async normalizeOpportunity(
    external: ExternalOpportunity,
  ): Promise<NormalizedOpportunity> {
    const raw =
      external.raw as ComprasGovRecord;

    const now = new Date().toISOString();

    return {
      id: `compras-gov:${external.externalId}`,
      source: "compras-gov",
      sourceId: external.externalId,

      organization: {
        cnpj: external.organizationCnpj,
        name: external.organizationName,

        city:
          typeof raw.unidadeOrgaoMunicipioNome === "string"
            ? raw.unidadeOrgaoMunicipioNome
            : "",

        state:
          typeof raw.unidadeOrgaoUfSigla === "string"
            ? raw.unidadeOrgaoUfSigla
            : "",
      },

      processNumber: external.processNumber,
      procurementNumber: external.procurementNumber,

      modality:
        typeof raw.modalidadeNome === "string"
          ? raw.modalidadeNome
          : "",

      object: external.object,
      estimatedValue: external.estimatedValue,
      currency: "BRL",
      publicationDate: external.publicationDate,
      openingDate: external.openingDate,
      status: "UNKNOWN",
      items: [],
      documents: [],
      rawData: raw,
      importedAt: now,
      updatedAt: now,
    };
  }
}
