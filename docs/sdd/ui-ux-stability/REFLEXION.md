# REFLEXION — memória episódica
## R-001 · 2026-11-25 · UI-00 · tentativa 1 · 75b8919
- Hipótese: CI recente verde constitui baseline de qualidade.
- Evidência: três runs mais recentes eram Dependabot; jobs do run 44509886498 confirmam que não eram CI do app.
- Avaliação: hipótese inicial insuficiente; corrigida ao localizar CI [36035074897](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/36035074897), SHA idêntico, jobs Build e Quality aprovados.
- Reflexão: conferir nome, SHA e jobs, não apenas conclusão do run. Audit é informativo.
- Próxima ação: conferir CI da branch/PR por SHA; nunca usar verde histórico como gate de novo diff.
## R-002 · UI-00 · ambiente
- Hipótese: clone local permitiria baseline visual.
- Evidência: git ls-remote https://github.com/c1c3ru/AlmoxarifadoTI.git HEAD retornou Could not resolve host: github.com. Node 22.16.0/npm 10.9.2 disponíveis.
- Avaliação: BLOCKED para execução local; NOT_RUN para navegador, axe, hardware e integração.
- Reflexão: falha de infraestrutura não demonstra defeito no app; conector permite documentação/PR, mas não executa npm. Não insistir em clone sem nova capacidade de rede. Não fabricar lockfile.
- Próxima ação: UI-01 em ambiente GitHub Actions ou checkout com rede e DB descartável; gerar lock com npm e revisar screenshots. Não avançar para layout sem baseline.
## R-003 · UI-00 · método
- Evidência: árvore não continha Reflexion; README oficial consultado.
- Avaliação: adaptação local criada como skill, não framework experimental instalado.
- Reflexão: memória factual + avaliador externo suficiente; dependências de pesquisa seriam escopo indevido. Separar Research/Spec em sessão futura para revisão independente; nesta entrega os documentos foram propostos no mesmo atendimento, não alegar /clear executado.
- Próxima ação: reviewer valida Spec e gate de UI-00; executar UI-01 somente com checkout/runner apto.

## R-004 · 2026-11-25 · UI-00 · ambiente revalidado
- Evidência: base remota 75b8919, branch do PR #34 a7a9d30, checkout isolado sem `.env`; `npm ci` PASS (817 pacotes).
- Avaliação: rede resolvida com execução autorizada; preservar DNS como histórico, remover bloqueio ativo. CI do PR #34 passou em quality, build e audit; conferir novamente após novo commit.
- Reflexão: um bloqueio do sandbox deve usar o fluxo de permissão apropriado, sem abandonar os testes nem inferir sucesso a partir de CI antigo.
- Próxima ação: verify local, commit/push e merge autorizado do PR de documentos; UI-01 com browser real e fixtures sintéticas. Evidências de hardware informadas pelo usuário aguardam localização; não declarar homologação concluída.

## R-005 · 2026-11-25 · UI-01 · contratos reais
- Evidência: `test:e2e:integration` em PostgreSQL 17 descartável executou auth/RBAC/storage/SQL reais. Baseline 7/9 PASS, unidade omitida e scanner 404 FAIL.
- Ação: mantenedor autorizou explicitamente as duas correções mínimas de backend; PR #36 inclui projeções de unidade e rota autenticada reutilizando getItemByCode.
- Avaliação: 9/9 contratos PASS após correção; verify isolado PASS com 29 testes. Não alterar outros contratos para facilitar o baseline.
- Próxima ação: revalidar com main atualizada pelo PR #26 (Neon 1.1.0), conferir CI e fazer merge autorizado do PR #36.

## R-006 · UI-01 · baseline visual e harness
- Evidência: 18/18 testes de reflow/navegação PASS e 81 capturas; screenshot 320px mostra clipping no inventário apesar de document.scrollWidth normal. Axe aponta violações críticas/sérias em todas as nove rotas. Testes específicos detectam falso estado vazio em erro de API e informações ocultas em mobile.
- Reflexão: overflow hidden pode esconder defeitos de reflow; largura global não substitui verificação de conteúdo. Capturar defeitos e manter asserts; não fabricar verde.
- Ajustes do harness: script local Speed Insights retorna HTML no servidor estático de testes, agora interceptado explicitamente; relatórios gerados excluídos de lint; Escape de QR pode fechar tooltip antes do dialog, smoke usa o botão Close e teste de Escape separado no formulário sem tooltip. Vídeo de câmera simulado precisa emitir quadros continuamente; scanner simulado PASS após corrigir isso. Essas falhas de fixture não são defeitos de produto.
- Ambiente: WebKit baixado mas biblioteca libmanette ausente; sudo precisa senha. Executar WebKit no CI com dependências reais, sem skip. Fontes externas bloqueadas explicitamente nos mocks; screenshots usam fallback local estável, não certificam tipografia de produção.
- Próxima ação: publicar baseline e obter exceção explícita para avançar aos ciclos de correção com falhas conhecidas registradas; manter gate final de release bloqueado. Artifacts gerados não vão para Git.

## R-007 · UI-01 · regressão concorrente de dependência / P0
- Evidência: PR #26 entrou em main durante o trabalho; base `080f5a0`, Neon 1.1.0. Lockfile regenerado preservando versões remotas. Integração real: 8 falhas de login HTTP 500, 1 teste anônimo passou. Verify com mocks continuou PASS.
- Causa: `node_modules/drizzle-orm/neon-http/session.js` chama `this.client(sql, params, options)`; Neon >=1 aceita somente tagged template ou `.query`. Confirmado em [changelog oficial](https://github.com/neondatabase/serverless/blob/main/CHANGELOG.md#100-2025-03-25). O erro acontece antes do adapter de transporte do harness.
- Avaliação: FAIL/P0, bloqueia próximos merges de produto. Não é falha da fixture e não deve ser mascarada adaptando o harness para aceitar chamadas que produção rejeita.
- Próxima ação: decisão do mantenedor sobre restauração do driver compatível 0.10.4 (solicitada). Se autorizado, hotfix separado, npm/lockfile gerados normalmente, verify e nove contratos reais antes do merge.

## R-008 · UI-02 · layout e navegação
- Autorização: mantenedor aceitou avançar UI-02 a UI-06 com os defeitos conhecidos documentados e gate final bloqueado; também autorizou restaurar Neon 0.10.4.
- Ação: drawer Radix <1024, compacto 1024–1279, expandido >=1280, preferência desktop separada de abertura mobile; mudanças de altura não fecham o drawer. Uma única árvore de navegação, foco preso e restaurado, links com aria-current, senha/logout acessíveis recolhido; removido maximum-scale e clipping global. Heartbeat inalterado.
- Evidência: 12/12 testes focados Chromium PASS; TypeScript, lint e build PASS. Vídeo/QR e banco seguem nos respectivos gates.
- Próxima ação: concluir verify, PR pequeno para a base explícita UI-01; UI-03 modais. Não atribuir ao layout a correção de defeitos de inventário/contraste ainda pendentes.

## R-009 · UI-03 · diálogos
- Ação: limites de viewport com fallback vh/dvh, rolagem interna e botões Fechar 44px; restauração de foco de triggers externos sem substituir callbacks Radix. Labels de cadastro corrigidos movendo FormControl para o input real. Autocomplete e redução de movimento; validação e payloads preservados.
- Evidência: verify PASS (30 testes), 6/6 testes focados PASS; diálogos 320x568 e 844x390 com ações alcançáveis, submit inválido sem mutation, foco restaurado e labels apontando para INPUT.
- Limite: redução de altura em navegador é emulação, não valida teclado virtual físico. Não declarar essa homologação.
- Próxima ação: UI-04 tokens/contraste/estados; manter baseline e invariantes.

## R-010 · UI-04 · controles e feedback
- Ação: contraste dos tokens primary/destructive/muted/success/warning aumentado, botões/inputs móveis de 44px e quebra de label, Card min-w-0. ErrorState sem fetch próprio é consumido por inventário/pesquisa; retry usa refetch existente e os modais mantêm estado.
- Evidência: verify PASS (30 testes), estados vazio/erro com retry verificados em navegador. Nenhuma atualização de query key, cache, schema ou mutations.
- Próxima ação: UI-05 remove clipping e exposição incompleta do inventário; depois repetir axe completo para encontrar cores fixas e labels restantes, sem excluir regras.

## R-011 · UI-05 · inventário
- Ação: apresentação em cards abaixo de 768px por CSS sobre a mesma tabela/árvore, com roles explícitos e scroll local no desktop; código, categoria, quantidade, unidade, estado e localização disponíveis. Callbacks/mutations inline inalterados, seleção única, checkboxes rotulados. Uma instância CSV preserva formulário aberto no resize.
- Evidência: verify PASS (30 testes), 22/22 testes focados PASS; nomes/localizações com sequências longas não geram overflow global em 320–2560px, dados essenciais visíveis, seleção sem movimentos adicionais, callbacks de estoque/CRUD/import/export preservados.
- Próxima ação: UI-06 nas outras telas; axe/reflow completos após corrigir grids/cores fixas e nomes restantes. Não declarar impressão física aprovada a partir do teste de seleção.

## R-012 · UI-06 · telas operacionais
- Ação: grids auto-fit pelo espaço disponível, controles/filtros e nome do switch de conta acessíveis, ações que quebram linha, cores fixas/contraste e estados de erro/retry; métricas, ordenação e cálculos preservados. Dashboard refaz apenas queries que falharam.
- Evidência: verify PASS (30 testes); 18/18 reflow/navegação PASS, 7/7 testes de retry/métricas PASS. Axe identificou um switch de usuário sem nome (corrigido e confirmado em nova rodada); agora oito páginas PASS, scanner ainda com contraste a tratar em UI-07. Rodada focada final 12/12 PASS.
- Próxima ação: UI-07 scanner/impressão, depois gate global de todos browsers e integração. Não atualizar snapshots ou excluir os achados para obter verde.
