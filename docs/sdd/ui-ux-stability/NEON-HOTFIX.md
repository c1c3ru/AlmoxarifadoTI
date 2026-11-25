# Hotfix de compatibilidade Neon/Drizzle

O mantenedor autorizou restaurar o driver compatível após a regressão introduzida pelo PR #26 (base `080f5a0`). Neon 1.1.0 rejeita chamadas `sql(query, params, options)` ainda utilizadas pelo Drizzle 0.39 em `neon-http/session.js`. Isso faz o login real retornar HTTP 500 antes de qualquer chamada ao transporte do banco. A alteração incompatível está documentada no [changelog oficial do Neon 1.0](https://github.com/neondatabase/serverless/blob/main/CHANGELOG.md#100-2025-03-25).

## Spec / REASONS

- **R/E:** recuperar as consultas já existentes sem alterar autenticação, API ou regras de estoque.
- **A/S:** restaurar a dependência direta `@neondatabase/serverless` para `0.10.4`, versão anterior compatível, com lockfile gerado por npm. Adiar atualização major até migração deliberada e testada do conjunto Drizzle/Neon.
- **O:** MODIFY package.json/package-lock.json; CREATE server/neon-driver.test.ts com Drizzle e Neon reais, transporte HTTP controlado e query parametrizada. O teste deve falhar no driver 1.x antes de alcançar o transporte e passar no driver restaurado.
- **N/S:** sem mudanças em auth, rotas, storage, schema ou dados. Verify, teste de compatibilidade e nove contratos reais com PostgreSQL descartável; não adaptar o harness para esconder a incompatibilidade.

## Evidência

Baseline integrado da branch UI-01 com as correções de unidade/scanner: 9/9 PASS em Neon 0.10.4; após integrar PR #26 e instalar o lockfile atual: 1/9 PASS e oito falhas de login HTTP 500. CI anterior não detectou porque as rotas usavam storage mockado. A nova regressão de compatibilidade é permanente e os contratos PostgreSQL do UI-01 impedem repetir esse falso verde.
