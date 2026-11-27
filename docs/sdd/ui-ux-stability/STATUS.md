# STATUS — UI/UX Stability

Issue #33 · atualizado em 2026-11-27 · branch `fix/ui-ux-backlog-sync` · base `4d364b8` (`origin/main`).

**Progresso técnico verificado: 7/9 ciclos aceitos em código/automação; UI-07 (hardware físico) e UI-08 (homologação final) permanecem pendentes de evidência física e assinatura humana.**

Auditoria do histórico Git em 27/11/2026 identificou que os PRs #40 (UI-03), #42 (UI-04), #43 (UI-05) e #44 (UI-06) haviam sido mergeados em branches empilhadas (`fix/responsive-layout` → `feat/responsive-inventory`) e não tinham chegado à `main`, além de lacunas técnicas em UI-07 (`viewport-fit=cover` / `safe-area-inset-*` e ocultação explícita de `nav, header, aside, #app-sidebar, .no-print` em `@media print`). A branch `fix/ui-ux-backlog-sync` reconciliou todas as entregas de UI-03 a UI-07 sem quebrar os contratos existentes.

| Tarefa | Estado | Evidência / próximo passo |
|---|---|---|
| UI-00 | DONE | PR #34 mergeado; PRD, Spec e STATUS publicados. |
| UI-01 | DONE | PR #37 mergeado; baseline real e PostgreSQL descartável 9/9 PASS. |
| UI-02 | DONE | PR #39 mergeado; drawer responsivo, foco e navegação acessíveis. |
| UI-03 | DONE (reconciliado) | Reconciliado na branch `fix/ui-ux-backlog-sync` (PR #40 não havia entrado em `main`): `.sgat-dialog`, botão `Fechar` 44px, restauração de foco, `prefers-reduced-motion`, labels/autocomplete em `login.tsx`/`register.tsx` e `tests/e2e/dialogs.spec.ts`. |
| UI-04 | DONE (reconciliado) | Reconciliado na branch `fix/ui-ux-backlog-sync` (PR #42 não havia entrado em `main`): `ErrorState`, tokens de contraste, alvos de 44px em `button`/`input`/`card` e `ErrorState` em `search.tsx`. |
| UI-05 | DONE (reconciliado) | Reconciliado na branch `fix/ui-ux-backlog-sync` (PR #43 não havia entrado em `main`): `.inventory-table` responsiva, `ErrorState`, inputs com `aria-label` e 44px, `tests/e2e/inventory.spec.ts`. |
| UI-06 | DONE (reconciliado) | Reconciliado na branch `fix/ui-ux-backlog-sync` (PR #44 não havia entrado em `main`): grids `auto-fit`, `ErrorState` em todas as telas operacionais e `tests/e2e/operations.spec.ts`. |
| UI-07 | BLOCKED (código OK / hardware pendente) | Código concluído com `viewport-fit=cover`, `env(safe-area-inset-*)` e isolamento `@media print` para navegação (`printing.spec.ts` 3/3 PASS; `scripts/validar_task_qr_impressao.py` 10/13). Aguarda evidências físicas reais em `homologacao_hardware.json` (Android, iOS, impressora térmica). |
| UI-08 | BLOCKED (automação OK / assinaturas e anexos pendentes) | Matriz, `npm run verify` (30/30), Playwright Chromium/Firefox (76/76) e PostgreSQL 17 descartável (9/9) PASS. Faltam anexos físicos, registro manual de zoom 200%/teclado/visual e merge revisado da branch `fix/ui-ux-backlog-sync`. |

## Correções de contrato autorizadas

- PR #36: as projeções de storage incluem `unit`, e o endpoint autenticado `/api/items/by-code/:code` alimenta o scanner.
- PR #38: Neon 0.10.4 restaurado para compatibilidade com Drizzle 0.39; integração real voltou a 9/9.
- Dependabot #45 atualizou React para 19.3.1. O mantenedor pediu expressamente manter essa versão; não rebaixar. A divisão lazy das rotas foi adicionada para controlar o JS inicial.

## Evidências e gates

- `npm ci --no-audit --no-fund` em UI-08: PASS (778 pacotes instalados, lockfile preservado). O audit anterior registrava 24 vulnerabilidades (3 low, 12 moderate, 6 high, 3 critical); não foi reexecutado nesta instalação nem usado `npm audit fix`.
- `npm run verify`: PASS após as correções; TypeScript, ESLint (0 erros, 36 avisos preexistentes), Vitest 30/30 e build.
- Playwright CI completo: 66/66 PASS em Chromium, Firefox e WebKit após lazy routes e correção de contraste. Casos incluem nove auditorias de rota, inventário em nove viewports, scanner simulado em landscape e axe para diálogos QR/térmico. [Run 45823704004](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/45823704004).
- Baseline UI: 81 capturas em 9 rotas × 9 viewports. Artefato CI histórico: [baseline Playwright/axe](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/45686913179/artifacts/15057690855). As falhas iniciais de layout e axe foram mantidas como regressões verificáveis até os ciclos corretivos.
- UI-08 local: Chromium/Firefox 56/56 PASS e integração PostgreSQL 17 descartável 9/9 PASS. Nove rotas axe sem violações; diálogos QR/térmico sem violações sérias/críticas. Logs versionados em `docs/evidencias/ui08/`. WebKit local não executado por bibliotecas ausentes; CI da base `b8f3d73` conferido verde no [run 45825083130](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/45825083130). CI da nova branch deve ser identificado pelo SHA do respectivo run.
- Integração: 9/9 contratos em PostgreSQL 17 descartável no CI da PR #60; autenticação/RBAC/storage/SQL reais. O harness Neon usa transporte test-only e não certifica o Neon em nuvem.
- Performance: baseline JS inicial gzip de 181,50 KB. O bundle monolítico da base com React 19 chegou a 215,66 KB (+18,8%); lazy routes dividiram a aplicação. A soma gzip entry + shared + browser + rota estimada fica ~146,59 KB no dashboard e ~154,06 KB em itens (−19,2% e −15,1% frente ao baseline). Confirmar bytes exatos pelo relatório de build/CI desta PR.
- Segurança: nenhum `.env`, segredo ou banco de produção foi utilizado. Nenhum deploy manual foi executado.
- Hardware: até 26/11 havia declaração de teste ainda não realizado. Em 27/11 o mantenedor informou que já realizou a homologação e solicitou DONE com evidências posteriores. Nenhum modelo, medida ou imagem foi fornecido; conclusão por declaração, sem certificação independente. Ver registro UI-08.

## Próximo passo

Anexar evidências físicas de Android/iOS e impressora térmica, modelos/versões/DPI e medições reais; registrar revisão visual humana/zoom/teclado e colher as assinaturas do termo UI-08. DONE foi registrado por decisão explícita do mantenedor antes dos anexos; não encerrar #33, fazer merge ou deploy automaticamente.
