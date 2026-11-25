# Spec — UI/UX Stability
Issue #33 · base 75b8919 · revisão 1.0 · Research: PRD.md · checkpoints: STATUS.md / REFLEXION.md.
Esta especificação é proposta para revisão, não certificação. Não substituir os documentos da raiz. Antes de Code, revalidar a base e abrir nova sessão.
## Contratos globais
Sem alterar server/, shared/, API, rotas, autenticação, RBAC, heartbeat, query keys, schemas, test IDs, regras e dimensões de impressão. Reutilizar Radix e componentes existentes. Branch/PR por ciclo. Testes e aprovação humana antes de merge. Nenhum dado de produção.
## UI-01 — baseline (primeira tarefa de código)
- MODIFY package.json + package-lock.json: npm install -D @playwright/test @axe-core/playwright com versões compatíveis Node 22; gerar lock por npm, nunca editar manualmente; script test:e2e = playwright test. Não atualizar dependências alheias.
- CREATE playwright.config.ts: testDir tests/e2e; projects Chromium (matriz completa), Firefox/WebKit (fluxos críticos); webServer local a partir de build ou Vite com host 127.0.0.1 e porta isolada; baseURL coerente; forbidOnly em CI, retries documentados, trace/screenshot on failure; report HTML + CI.
- MODIFY vitest.config.ts somente se necessário para excluir tests/e2e; verificar tsconfig/eslint sem relaxar regras.
- CREATE tests/e2e/fixtures.ts: inventariar requests efetivamente usados em use-auth.tsx, queryClient.ts, páginas e server/routes; fixtures sintéticas tipadas, interceptação same-origin por método/URL, falhar request desconhecido, sem segredo e sem tráfego externo real. Separar UI com mocks de integração com API real e DB descartável. Nunca trocar auth do app por bypass. Testar fixture admin e técnico.
- CREATE tests/e2e/smoke.spec.ts: login, logout, navegação, item CRUD, edição inline se existente, entrada/saída, filtros, seleção, import/export e QR; asserts de método/payload/contagem de mutações e estado resultante; RBAC real na suíte integrada, não inferir do mock.
- CREATE tests/e2e/responsive.spec.ts: viewports de PRD; medir scrollWidth <= innerWidth +1, validar informações essenciais e bounding boxes, menu e modais, breakpoints +/-1, nomes longos, erros e vazios. Falhas pré-existentes documentadas como baseline específico (teste reproduzível com ticket, sem skip genérico), não relaxar asserções.
- CREATE tests/e2e/visual.spec.ts: espera document.fonts.ready, animações desativadas, dados e relógio fixos; screenshots por browser/OS; revisão humana antes de aceitar snapshots. Não gravar dados sensíveis.
- CREATE tests/e2e/accessibility.spec.ts: AxeBuilder com tags wcag2a/aa, wcag21a/aa e wcag22aa conforme suporte; armazenar IDs/nodes das violações conhecidas e comparar novas; sem exclusões globais. Complementar foco/teclado manual.
- MODIFY .github/workflows/ci.yml: job UI separado, npm ci, playwright install --with-deps, rodar testes e publicar relatórios/screenshots mesmo se falhar; ambiente isolado; preservar jobs atuais. Sem segredos de produção. CREATE .gitignore entradas de resultados gerados se necessário.
- Gate: execução real CI, baseline capturado, testes de integração identificados, falhas antigas classificadas sem fingir aprovação. Não avançar UI-02 até aceite do baseline.

### Revisão 1.1 — UI-01 / implementação do baseline
- Base explícita: merge do PR #34 (`e05532231be999a3e4daf2ecca07199db3538f0a`). Commit/push/merge foram autorizados pelo mantenedor; isso não substitui resultados dos gates.
- CREATE `tests/e2e/server.ts`: servir build em loopback sem `.env` e sem backend para os testes de UI com mocks. Nenhuma rota/test hook adicionado ao produto.
- CREATE `tests/integration/server.ts`: carregar `createApp()` original com autenticação JWT/cookies, RBAC, rotas e storage reais. Usar apenas `E2E_DATABASE_URL` em loopback e database `sgat_ui_regression`; recusar `DATABASE_URL` herdada. CREATE `tests/integration/schema.sql` com schema descartável e dados sintéticos. Adicionar `pg` como devDependency explícita para transportar, somente no harness, as queries Neon HTTP para PostgreSQL descartável via `neonConfig.fetchFunction` (API documentada no driver instalado); não simular resultados SQL nem substituir storage. Registrar que esse transporte não certifica o serviço Neon em nuvem. O ambiente CI fornece PostgreSQL; nunca executar `db:push` nem ler segredos.
- CREATE `playwright.integration.config.ts` e `tests/integration/contracts.spec.ts`: login real, cookie httpOnly, acesso anônimo negado, autorização admin/técnico, estoque exatamente uma vez, saldo insuficiente, CRUD, unidade persistida e busca por código utilizada pelo scanner. Expectations são os contratos da issue; falhas preexistentes permanecem falhas, sem `skip`, `test.fail` ou relaxamento. Não alterar backend para fazer passar.
- CREATE `tests/tsconfig.json` e ampliar lint/typecheck apenas para verificar o harness, mantendo a configuração e suítes Vitest existentes.
- Gate de bloqueio: se integração revelar defeito de API/backend fora do escopo UI, registrar reprodução mínima e manter UI-01 BLOCKED, PR de testes sem merge e UI-02+ não iniciados. Solicitar decisão de escopo com evidência concreta. CI vermelho é evidência, nunca aceite.
- Screenshots/auditorias: anexar capturas e JSON reais por rota/viewport no relatório; baseline visual segue pendente de revisão humana. Nenhum snapshot será aprovado automaticamente. Axe executa as regras completas, sem exclusões, e preserva violações em relatório.
## UI-02 — layout
- MODIFY client/index.html: retirar maximum-scale=1, sem outras alterações.
- MODIFY client/src/hooks/use-sidebar.tsx: substituir resize indiscriminado por matchMedia; overlay <1024, compacto 1024–1279, expandido >=1280 por padrão; manter estado mobile e preferência desktop separados; limpar listeners; conservar API do contexto; ajustar isMobile sem alterar contratos externos. Validar todos consumidores antes.
- MODIFY client/src/components/layout/sidebar.tsx: flex flex-col/min-h-0 no aside, nav flex-1 overflow-y-auto, ações de perfil acessíveis recolhido; Radix Dialog para drawer se compatível com modal de senha, evitar portais/foco conflitantes; aria-current e navegação fecha drawer; Escape/overlay/foco/restauração; drawer fechado fora da tabulação.
- MODIFY client/src/components/layout/main-layout.tsx: alinhar offsets às larguras 80/288px; min-w-0, min-h-dvh com fallback, limitar overflow local; preservar useEffect do heartbeat.
- MODIFY client/src/components/layout/topbar.tsx: wrap/stack em espaço estreito; aria-label, aria-expanded/controls, ícone único; garantir ação principal legível.
- Gate: menu, logout/senha e navegação com teclado, resize dentro do mesmo breakpoint sem reset, 320px e landscape; testes atuais.
## UI-03 — modais
- MODIFY client/src/components/ui/dialog.tsx e alert-dialog.tsx: manter Radix e classes de animação; margem e max-height dinâmica com fallback, scroll interno, focus, fechar traduzido. Validar override de max-w/max-h nos consumidores; garantir ações alcançáveis. Não mexer em contratos de refs.
- MODIFY client/src/components/modals/{add-item-modal,edit-item-modal,movement-modal,qr-code-modal}.tsx e client/src/pages/{users,categories,login,register,reset-password}.tsx somente nos pontos afetados: empilhar ações, labels, autoComplete e foco; preservar submit/validação.
- Gate: Escape, Tab, restauração, cancelamento, erros, mobile teclado virtual manual; sem mutação adicional.
## UI-04 — design e estados
- MODIFY client/src/index.css e tailwind.config.ts: tokens semânticos, contraste, movimento reduzido; não ativar dark mode; manter fontes.
- MODIFY client/src/components/ui/{card,badge,button,input,skeleton}.tsx somente se necessário. Adotar 44px preferencial mobile, WCAG mínimo 24px/exceções.
- CREATE client/src/components/shared/{stat-card,status-badge,empty-state,error-state,responsive-toolbar}.tsx somente após confirmar dois consumidores reais; props tipadas, sem fetch/mutation interna. Reutilizar padrão de movements.tsx isError/refetch em listas. Não confundir zero com erro.
- Gate: contraste e estados carregando/vazio/erro/retry, sem alteração de dados.
## UI-05 — inventário
- MODIFY client/src/pages/items.tsx, search.tsx e client/src/components/csv-import-export.tsx: apresentação responsiva, ações compartilhadas e seleção única; mostrar código, categoria, unidade, saldo, status e localização ou detalhes acessíveis; preservar inline edit e importação/exportação; uma instância CSV se não quebrar estado.
- CREATE client/src/components/inventory/{item-card,item-actions}.tsx se extração reduzir duplicação; componente recebe dados e callbacks existentes; não criar mutation. Tabela mantém semântica, scroll local com nome acessível. Skeleton acompanha colunas.
- Gate: seleção, filtros, estados, CRUD, entrada/saída, QR, exportações e permissões com payloads do baseline.
## UI-06 — telas
- MODIFY client/src/pages/{dashboard,movements,history,consumption,users,categories}.tsx: grid ajustado ao espaço útil, ações wrap, labels/estados, organização visual; não recalcular KPIs, ranking ou filtros. Priorizar estoque crítico, informação e navegação.
- Gate: mesmos valores e resultados; telas curtas/longas, filtros, roles, erros.
## UI-07 — QR
- MODIFY client/src/components/{qr-scanner,thermal-qr-printer,qr-code-generator}.tsx, client/src/components/modals/qr-code-modal.tsx, client/src/pages/scanner.tsx apenas conforme necessário: viewport dinâmico, landscape e safe-area; manter lifecycle, decode, payload e área física de impressão.
- Gate: câmera simulada + hardware Android/iOS e impressora real; sem homologação física, BLOCKED para aceite final.
## UI-08 — homologação
- MODIFY docs/sdd/ui-ux-stability/{STATUS,REFLEXION}.md e README.md se necessário; matriz, CI, axe, teste manual, performance comparada, aprovação visual e rollback por revert. Não fazer deploy ou merge automático.
## Loop e gates
A cada ciclo ler a skill .agents/skills/reflexion/SKILL.md; Observe/Actor/Evaluator/Reflector/Memory. Evidência de teste > opinião. Máximo 3 tentativas de correção por causa, depois BLOCKED. Regressões de negócio são P0. npm ci + npm run verify + npm run test:e2e quando disponível; comparação de bundle/métricas >10% exige investigação; CI e revisão humana obrigatórios. Progresso = tarefas aceitas / 9. Ver issue #33 para matriz e DoD.
