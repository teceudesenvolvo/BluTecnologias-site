# PNCP — API pública de consulta

Verificação: 16/07/2026.

- Responsável: Ministério da Gestão e da Inovação em Serviços Públicos.
- Documentação: https://pncp.gov.br/api/consulta/swagger-ui/index.html
- Manual oficial: https://www.gov.br/pncp/pt-br/pncp/manuais
- Base de consulta validada: `https://pncp.gov.br/api/consulta/v1`
- Endpoint implementado: `GET /contratacoes/publicacao`.
- Parâmetros usados: `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`, `uf` e `pagina`.
- Autenticação: nenhuma para consultas públicas. APIs de manutenção exigem credenciamento e não são usadas.
- Paginação: controlada pelo parâmetro `pagina` conforme o manual oficial.
- Limites: a documentação pública não informa cota estável. HTTP 429 é tratado como temporário.
- Campos ausentes: detalhes, itens e documentos são deliberadamente bloqueados até validação de contrato em testes de backend.

Não confundir a API pública de consulta com a API autenticada usada por plataformas para publicar ou retificar dados.
