# STATUS — UI/UX Stability

Issue #33 · atualizado em 2026-11-27 · branch `test/ui-ux-release-gate` · base `b8f3d739dc792b812092be5d24821c5a770333dc`.

**Registradas como DONE: 9/9 tarefas.** UI-00 a UI-06 integradas. Em 27/11/2026, o mantenedor informou que realizou a homologação física e pediu marcar DONE antes de anexar as evidências. UI-07/UI-08 foram concluídas por essa declaração e decisão explícita. Evidências físicas, identificação dos dispositivos, registro detalhado de revisão visual/zoom/teclado e assinaturas formais continuam pendentes; não são apresentados como verificados pelo agente. Matriz e resultados: [UI-08 — Homologação](../../UI-08-HOMOLOGACAO.md).

| Tarefa | Estado | Evidência / próximo passo |
|---|---|---|
| UI-00 | DONE | PR #34 mergeado; PRD, Spec e STATUS publicados. |
| UI-01 | DONE | PR #37 mergeado; baseline real e falhas reproduzíveis arquivadas, sem relaxamento de asserts. PostgreSQL descartável: 9/9 contratos PASS após os hotfixes #36/#38. |
| UI-02 | DONE | PR #39 mergeado; drawer responsivo, foco e navegação acessíveis; 12 testes focados Chromium passaram. |
| UI-03 | DONE | PR #40 mergeado; diálogos roláveis, foco e labels corrigidos. |
| UI-04 | DONE | PR #42 mergeado; estados de erro/retry, contraste e alvos de toque. |
| UI-05 | DONE | PR #43 mergeado; inventário móvel em cards e tabela desktop, sem duplicar mutações. |
| UI-06 | DONE | PR #44 mergeado; telas operacionais, filtros e recuperação de falhas. |
| UI-07 | DONE por declaração | Código mergeado por PR #60; CI anterior 66/66. Mantenedor declarou homologação física realizada em 27/11; anexos e identificação de hardware pendentes. |
| UI-08 | DONE por solicitação do mantenedor | Matriz, logs e termo de aprovação registrados. Revalidação local: verify 30/30, Chromium/Firefox 56/56, PostgreSQL 17 descartável 9/9, axe das nove rotas sem violações. Aceite por declaração com evidências a anexar; assinaturas e registro visual manual pendentes. |

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
