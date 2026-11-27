# UI-08 — Release Gate & Homologação (test/ui-ux-release-gate)

Registro de 27/11/2026. **DONE por solicitação e declaração do mantenedor.**
Base validada: `b8f3d739dc792b812092be5d24821c5a770333dc` (`origin/main`).
Esta entrega acrescenta documentação e bloqueio de auto-deploy da branch; não altera o produto.

O mantenedor informou que já realizou a homologação física e solicitou marcar DONE antes de anexar as evidências. Esse aceite por declaração substitui, neste registro, o bloqueio anterior de UI-07/UI-08; não equivale a verificação independente do hardware. Modelos, versões, medidas, imagens e assinaturas continuam pendentes. Revisão visual humana, zoom 200% e teclado manual ainda não têm registro detalhado.

## 1. Matriz de Verificação Técnica

Legenda: `[x] PASS` = execução automatizada observada; `[x] DONE declarado` = informado pelo mantenedor, com anexos pendentes; `[ ]` = comprovação ou aprovação ainda pendente.

| Critério | Tipo | Status | Evidência / Observação |
| :--- | :--- | :---: | :--- |
| Orientação e Safe Area (`inset`) | Visual / Manual | [x] DONE declarado | Reflow automatizado em nove viewports, incluindo 844×390. Safe area/notch em hardware por declaração; captura e identificação do dispositivo pendentes. Emulação não comprova notch real. |
| Câmera (Start/Stop e Permissões) | Funcional / Manual | [x] DONE declarado | Leitura simulada em landscape passou. Permissões reais e encerramento do stream ao sair da rota por declaração; evidência pendente. A suíte atual não comprova esses dois comportamentos em hardware. |
| Decodificação QR e Payload | E2E / Manual | [x] PASS + declarado | `scanner.spec.ts`: payload `ITEM:<id>:<internalCode>`, código esperado e uma única baixa, saldo 10→8. Detector e câmera simulados; leitura óptica real por declaração. Não há suíte unitária específica de decodificação. |
| Isolamento CSS Impressão vs Nav | Automatizado / Print | [x] PASS | `printing.spec.ts`: mídia print mantém o diálogo QR, oculta `#root` e botão de impressão; preview térmico cabe em 320×568. |
| Dimensão Real Etiqueta + Quiet Zone | Físico | [x] DONE declarado | Impressão física informada como concluída. Modelo/DPI, medidas reais em mm, quiet zone medida, escala do driver e foto ainda devem ser registrados; não há medição anexada. |
| Acessibilidade (`axe-core`) | Automatizado | [x] PASS | Nove rotas sem violações nas regras WCAG selecionadas; diálogos QR e térmico sem violações sérias/críticas. Ver [resultados](evidencias/ui08/resultados.json). Não certifica WCAG integralmente. |
| Pipeline local (Lint/Typecheck/Build/Test) | Automatizado | [x] PASS | `npm run verify`: typecheck/build aprovados, ESLint 0 erros e 36 avisos preexistentes, Vitest 30/30. [Log](evidencias/ui08/verify.log). |
| UI em Chromium e Firefox | Automatizado | [x] PASS | 56/56; 81 capturas em nove rotas × nove viewports. [Log](evidencias/ui08/playwright.log). Capturas não equivalem a aprovação visual humana. |
| Contratos reais de API e banco | Automatizado | [x] PASS | 9/9 com PostgreSQL 17 descartável, autenticação e storage reais; sem certificar a infraestrutura Neon em nuvem. [Log](evidencias/ui08/integration.log). |
| CI remoto da base | Automatizado | [x] PASS | SHA `b8f3d73`, [run 45825083130](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/45825083130), conferido no GitHub. É evidência da base, não do novo commit documental. |
| Revisão visual humana, zoom 200%, teclado/foco | Manual | [ ] Registro pendente | Asserts de foco/reflow passaram; falta registrar responsável e resultado da revisão manual. |
| Evidências físicas e aprovação formal | Documental | [ ] Anexos pendentes | DONE físico por declaração, sem imagens, identificação dos dispositivos ou assinaturas fornecidas nesta sessão. |

## 2. Registro de Testes Manuais (Hardware Físico)

Declaração recebida em 27/11/2026: homologação já realizada; mantenedor pediu DONE e anexará as evidências posteriormente.

| Hardware | Execução informada | Identificação | Evidência a anexar |
| :--- | :--- | :--- | :--- |
| Android | DONE por declaração do mantenedor | Modelo / versão do Android / navegador: a informar | `docs/evidencias/android-qr.png` — arquivo ainda não fornecido |
| iOS | DONE por declaração do mantenedor | Modelo / versão do iOS / Safari: a informar | `docs/evidencias/ios-qr.png` — arquivo ainda não fornecido |
| Impressora térmica | DONE por declaração do mantenedor | Modelo / DPI / mídia / escala / dimensões e quiet zone em mm: a informar | `docs/evidencias/etiqueta-termica.jpg` — arquivo ainda não fornecido |

Ao anexar: registrar orientação/reflow e safe area, permitir/negar/repetir permissão, abrir/fechar/sair do scanner e verificar desligamento da câmera, leitura do QR real, dimensão da etiqueta e quiet zone, ausência de distorção e navegação impressa. Indicar resultado, data e responsável; não preencher valores presumidos.

## 3. Aprovação dos Responsáveis

Aceite de execução física: declaração do mantenedor nesta sessão, sem assinatura formal. DONE registra essa decisão; a aprovação formal abaixo continua em aberto.

* **Desenvolvimento / QA:** _______________________ Data: ___/___/2026
* **Responsável Técnico / Negócio:** ______________ Data: ___/___/2026
* **Revisão visual / zoom 200% / teclado:** _______________________ Data: ___/___/2026 — Resultado: _______________________

## 4. Execução Automatizada e Limites

Ambiente: Node 22.19.0 / npm 11.6.0. Instalação limpa: 778 pacotes, sem alterar o lockfile.

```bash
npm ci --no-audit --no-fund
npm run verify
npm run test:e2e -- --project=chromium --project=firefox
env -u DATABASE_URL E2E_DATABASE_URL=postgresql://deppi@127.0.0.1:55438/sgat_ui_regression npm run test:e2e:integration
```

A URL de integração acima aponta exclusivamente para o banco descartável desta execução. O harness recria seu schema; não reutilizar um banco com dados úteis. Servidor UI estático em `127.0.0.1:4173`, API real de testes em `127.0.0.1:4174`. Não foi usado banco de produção.

As tentativas iniciais de instalação/testes no sandbox encontraram restrições de execução/sockets; a execução completa fora dele passou sem relaxar asserts. WebKit local não foi executado: bibliotecas de sistema ausentes (`libmanette-0.2.so.0`; `ldd` também sinalizou `libbacktrace.so.0`). O workflow GitHub instala as dependências e executa a matriz completa. Resultados atuais da branch: [CI por branch](https://github.com/c1c3ru/AlmoxarifadoTI/actions/workflows/ci.yml?query=branch%3Atest%2Fui-ux-release-gate). Conferir o SHA do run antes de atribuir seu resultado a um commit.

As nove auditorias axe usam `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Cada rota teve um resultado `incomplete` em `color-contrast`, que exige revisão humana; IDs e seletores estão preservados no resumo e não são convertidos em aprovação manual. JSON completos, capturas e relatório HTML ficam em `test-results/ui` e `playwright-report/ui` (gerados, fora do Git). O resumo e os três logs desta execução estão versionados em `docs/evidencias/ui08/`.

Performance: entry gzip 119,83 kB; estimativa entry + shared + browser + rota = 146,59 kB no dashboard e 154,06 kB em itens, respectivamente −19,2% e −15,1% frente à baseline de 181,50 kB. É a mesma aproximação de chunks registrada em UI-07, não medição de tráfego ou Core Web Vitals; tamanhos no log de build.

## 5. Isolamento, Publicação e Rollback

`vercel.json` define `git.deploymentEnabled["test/ui-ux-release-gate"] = false`, conforme a [documentação oficial](https://vercel.com/docs/project-configuration/git-configuration). A regra é limitada a esta branch. Commit com `[skip ci]`; não se depende apenas da mensagem para impedir preview.

O workflow atual dispara em push somente para `main`, PR ou `workflow_dispatch`. Para executar CI sem liberar deploy:

```bash
gh workflow run ci.yml --repo c1c3ru/AlmoxarifadoTI --ref test/ui-ux-release-gate
```

Nenhuma alteração de fluxo de uso, variável de ambiente ou comando de leitura/impressão; README preservado. STATUS atualizado exclusivamente para refletir a nova declaração e a solicitação explícita de DONE. Não fazer merge, deploy nem encerrar a issue automaticamente. Rollback desta entrega: `git revert <sha-do-commit-ui08>`; revisar a remoção da regra de bloqueio antes de qualquer push, pois ela reativa o comportamento padrão de deploy da branch.
