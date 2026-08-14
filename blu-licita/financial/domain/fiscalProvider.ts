export type FiscalDocumentKind = "nfe" | "nfce" | "nfse";
export type FiscalProviderStatus = "not_configured" | "sandbox" | "production";

export interface FiscalProvider {
  id: string;
  name: string;
  supportedDocuments: FiscalDocumentKind[];
  status: FiscalProviderStatus;
  canIssue: boolean;
}

export const tecnospeedPlugNotasProvider: FiscalProvider = {
  id: "tecnospeed_plugnotas",
  name: "TecnoSpeed PlugNotas",
  supportedDocuments: ["nfe", "nfce", "nfse"],
  status: "not_configured",
  canIssue: false,
};

export const fiscalIntegrationRequirements = [
  "Plano PlugNotas contratado",
  "API key armazenada no Secret Manager",
  "Empresa emitente cadastrada no PlugNotas",
  "Certificado digital e inscrições validados",
  "Série, numeração, regime e regras tributárias configurados",
  "Município e provedor homologados para NFS-e",
] as const;
