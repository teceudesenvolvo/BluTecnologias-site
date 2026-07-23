import { auth } from "../../services/firebase";

export type FirebaseMigrationMode = "dry-run" | "execute";

export interface FirebaseMigrationRequest {
  companyId: string;
  mode: FirebaseMigrationMode;
  collections?: string[];
}

export interface FirebaseMigrationResult {
  ok: boolean;
  message: string;
  jobId?: string;
  summary?: Record<string, unknown>;
  requestId?: string;
}

export const backendMigrationBaseUrl = () => {
  const configured = import.meta.env.VITE_BLU_BACKEND_URL as string | undefined;
  return (configured || "https://backend-blutecnologias-app.onrender.com").replace(/\/$/, "");
};

const friendlyMigrationError = (status: number, details?: string) => {
  if (status === 404) {
    return "O backend-blutecnologias ainda não possui a rota /api/v1/migrations/firebase. O botão já está pronto no frontend; falta implementar o endpoint de migração no backend.";
  }

  if (status === 401 || status === 403) {
    return "Sem permissão para iniciar a migração. Publique o backend atualizado com validação Firebase nesta rota, configure FIREBASE_PROJECT_ID=blutecnologias-site no Render e confirme que o usuário logado é admin@blutecnologias.com.br.";
  }

  if (status >= 500) {
    return "O backend respondeu com erro interno ao iniciar a migração. Verifique os logs do backend-blutecnologias.";
  }

  return details || "Não foi possível iniciar a migração agora.";
};

export const backendMigrationService = {
  async startFirebaseMigration(input: FirebaseMigrationRequest): Promise<FirebaseMigrationResult> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Usuário não autenticado no Firebase.");
    }

    const token = await currentUser.getIdToken();
    const response = await fetch(`${backendMigrationBaseUrl()}/api/v1/migrations/firebase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Company-Id": input.companyId,
        "X-Migration-Source": "BluTecnologias-site",
      },
      body: JSON.stringify({
        mode: input.mode,
        source: "firebase",
        target: "backend-blutecnologias",
        companyId: input.companyId,
        collections: input.collections,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        friendlyMigrationError(response.status);
      throw new Error(friendlyMigrationError(response.status, message));
    }

    return {
      ok: true,
      message: payload?.message || "Migração enviada para processamento no backend.",
      jobId: payload?.data?.jobId || payload?.jobId,
      summary: payload?.data?.summary || payload?.summary,
      requestId: payload?.requestId,
    };
  },
};
