# PRD — UI/UX Stability (UI-00 / Research)
Issue [#33](https://github.com/c1c3ru/AlmoxarifadoTI/issues/33) · 2026-11-25 · base `75b89194f12a537b9640aad5f1f290f75d736252`.
## Objetivo
Operação institucional SGAT-TI em 320–2560 CSS px, sem regressões em estoque, autenticação, RBAC, QR, impressão, CSV/XLSX. Identidade azul e fontes existentes; sem nova biblioteca de UI ou mudanças de backend.
## Pesquisa e baseline
- React 18, Vite, Tailwind 3.4, Wouter, Radix, React Query, RHF/Zod; Node 22; package-lock presente. CI existente [run 36035074897](https://github.com/c1c3ru/AlmoxarifadoTI/actions/runs/36035074897) no SHA acima: npm ci, typecheck, lint, Vitest e build aprovados; audit informativo (não implica ausência de vulnerabilidades). Conferência dos jobs, não execução local.
- Testes existentes: server/routes/password-reset.test.ts, server/routes/register.test.ts, shared/password-policy.test.ts. Sem Playwright/axe na árvore.
- client/index.html: maximum-scale=1 restringe zoom.
- client/src/hooks/use-sidebar.tsx: resize em <768 reseta isCollapsed e isOpen; estado inicial desktop; sidebar.tsx: aside fixed sem flex-col, nav flex-1, links sem fechamento explícito, ações de perfil ocultas no colapso. Topbar: ação em linha, duplicação de ícone e '+' no mobile; sem nome explícito para toggle.
- client/src/components/layout/main-layout.tsx: overflow-x-hidden em vários níveis, margens w-20/w-72 correspondentes à sidebar; heartbeat deve permanecer.
- client/src/components/ui/dialog.tsx: centralização fixa, sem altura máxima/scroll padrão; texto Close. add/edit e categories têm max-h 90vh; movement-modal, qr-code-modal e users não padronizam limite. AlertDialog também revisar.
- client/src/pages/items.tsx: colunas ocultas por breakpoint; código interno e categoria precisam alternativa visível; estoque/status já aparecem em mobile; skeleton com 7 células sem equivalência responsiva; duas instâncias CSVImportExport. Preserve seleção, edição inline existente (confirmar contrato atual), callbacks e test IDs.
- dashboard: grid 1/2/4 colunas pela viewport, não pelo espaço após menu. search: cards e filtros; history e items não desestruturam isError; movements já implementa erro explícito, padrão a reutilizar. consumption: busca + select em linha; users: diálogos longos.
- qr-scanner.tsx: h-[70vh] min-h-[360px], overflow-visible e máscara de câmera; landscape deve ser testado. thermal-qr-printer.tsx: impressão via popup e clone canvas, preservar dimensão física/quiet zone.
- index.css + tailwind.config.ts: tokens semânticos existentes e cores fixas nas páginas; reduzir gradientes e sombras, não ativar dark mode.
## Referências oficiais
- [Tailwind v3 responsive](https://v3.tailwindcss.com/docs/responsive-design): base mobile-first; md 768, lg 1024, xl 1280; usar os mesmos limiares em matchMedia.
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog): modal, foco, Escape, retorno ao trigger; preservar Portal/Title/Description e refs; testar foco se trigger externo.
- [Playwright emulation](https://playwright.dev/docs/emulation), [visual comparisons](https://playwright.dev/docs/test-snapshots), [accessibility](https://playwright.dev/docs/accessibility-testing): viewports, screenshots determinísticos por browser/OS, axe; mocks separam teste UI de integração. Conferir versão antes de instalar.
- [WCAG 2.2 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow): 320 CSS px, exceções para conteúdo realmente bidimensional; [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): 24px ou exceções AA, 44px preferencial para operação móvel.
- [Reflexion original](https://github.com/noahshinn/reflexion) / [paper](https://arxiv.org/abs/2303.11366): feedback, reflexão verbal e memória persistente entre tentativas. Adaptar sem instalar dependências experimentais.
## Lacunas e riscos
Não foi possível clonar localmente: DNS de github.com indisponível; Node v22.16.0 e npm 10.9.2 existem. Acesso via conector GitHub funciona. Nenhum screenshot, axe, E2E ou hardware executado. UI-01 precisa ambiente CI isolado e banco descartável ou fixture de UI explícita, sem produção. Não converter achados estáticos em falhas de runtime comprovadas.
## Aceite
Reflow, teclado, contraste, estados de erro, seleção e ações preservadas; matriz 320x568, 360x800, 390x844, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080, 2560x1440. Fluxos reais em ambiente isolado e hardware manual. Não marcar baseline visual como concluído até captura revisada. A issue #33 contém requisitos e gates completos.
