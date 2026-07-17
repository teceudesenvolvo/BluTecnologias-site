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
type Response<T> = { elements?: T[]; links?: Array<{ rel: string }> };
const BASE = "/api/tce-ce";
const repair = (value: string) => {
  try {
    return new TextDecoder().decode(
      Uint8Array.from(value, (char) => char.charCodeAt(0)),
    );
  } catch {
    return value;
  }
};
export class TceCeConnector implements ProcurementConnector {
  readonly provider = tceCeProvider;
  async listMunicipalities() {
    const response = await fetch(
      `${BASE}/municipios?%24format=json&%24count=1000&%24start_index=0`,
    );
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as Response<TceCeMunicipality>;
    return (body.elements || []).filter(
      (item) => item.codigo_municipio !== "001",
    );
  }
  async validateConfiguration(c: ConnectorConfiguration) {
    return {
      valid: Boolean(c.companyId),
      errors: c.companyId ? [] : ["Empresa não informada."],
      warnings: [],
    };
  }
  async testConnection(_c: ConnectorConfiguration) {
    const started = Date.now();
    try {
      await this.listMunicipalities();
      return {
        success: true,
        message: "API do SIM/TCE-CE disponível.",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
      };
    } catch {
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
  ) {
    const count = Math.min(filters.pageSize || 40, 1000);
    const params = new URLSearchParams({
      codigo_municipio: code,
      data_inicio: filters.startDate,
      data_fim: filters.endDate,
      $format: "json",
      $count: String(count),
      $start_index: startIndex,
    });
    const response = await fetch(
      `${BASE}/processos_administrativos_contratacoes?${params}`,
    );
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as Response<Row>;
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
        const count = Math.min(filters.pageSize || 40, 1000);
        return {
          data: (body.elements || []).map((row) => this.toExternal(row)),
          nextCursor: body.links?.some((link) => link.rel === "next")
            ? String(Number(cursor) + count)
            : undefined,
        };
      }
      const municipalities = await this.listMunicipalities();
      const groupSize = 12;
      const group = Math.max(0, Number(cursor) || 0);
      const selected = municipalities.slice(
        group * groupSize,
        (group + 1) * groupSize,
      );
      const results = await Promise.allSettled(
        selected.map((item) =>
          this.listMunicipality(item.codigo_municipio, {
            ...filters,
            pageSize: 1000,
          }),
        ),
      );
      const data = results.flatMap((result) =>
        result.status === "fulfilled"
          ? (result.value.elements || []).map((row) => this.toExternal(row))
          : [],
      );
      return {
        data,
        nextCursor:
          (group + 1) * groupSize < municipalities.length
            ? String(group + 1)
            : undefined,
        total: undefined,
      };
    } catch (error) {
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
    const pncp = String(row.numero_id_contratacao_pncp || "").trim();
    return {
      externalId: pncp || `CE-${row.codigo_municipio}-${row.numero_licitacao}`,
      source: "tce-ce",
      organizationName: `Município do Ceará · código ${row.codigo_municipio}`,
      processNumber: row.numero_licitacao,
      object: repair(row.descricao_objeto_licitacao || "Objeto não informado"),
      estimatedValue: row.valor_orcado_estimado,
      publicationDate: row.data_realizacao_autuacao_licitacao,
      openingDate: row.data_realizacao_licitacao,
      status: "Informado ao TCE-CE",
      raw: row,
    };
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
    e: ExternalOpportunity,
  ): Promise<NormalizedOpportunity> {
    const now = new Date().toISOString();
    return {
      id: `tce-ce:${e.externalId}`,
      source: "tce-ce",
      sourceId: e.externalId,
      organization: { name: e.organizationName, state: "CE" },
      processNumber: e.processNumber,
      object: e.object,
      estimatedValue: e.estimatedValue,
      currency: "BRL",
      publicationDate: e.publicationDate,
      openingDate: e.openingDate,
      status: "PUBLISHED",
      items: [],
      documents: [],
      rawData: e.raw,
      importedAt: now,
      updatedAt: now,
    };
  }
}
