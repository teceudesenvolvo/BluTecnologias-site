export type PdvAgentHealth = {
  status: "online";
  name: string;
  version: string;
  host: string;
  platform: string;
  uptimeSeconds: number;
};

export type PdvAgentDevices = {
  printers: Array<{ id: string; name: string; type: string }>;
  cashDrawer: { status: string };
  scale: { status: string };
  tef: { status: string };
  fiscal: { status: string };
};

const baseUrl = "http://127.0.0.1:8787";

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!response.ok) throw new Error("Agente local indisponível.");
  return response.json() as Promise<T>;
};

export const pdvAgentService = {
  downloadUrl: "/downloads/pdv-agent/blu-pdv-agent-0.1.0.zip",
  health: () => request<PdvAgentHealth>("/health"),
  devices: () => request<PdvAgentDevices>("/devices"),
  print: (payload: { printerId?: string; format: "text" | "html" | "escpos"; content: string }) =>
    request<{ jobId: string; status: string; message: string }>("/print", { method: "POST", body: JSON.stringify(payload) }),
};
