# dotenv 18 — correção da PR #28

2026-11-25. CI falhava com TS7016 no import dinâmico dotenv/config. O pacote 18.0.4 exporta essa entrada sem uma declaração types; a API principal possui tipos públicos.

Plano e implementação: incorporar main; importar config dinamicamente de dotenv e executá-la antes de importar a aplicação. Manter o carregamento somente fora de produção. Não adicionar declarações any nem desabilitar typecheck.

Referência: https://github.com/motdotla/dotenv#readme — API config. Confirmado também nos exports do pacote instalado.

Validação: npm ci e npm run verify PASS (typecheck, lint sem erros, 30 testes e build). Os 36 avisos de lint são preexistentes. Sem merge automático.
