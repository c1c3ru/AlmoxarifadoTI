# STATUS — UI/UX Stability

Issue #33 · atualizado em 2026-11-26 · branch de integração `main` · merge UI-07 `0427d08c5fd09add1178aa7edf36da5c90b6187d`.

**Aceitas: 7/9 tarefas.** UI-00 a UI-06 integradas. UI-07 está em correção e aguarda CI/homologação física. UI-08 e o gate de release permanecem bloqueados até a validação física e a revisão visual humana.

| Tarefa | Estado | Evidência / próximo passo |
|---|---|---|
| UI-00 | DONE | PR #34 mergeado; PRD, Spec e STATUS publicados. |
| UI-01 | DONE | PR #37 mergeado; baseline real e falhas reproduzíveis arquivadas, sem relaxamento de asserts. PostgreSQL descartável: 9/9 contratos PASS após os hotfixes #36/#38. |
| UI-02 | DONE | PR #39 mergeado; drawer responsivo, foco e navegação acessíveis; 12 testes focados Chromium passaram. |
| UI-03 | DONE | PR #40 mergeado; diálogos roláveis, foco e labels corrigidos. |
| UI-04 | DONE | PR #42 mergeado; estados de erro/retry, contraste e alvos de toque. |
| UI-05 | DONE | PR #43 mergeado; inventário móvel em cards e tabela desktop, sem duplicar mutações. |
| UI-06 | DONE | PR #44 mergeado; telas operacionais, filtros e recuperação de falhas. |
| UI-07 | BLOCKED | Código mergeado por PR #60. CI 66/66 em Chromium/Firefox/WebKit e axe dos diálogos sem violações sérias/críticas. Homologação real de câmera Android/iOS e impressão térmica pendente. |
| UI-08 | BLOCKED | Requer evidência física de câmera Android/iOS, impressora térmica, revisão visual/teclado e aprovação final. Mantenedor informou que ainda realizará a homologação física. |

## Correções de contrato autorizadas

- PR #36: as projeções de storage incluem `unit`, e o endpoint autenticado `/api/items/by-code/:code` alimenta o scanner.
- PR #38: Neon 0.10.4 restaurado para compatibilidade com Drizzle 0.39; integração real voltou a 9/9.
- Dependabot #45 atualizou React para 19.3.1. O mantenedor pediu expressamente manter essa versão; não rebaixar. A divisão lazy das rotas foi adicionada para controlar o JS inicial.

## Evidências e gates

- `npm ci`: PASS (779 dependências instaladas). O audit registra 24 vulnerabilidades (3 low, 12 moderate, 6 high, 3 critical); não foi executado `npm audit fix` porque faria atualização geral fora do escopo.
- `npm run verify`: PASS após as correções; TypeScript, ESLint (0 erros, 36 avisos preexistentes), Vitest 30/30 e build.
- Playwright CI completo: 66/66 PASS em Chromium, Firefox e WebKit após lazy routes e correção de contraste. Casos incluem nove auditorias de rota, inventário em nove viewports, scanner simulado em landscape e axe para diálogos QR/térmico. [Run 45823704004](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/45823704004).
- Baseline UI: 81 capturas em 9 rotas × 9 viewports. Artefato CI histórico: [baseline Playwright/axe](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/45686913179/artifacts/15057690855). As falhas iniciais de layout e axe foram mantidas como regressões verificáveis até os ciclos corretivos.
- Chromium/Firefox: execução completa em andamento após lazy routes e UI-07. WebKit local não inicia por ausência do pacote de sistema `libmanette-0.2-0`; o workflow CI instala dependências com `playwright install --with-deps`. Não declarar WebKit aprovado até o check da PR atual.
- Integração: 9/9 contratos em PostgreSQL 17 descartável no CI da PR #60; autenticação/RBAC/storage/SQL reais. O harness Neon usa transporte test-only e não certifica o Neon em nuvem.
- Performance: baseline JS inicial gzip de 181,50 KB. O bundle monolítico da base com React 19 chegou a 215,66 KB (+18,8%); lazy routes dividiram a aplicação. A soma gzip entry + shared + browser + rota estimada fica ~146,59 KB no dashboard e ~154,06 KB em itens (−19,2% e −15,1% frente ao baseline). Confirmar bytes exatos pelo relatório de build/CI desta PR.
- Segurança: nenhum `.env`, segredo ou banco de produção foi utilizado. Nenhum deploy manual foi executado.
- Hardware: teste físico ainda não realizado; a confirmação anterior de que havia evidência foi corrigida pelo mantenedor: “Ainda preciso realizar a homologação”. Gate BLOCKED.

## Próximo passo

Executar homologação física de câmera Android/iOS e impressora térmica e registrar evidências; fazer revisão visual humana e testes manuais de zoom/teclado. Só então mudar UI-07/UI-08 para DONE, marcar 9/9 e encerrar #33.
