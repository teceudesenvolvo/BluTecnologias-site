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
import { portalComprasPublicasProvider } from "./portalComprasPublicasProvider";
type RecordItem = Record<string, unknown>;
type Page = {
  quantidadeTotal?: number;
  paginaAtual?: number | string;
  dadosLicitacoes?: RecordItem[];
};
const BASE = "/api/portal-compras-publicas";
const key = () =>
  String(import.meta.env.VITE_PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY || "").trim();
const br = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(.*)$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}${match[4]}` : value;
};
const pick = (row: RecordItem, ...names: string[]) => {
  for (const name of names)
    if (row[name] !== undefined && row[name] !== null) return row[name];
  return undefined;
};
export class PortalComprasPublicasConnector implements ProcurementConnector {
  readonly provider = portalComprasPublicasProvider;
  async validateConfiguration(_configuration: ConnectorConfiguration) {
    return {
      valid: Boolean(key()),
      errors: key() ? [] : ["Informe VITE_PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY."],
      warnings: [],
    };
  }
  async testConnection(_configuration: ConnectorConfiguration) {
    const started = Date.now();
    if (!key())
      return {
        success: false,
        message: "PublicKey do Portal de Compras Públicas não configurada.",
        checkedAt: new Date().toISOString(),
      };
    try {
      await this.listOpportunities(
        {
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
        },
        "1",
      );
      return {
        success: true,
        message: "API do Portal de Compras Públicas disponível.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    } catch {
      return {
        success: false,
        message: "O Portal de Compras Públicas não respondeu.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    }
  }
  async listOpportunities(
    filters: OpportunityQuery,
    cursor = "1",
  ): Promise<PaginatedResult<ExternalOpportunity>> {
    if (!key())
      throw new IntegrationError(
        "CONFIGURATION_REQUIRED",
        "Configure a publicKey do Portal de Compras Públicas em VITE_PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY.",
        "portal-compras-publicas",
        "listOpportunities",
      );
    const format = (value: string) =>
      new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
    try {
      const pages = await Promise.all(
        [1, 2, 3, 4, 5, 6, 7, 8].map(async (cdSituacao) => {
          const params = new URLSearchParams({
            publicKey: key(),
            cdSituacao: String(cdSituacao),
            dataInicio: format(filters.startDate),
            dataFim: format(filters.endDate),
            pagina: cursor,
          });
          const response = await fetch(
            `${BASE}/publico/listarProcessos/?${params}`,
          );
          if (!response.ok) throw new Error(String(response.status));
          const page = (await response.json()) as Page;
          return { ...page, cdSituacao };
        }),
      );
      const rows = pages.flatMap((page) => (page.dadosLicitacoes || []).map((row) => ({ ...row, cdSituacao: page.cdSituacao })));
      const statusNames:Record<number,string>={1:'Aberto',2:'Suspenso',3:'Cancelado',4:'Encerrado',5:'Fechado',6:'Encerrado para operação',7:'Avaliação de propostas',8:'Suspenso antes da abertura'};
      const data = rows.map((row) => {
        const id = String(
          pick(row, "id", "idLicitacao", "codLicitacao") || crypto.randomUUID(),
        );
        const start = String(
          pick(row, "dataInicioPropostas", "DATA_INICIO_PROPOSTAS") || "",
        );
        const end = String(
          pick(row, "dataFinalPropostas", "DATA_FINAL_PROPOSTAS") || "",
        );
        return {
          externalId: id,
          source: "portal-compras-publicas",
          sourceUrl: `https://www.portaldecompraspublicas.com.br/processos/${id}`,
          organizationName: String(
            pick(row, "nomeComprador", "comprador", "COMPRADOR", "orgao") ||
              "Órgão não informado",
          ),
          processNumber: String(
            pick(row, "numero", "NUMERO", "numeroProcesso", "codLicitacao") ||
              "",
          ),
          object: String(
            pick(row, "objeto", "OBJETO", "descricaoObjeto") ||
              "Objeto não informado",
          ),
          estimatedValue:
            Number(pick(row, "valorEstimado", "VALOR_ESTIMADO")) || undefined,
          publicationDate:
            br(String(pick(row, "dataPublicacao", "DATA_PUBLICACAO") || "")) ||
            undefined,
          openingDate: br(start) || undefined,
          status: String(pick(row, "situacao", "dsSituacao", "status") || statusNames[Number(row.cdSituacao)] || "Processo publicado"),
          raw: {
            ...row,
            dataInicioPropostas: br(start),
            dataFinalPropostas: br(end),
          },
        } as ExternalOpportunity;
      });
      return {
        data,
        total: pages.reduce(
          (sum, page) => sum + (page.quantidadeTotal || 0),
          0,
        ),
        nextCursor: rows.length ? String(Number(cursor) + 1) : undefined,
      };
    } catch (error) {
      throw new IntegrationError(
        "PROVIDER_UNAVAILABLE",
        "Não foi possível consultar o Portal de Compras Públicas.",
        "portal-compras-publicas",
        "listOpportunities",
        true,
        error,
      );
    }
  }
  async getOpportunityById(_id: string) {
    return null;
  }
  async listOpportunityItems(_id: string): Promise<ExternalBiddingItem[]> {
    return [];
  }
  async listOpportunityDocuments(_id: string): Promise<ExternalDocument[]> {
    return [];
  }
  async normalizeOpportunity(
    item: ExternalOpportunity,
  ): Promise<NormalizedOpportunity> {
    const now = new Date().toISOString();
    return {
      id: `portal-compras-publicas:${item.externalId}`,
      source: item.source,
      sourceId: item.externalId,
      sourceUrl: item.sourceUrl,
      organization: { name: item.organizationName },
      processNumber: item.processNumber,
      object: item.object,
      estimatedValue: item.estimatedValue,
      currency: "BRL",
      publicationDate: item.publicationDate,
      openingDate: item.openingDate,
      status: "UNKNOWN",
      items: [],
      documents: [],
      rawData: item.raw,
      importedAt: now,
      updatedAt: now,
    };
  }
}
