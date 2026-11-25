# STATUS — UI/UX Stability
Issue #33 · 2026-11-25 · base 75b89194f12a537b9640aad5f1f290f75d736252 · branch docs/ui-ux-stability-sdd.
**Aceitas: 0/9. UI-00 documentada; aceite do baseline pendente.** PR #34 mergeado em `e055322`; baseline UI-01 em execução na branch `test/ui-regression-baseline`.
| Task | Estado | Evidência / próxima ação |
|---|---|---|
| UI-00 | DOING | PR #34 mergeado com CI verde; checkout e verify reais; baseline visual capturado em UI-01, aceite pendente |
| UI-01 | DOING | Playwright/axe e integração PostgreSQL implementados; nove contratos integrados PASS após correção autorizada; baseline UI registra falhas reais, sem skip ou asserts relaxados |
| UI-02 | DOING | Drawer Radix, estados separados, foco, ações recolhidas e zoom implementados. Typecheck/lint/build PASS; 12/12 testes focados Chromium PASS (foco preso/restaurado, Escape, resize, CRUD/inline/CSV/roles). Verify em execução; aceite final segue bloqueado |
| UI-03 | DOING | Dialog/AlertDialog com vh/dvh, margem, scroll e Close traduzido; foco externo restaurado e labels reais do cadastro. Verify PASS (30 testes); 6/6 testes focados PASS. Teclado virtual físico pendente |
| UI-04 | DOING | Tokens semânticos mais escuros, controles móveis 44px, Card min-w-0 e ErrorState reutilizado por inventário/pesquisa; verify PASS (30 testes), testes focados de vazio/erro PASS. Axe completo será reexecutado após UI-05/UI-06 |
| UI-05 | TODO | Depende UI-04 |
| UI-06 | TODO | Depende UI-05 |
| UI-07 | TODO | Depende UI-06; hardware obrigatório |
| UI-08 | TODO | Depende UI-07 e todos gates |
## Evidências
- CI histórico [36035074897](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/36035074897): npm ci, typecheck, lint, Vitest, build: PASS no SHA base. Audit informativo.
- `npm run verify` executado no checkout do PR #34: PASS (typecheck, lint sem erros, 36 avisos preexistentes, 26 testes Vitest e build). Execução HTTP local exige sair do sandbox; a tentativa restrita foi interrompida, sem relaxar testes. Revisão técnica em duas passagens (contratos/escopo e consistência documental); não equivale a aprovação visual humana.
- Bloqueio de DNS inicial superado com execução autorizada. Checkout isolado atualizado; `npm ci` PASS (817 pacotes), Node 22.19.0/npm 11.6.0. Sem `.env` de produção.
- UI-01: Playwright 1.65.1, axe 4.10.2, pg 8.13.1/@types/pg 8.11.6, somente devDependencies. Versões de dependências já existentes preservadas ao gerar lock por npm. Axe 4.14 exigiria Node >=22.12; versão 4.10.2 fixada para compatibilidade com toda a faixa Node 22.
- Integração em PostgreSQL 17 descartável, banco `sgat_ui_regression` em loopback: antes 7 PASS/2 FAIL; após correção autorizada 9/9 PASS. Cookies httpOnly, RBAC real, CRUD, unidade, scanner, saldo, CSV/XLSX e navegador → API → banco. Adapter de transporte Neon test-only, SQL/storage/auth reais; não certifica infraestrutura Neon em nuvem.
- Reflow/navegação: 18/18 PASS, 81 screenshots nas nove rotas × nove viewports. Medir document.scrollWidth sozinho não detecta clipping por overflow hidden: inventário 320px continua cortado, capturado em screenshot e teste específico que falha.
- Axe: nove páginas FAIL, com `button-name`, `color-contrast`, `meta-viewport`; inventário também `label`. Relatórios incluem seletores, HTML e severidade; regras completas, sem exclusões.
- Smoke Chromium/Firefox cobre login/logout, CRUD, ajuste inline, entrada/saída com contagem/payload, seleção/resize, filtros, QR, CSV/XLSX, importação e UI técnico. Scanner com vídeo/BarcodeDetector simulados PASS; não equivale a hardware.
- Erro de inventário apresentado como vazio e código/categoria/unidade ocultos em mobile: testes reproduzíveis mantidos como FAIL para os ciclos seguintes.
- WebKit local bloqueado por `libmanette-0.2-0` ausente; install-deps exige senha sudo. CI instala bibliotecas com `--with-deps`; não registrar WebKit como aprovado até execução real.
- Hardware: usuário informou evidências existentes, mas localização/registro ainda não fornecidos; homologação NOT_VERIFIED.
- PR #36: duas correções mínimas de backend expressamente autorizadas após reprodução (unidade ausente e scanner 404); schema, RBAC e regras de saldo preservados. `npm run verify` PASS com 29 testes; revalidar após atualização concorrente de main (PR #26 / Neon 1.1.0).
- **Bloqueio P0 confirmado na base concorrente `080f5a0`:** com Neon 1.1.0 instalado do lockfile, integração passou de 9/9 para 1/9, login HTTP 500. Drizzle 0.39 chama `client(sql, params, options)`, forma removida pelo Neon 1.x (confirmada no código instalado e changelog oficial). Verify permanece verde com mocks; não demonstra runtime. Restauração para Neon 0.10.4 solicitada ao mantenedor, ainda pendente. Não alterar auth nem contornar o erro no harness.
## Próximo checkpoint
PR #37 publica UI-01 com baseline real: 41 PASS/11 FAIL em Chromium+Firefox, 81 capturas e nove auditorias; `BASELINE.json` preserva IDs/seletores. O mantenedor autorizou avançar UI-02 a UI-06 para corrigir esse baseline reprovado, mantendo release bloqueado. Também autorizou restaurar Neon 0.10.4: PR #38, verify PASS (27 testes); integração com #36 voltou a 9/9 PASS. Concluir CI/merges dos hotfixes e ciclos de correção em branches/commits separados. Não marcar issue concluída nem homologação física verificada sem evidência.
