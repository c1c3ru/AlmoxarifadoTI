# Scanner — último contraste reprovado no CI

2026-11-25. Base: UI-06 `6dfeac0`. Os outros defeitos reportados nas PRs anteriores foram corrigidos pela sequência UI-02 a UI-06.

Reprodução: axe em /scanner encontrou o texto "Clique para ativar a câmera" (#6b7280 sobre #f1f5f9), contraste 4.41:1, abaixo do mínimo 4.5:1. Plano/implementação: usar o token text-muted-foreground já validado, sem alterar câmera, callbacks ou regras do estoque.

Validação: npm run verify PASS (30 testes); suíte completa de UI: 73 PASS em Chromium/Firefox, incluindo axe das nove telas, responsividade, scanner simulado e operações. Os dez testes WebKit não iniciaram localmente por ausência de libmanette-0.2-0; o job CI instala as dependências via playwright install --with-deps. Revalidar WebKit pelo resultado real do GitHub Actions. Nenhum assert relaxado ou teste desativado; hardware continua pendente.
