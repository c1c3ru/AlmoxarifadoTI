# Correções mínimas de contratos — pré-requisito UI-01

Issue #33, base `e055322`. O mantenedor autorizou expressamente duas correções de backend após a reprodução com PostgreSQL descartável: `unit` omitida e endpoint do scanner ausente. Esta exceção é restrita às duas causas; demais restrições de API/backend continuam em vigor.

## Research

`server/storage.ts` selecionava explicitamente os campos de item em cinco consultas, omitindo `unit` apesar do tipo `ItemWithCategory` e da coluna existentes. `client/src/pages/scanner.tsx` consulta `/api/items/by-code/:code`; `getItemByCode` já existia no storage, mas não tinha rota correspondente. Baseline integrado: 7 testes passaram, 2 falharam (unidade e scanner); nenhum mock de SQL/storage, PostgreSQL 17 descartável e autenticação reais.

## Spec / REASONS

- **R/E:** retornar a unidade persistida nas consultas de item e resolver o código QR já utilizado pelo frontend.
- **A/S:** reutilizar a coluna, `getItemByCode`, `authenticateJWT` e o padrão de resposta existente, sem migrações.
- **O:** MODIFY `server/storage.ts`: incluir `unit: items.unit` em getItem, getItemByCode, getAllItems, searchItems e getLowStockItems. MODIFY `server/routes/inventory.ts`: GET `/items/by-code/:code`, autenticação obrigatória, 404 ausente e erro sanitizado 500. CREATE `server/routes/inventory.test.ts`: autenticação, técnico autorizado, ausência.
- **N/S:** não mudar regras de saldo, mutações, roles, validação, tokens, schema ou formatos QR. Verificar TypeScript, lint, Vitest, build e repetir os nove contratos com banco descartável.

## Evidência

Os testes do harness UI-01 em desenvolvimento preservam os dois asserts que reproduziram as falhas. Após a correção: **9/9 contratos integrados PASS**, incluindo unidade e scanner antes reprovados, SQL real em PostgreSQL 17, cookies httpOnly, RBAC, CRUD, saldo, CSV/XLSX e navegador → API → banco. `npm run verify` isolado neste PR: **PASS**, TypeScript, lint sem erros (36 avisos existentes), 29 testes Vitest e build. `git diff --check`: PASS. Registrar o checkpoint também no STATUS/REFLEXION do próximo ciclo. Este PR resolve apenas os dois contratos; não encerra #33.
