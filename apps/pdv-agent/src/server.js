#!/usr/bin/env node
import http from "node:http";
import os from "node:os";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

const VERSION = "0.1.0";
const PORT = Number(process.env.BLU_PDV_AGENT_PORT || 8787);
const HOST = process.env.BLU_PDV_AGENT_HOST || "127.0.0.1";
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://blutecnologias.com.br",
]);

const corsHeaders = (origin = "") => ({
  "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Blu-Agent-Token",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

const json = (response, status, body, origin) => {
  response.writeHead(status, {
    ...corsHeaders(origin),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
    request.on("error", reject);
  });

const runCommand = (command, args) =>
  new Promise((resolve) => {
    execFile(command, args, { timeout: 5000 }, (error, stdout) => {
      if (error) return resolve([]);
      resolve(stdout.split("\n").map((line) => line.trim()).filter(Boolean));
    });
  });

const listPrinters = async () => {
  if (process.platform === "darwin" || process.platform === "linux") {
    const printers = await runCommand("lpstat", ["-p"]);
    return printers.map((line) => {
      const match = line.match(/^printer\s+([^\s]+)/i);
      return { id: match?.[1] || line, name: match?.[1] || line, type: "system" };
    });
  }
  if (process.platform === "win32") {
    const printers = await runCommand("wmic", ["printer", "get", "name"]);
    return printers
      .filter((line) => line.toLowerCase() !== "name")
      .map((line) => ({ id: line, name: line, type: "system" }));
  }
  return [];
};

const printPayload = async (payload) => {
  const jobId = randomUUID();
  const content = String(payload.content || "");
  if (!content.trim()) throw new Error("Conteúdo de impressão vazio.");
  return {
    jobId,
    status: "queued",
    message: "Trabalho recebido pelo agente. A impressão nativa será ativada na próxima etapa.",
    printerId: payload.printerId || "default",
    format: payload.format || "text",
  };
};

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || "";
  const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, {
        status: "online",
        name: "Blu PDV Agent",
        version: VERSION,
        host: os.hostname(),
        platform: process.platform,
        uptimeSeconds: Math.round(process.uptime()),
      }, origin);
      return;
    }

    if (request.method === "GET" && url.pathname === "/devices") {
      json(response, 200, {
        printers: await listPrinters(),
        cashDrawer: { status: "not_configured" },
        scale: { status: "not_configured" },
        tef: { status: "not_configured" },
        fiscal: { status: "not_configured" },
      }, origin);
      return;
    }

    if (request.method === "POST" && url.pathname === "/print") {
      json(response, 202, await printPayload(await readBody(request)), origin);
      return;
    }

    if (request.method === "POST" && url.pathname === "/cash-drawer/open") {
      json(response, 202, {
        status: "queued",
        message: "Comando recebido. Configure a gaveta e impressora térmica para ativar a abertura.",
      }, origin);
      return;
    }

    if (request.method === "POST" && url.pathname === "/scale/read") {
      json(response, 501, {
        status: "not_configured",
        message: "Leitura de balança aguardando configuração da porta serial.",
      }, origin);
      return;
    }

    if (request.method === "POST" && url.pathname === "/tef/admin") {
      json(response, 501, {
        status: "not_configured",
        message: "Administrativo TEF aguardando provider homologado.",
      }, origin);
      return;
    }

    json(response, 404, { error: "Endpoint não encontrado." }, origin);
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : "Erro interno." }, origin);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Blu PDV Agent ${VERSION} running at http://${HOST}:${PORT}`);
});
