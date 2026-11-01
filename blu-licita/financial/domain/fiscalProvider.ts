export type FiscalDocumentKind = "nfe" | "nfce" | "nfse";
export type FiscalProviderStatus = "not_configured" | "sandbox" | "production";

export interface FiscalProvider {
  id: string;
  name: string;
  supportedDocuments: FiscalDocumentKind[];
  status: FiscalProviderStatus;
  canIssue: boolean;
}

export const nationalNfseProvider: FiscalProvider = {
  id: "nfse_nacional",
  name: "NFS-e Nacional",
  supportedDocuments: ["nfe", "nfce", "nfse"],
  status: "not_configured",
  canIssue: false,
};

export const fiscalIntegrationRequirements = [
  "CNPJ e inscrição municipal da Blu Tecnologias",
  "Certificado A1 instalado com segurança no backend",
  "Dados de serviço, tributação e regime fiscal para Fortaleza/CE",
  "Geração e assinatura da DPS conforme o leiaute nacional vigente",
  "Credenciamento da empresa e do município no ambiente restrito",
] as const;
