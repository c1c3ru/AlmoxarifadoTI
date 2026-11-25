# Regressão UI-01 — issue #33

Node 22. `npm ci`, `npx playwright install --with-deps chromium firefox webkit`, `npm run build`, `npm run test:e2e`.

`npm run typecheck` também verifica o harness e as configs Playwright. Vitest continua restrito a `*.test.ts`. `npm run verify` executa typecheck, lint, Vitest e build; E2E é um gate separado no CI.

## UI com fixtures

O servidor estático em `127.0.0.1:4173` não contém backend. Cada teste tem estado sintético isolado e intercepta chamadas de API por método/URL; chamadas desconhecidas e erros JS não tratados falham. Testes não autenticam no backend e não demonstram RBAC real. Fontes Google e métricas são interceptadas explicitamente para eliminar rede externa; capturas usam fallback local estável. Não incluir dados ou credenciais reais nas fixtures.

Chromium cobre todas as rotas, nove resoluções, limites dos breakpoints, estados, scanner simulado e axe. Firefox/WebKit executam os fluxos críticos de smoke. Os testes de API abaixo verificam autorização real. Capturas PNG e resultados axe JSON ficam em `test-results/ui`, com relatório em `playwright-report/ui`; os jobs CI publicam ambos por 14 dias, inclusive em falha. Não registrar esses diretórios no Git.

Não há snapshots visuais aprovados automaticamente: as capturas são baseline para revisão. Os asserts de acessibilidade, erro e conteúdo essencial permanecem exigentes e podem falhar por defeitos anteriores; STATUS/REFLEXION registram as causas. Não usar skip, `test.fail`, exclusões axe ou atualização indiscriminada de snapshots para obter verde.

## Integração com PostgreSQL descartável

Disponibilize PostgreSQL 17 local com um banco **descartável e exclusivo** chamado `sgat_ui_regression`. Exemplo de execução no ambiente CI: `E2E_DATABASE_URL=postgresql://postgres:synthetic-local-only@127.0.0.1:5432/sgat_ui_regression npm run test:e2e:integration`.

**O harness recria o schema public desse banco em cada execução.** Ele recusa `DATABASE_URL` herdada, hosts fora de loopback e qualquer outro nome de banco. Não lê `.env`, segredos ou configurações de produção. Não execute contra um banco compartilhado ou que contenha dados úteis. O CI já fornece um serviço descartável isolado, sem secrets.

O servidor em `127.0.0.1:4174` importa `createApp()` original. Login, cookie httpOnly, JWT, autorização, rotas e storage são reais. Só o transporte de SQL do driver Neon é adaptado, via `neonConfig.fetchFunction`, para o PostgreSQL local com `pg`: OIDs e valores crus preservam o parsing original do driver. Nenhuma resposta SQL, storage ou autenticação é simulada. Esse teste não valida a infraestrutura HTTP do serviço Neon em nuvem.

`tests/integration/schema.sql` foi gerado do schema existente com `npx drizzle-kit export --dialect=postgresql --schema=./shared/schema.ts`; não é migração de produção. Se o schema real mudar, regenerar e revisar o diff antes do teste. O harness falha se outra instância já ocupar a porta; não reutiliza servidores inadvertidamente.

## Limitações de homologação

Emulação não certifica Android/iOS reais, teclado virtual ou impressora térmica. Axe não certifica sozinho WCAG. Revisão visual humana, zoom 200%, foco manual, câmera e impressão física continuam nos gates UI-07/UI-08. Não encerrar #33 apenas porque verify ou smoke estão verdes.
