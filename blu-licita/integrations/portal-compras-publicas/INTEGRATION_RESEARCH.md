# Portal de Compras Públicas

Verificação atualizada em 17/07/2026. A documentação pública oficial foi localizada em https://apipcp.portaldecompraspublicas.com.br/publico/apidoc/ (versão publicada 2.2.2). A rota de listagem é `GET /publico/listarProcessos/` e exige `publicKey`, `cdSituacao`, `dataInicio`, `dataFim` e paginação. O conector usa somente essa rota documentada e requer `VITE_PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY`. Status: `PUBLIC_API / API_KEY`.
