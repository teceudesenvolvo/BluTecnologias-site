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
import { tceCeProvider } from "./tceCeProvider";

export type TceCeMunicipality = {
  codigo_municipio: string;
  nome_municipio: string;
  codigo_municipio_ibge?: string;
};

type Row = Record<string, unknown> & {
  codigo_municipio: string;
  numero_licitacao: string;
  descricao_objeto_licitacao: string;
  valor_orcado_estimado?: number;
  data_realizacao_autuacao_licitacao?: string;
  data_realizacao_licitacao?: string;
  modalidade_licitacao?: string;
  numero_id_contratacao_pncp?: string;
};

type TceResponse<T> = {
  elements?: T[];
  links?: Array<{
    rel: string;
    href?: string;
  }>;
};

const TCE_CE_ORIGIN = String(
  import.meta.env.VITE_TCE_CE_ORIGIN ||
    "https://api-dados-abertos.tce.ce.gov.br",
).replace(/\/+$/, "");

const BASE_URL = `${TCE_CE_ORIGIN}/sim`;

const REQUEST_TIMEOUT_MS = 20_000;

const suspiciousMojibake =
  /Ã|â|ðŸ|�|&#\d+;|[\u00C0-\u00FF]{2,}[\u0080-\u00BF]?/;

const scorePortugueseText = (value: string) => {
  const replacementPenalty = (value.match(/�/g) || []).length * -5;
  const portugueseBonus =
    (value.match(/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/g) || []).length * 2;
  const readableBonus =
    (value.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
  return replacementPenalty + portugueseBonus + readableBonus;
};

const tryDecodeUtf8FromLatin1 = (value: string) => {
  try {
    return decodeURIComponent(
      Array.from(value)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  } catch {
    return value;
  }
};

const repair = (value: string): string => {
  const original = String(value || "");

  if (!original || !suspiciousMojibake.test(original)) {
    return original;
  }

  const candidates = [
    original,
    tryDecodeUtf8FromLatin1(original),
    (() => {
      try {
        return new TextDecoder("utf-8").decode(
          Uint8Array.from(original, (char) => char.charCodeAt(0) & 0xff),
        );
      } catch {
        return original;
      }
    })(),
  ]
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return candidates.sort(
    (left, right) => scorePortugueseText(right) - scorePortugueseText(left),
  )[0] || original;
};

const repairDeep = <T,>(value: T): T => {
  if (typeof value === "string") {
    return repair(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        repairDeep(item),
      ]),
    ) as T;
  }

  return value;
};

const requestWithTimeout = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
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
    window.clearTimeout(timeoutId);
  }
};

const readErrorBody = async (
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

const buildTceUrl = (
  method: string,
  params?: URLSearchParams,
): string => {
  const normalizedMethod = method.replace(/^\/+/, "");

  const url = `${BASE_URL}/${normalizedMethod}`;

  if (!params || params.size === 0) {
    return url;
  }

  return `${url}?${params.toString()}`;
};

export class TceCeConnector implements ProcurementConnector {
  readonly provider = tceCeProvider;

  async listMunicipalities(): Promise<TceCeMunicipality[]> {
    const params = new URLSearchParams({
      $format: "json",
      $count: "1000",
      $start_index: "0",
    });

    const url = buildTceUrl("municipios", params);

    try {
      const response = await requestWithTimeout(url);

      if (!response.ok) {
        throw new IntegrationError(
          "PROVIDER_UNAVAILABLE",
          "Não foi possível carregar os municípios do TCE-CE.",
          "tce-ce",
          "listMunicipalities",
          true,
          await readErrorBody(response),
        );
      }

      const body =
        (await response.json()) as TceResponse<TceCeMunicipality>;

      if (!Array.isArray(body.elements)) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "O TCE-CE retornou uma resposta inválida para os municípios.",
          "tce-ce",
          "listMunicipalities",
          true,
          {
            url,
            response: body,
          },
        );
      }

      return body.elements
        .filter((item) => item.codigo_municipio !== "001")
        .sort((a, b) =>
          a.nome_municipio.localeCompare(
            b.nome_municipio,
            "pt-BR",
          ),
        );
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível carregar os municípios do TCE-CE.",
        "tce-ce",
        "listMunicipalities",
        true,
        error,
      );
    }
  }

  async validateConfiguration(
    configuration: ConnectorConfiguration,
  ) {
    return {
      valid: Boolean(configuration.companyId),

      errors: configuration.companyId
        ? []
        : ["Empresa não informada."],

      warnings: [
        "A consulta pública não exige credenciais.",
        "Para sincronizações recorrentes, prefira executar a integração pelo backend.",
      ],
    };
  }

  async testConnection(
    _configuration: ConnectorConfiguration,
  ) {
    const started = Date.now();

    try {
      await this.listMunicipalities();

      return {
        success: true,
        message: "API do SIM/TCE-CE disponível.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      console.error(
        "[TCE-CE] Falha no teste de conexão:",
        error,
      );

      return {
        success: false,
        message: "TCE-CE indisponível.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    }
  }

  private async listMunicipality(
    code: string,
    filters: OpportunityQuery,
    startIndex = "0",
  ): Promise<TceResponse<Row>> {
    const count = Math.min(
      Math.max(filters.pageSize || 40, 1),
      1000,
    );

    const params = new URLSearchParams({
      codigo_municipio: code,
      data_inicio: filters.startDate,
      data_fim: filters.endDate,
      $format: "json",
      $count: String(count),
      $start_index: startIndex,
    });

    const url = buildTceUrl(
      "processos_administrativos_contratacoes",
      params,
    );

    const response = await requestWithTimeout(url);

    if (!response.ok) {
      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        `Não foi possível consultar as licitações do município ${code}.`,
        "tce-ce",
        "listMunicipality",
        true,
        {
          municipalityCode: code,
          ...(await readErrorBody(response)),
        },
      );
    }

    const body = (await response.json()) as TceResponse<Row>;

    if (
      body.elements !== undefined &&
      !Array.isArray(body.elements)
    ) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "O TCE-CE retornou uma lista de licitações inválida.",
        "tce-ce",
        "listMunicipality",
        true,
        {
          municipalityCode: code,
          url,
        },
      );
    }

    return body;
  }

  async listOpportunities(
    filters: OpportunityQuery,
    cursor = "0",
  ): Promise<PaginatedResult<ExternalOpportunity>> {
    try {
      if (filters.municipalityCode) {
        const body = await this.listMunicipality(
          filters.municipalityCode,
          filters,
          cursor,
        );

        const count = Math.min(
          Math.max(filters.pageSize || 40, 1),
          1000,
        );

        return {
          data: (body.elements || []).map((row) =>
            this.toExternal(row),
          ),

          nextCursor: body.links?.some(
            (link) => link.rel === "next",
          )
            ? String(Number(cursor) + count)
            : undefined,

          total: undefined,
        };
      }

      const municipalities =
        await this.listMunicipalities();

      const groupSize = 12;
      const group = Math.max(0, Number(cursor) || 0);

      const selected = municipalities.slice(
        group * groupSize,
        (group + 1) * groupSize,
      );

      if (selected.length === 0) {
        return {
          data: [],
          nextCursor: undefined,
          total: 0,
        };
      }

      const results = await Promise.allSettled(
        selected.map((municipality) =>
          this.listMunicipality(
            municipality.codigo_municipio,
            {
              ...filters,
              pageSize: 1000,
            },
          ),
        ),
      );

      const failedMunicipalities: string[] = [];

      const data = results.flatMap((result, index) => {
        if (result.status === "fulfilled") {
          return (result.value.elements || []).map((row) =>
            this.toExternal(row),
          );
        }

        const municipality = selected[index];

        failedMunicipalities.push(
          municipality?.codigo_municipio || "desconhecido",
        );

        console.warn(
          "[TCE-CE] Falha ao consultar município:",
          municipality,
          result.reason,
        );

        return [];
      });

      if (
        failedMunicipalities.length === selected.length &&
        selected.length > 0
      ) {
        throw new IntegrationError(
          "PROVIDER_UNAVAILABLE",
          "Nenhum dos municípios selecionados respondeu à consulta do TCE-CE.",
          "tce-ce",
          "listOpportunities",
          true,
          {
            failedMunicipalities,
          },
        );
      }

      return {
        data,

        nextCursor:
          (group + 1) * groupSize < municipalities.length
            ? String(group + 1)
            : undefined,

        total: undefined,
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível consultar o TCE-CE.",
        "tce-ce",
        "listOpportunities",
        true,
        error,
      );
    }
  }

  private toExternal(row: Row): ExternalOpportunity {
    const normalizedRow = repairDeep(row);
    const pncp = String(
      normalizedRow.numero_id_contratacao_pncp || "",
    ).trim();

    return {
      externalId:
        pncp ||
        `CE-${normalizedRow.codigo_municipio}-${normalizedRow.numero_licitacao}`,

      source: "tce-ce",

      organizationName:
        `Município do Ceará · código ${normalizedRow.codigo_municipio}`,

      processNumber:
        normalizedRow.numero_licitacao || "Não informado",

      object: repair(
        normalizedRow.descricao_objeto_licitacao ||
          "Objeto não informado",
      ),

      estimatedValue:
        typeof normalizedRow.valor_orcado_estimado === "number"
          ? normalizedRow.valor_orcado_estimado
          : undefined,

      publicationDate:
        normalizedRow.data_realizacao_autuacao_licitacao,

      openingDate:
        normalizedRow.data_realizacao_licitacao,

      status: "Informado ao TCE-CE",

      raw: normalizedRow,
    };
  }

  async getOpportunityById(
    _id: string,
  ): Promise<ExternalOpportunity | null> {
    return null;
  }

  async listOpportunityItems(
    _id: string,
  ): Promise<ExternalBiddingItem[]> {
    return [];
  }

  async listOpportunityDocuments(
    _id: string,
  ): Promise<ExternalDocument[]> {
    return [];
  }

  async normalizeOpportunity(
    external: ExternalOpportunity,
  ): Promise<NormalizedOpportunity> {
    const now = new Date().toISOString();

    return {
      id: `tce-ce:${external.externalId}`,

      source: "tce-ce",

      sourceId: external.externalId,

      organization: {
        name: external.organizationName,
        state: "CE",
      },

      processNumber: external.processNumber,

      object: external.object,

      estimatedValue: external.estimatedValue,

      currency: "BRL",

      publicationDate: external.publicationDate,

      openingDate: external.openingDate,

      status: "PUBLISHED",

      items: [],

      documents: [],

      rawData: external.raw,

      importedAt: now,

      updatedAt: now,
    };
  }
}
