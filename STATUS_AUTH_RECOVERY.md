# STATUS — Recuperação de Senha (forgot/reset password)

Fonte única de verdade do trabalho de recuperação de senha. Última atualização: 2026-09-24.
Estado: **concluído** — build sem erros e fluxo validado de ponta a ponta (27/27 verificações).

## 1) Análise inicial (como estava)

- **Autenticação** (`server/auth.ts`): JWT stateless (8h), senhas com bcrypt (custo 10). Login em `POST /api/auth/login`, limitado a 10 tentativas/15 min por IP. Mantido sem alterações.
- **Recuperação já existia** (`server/routes/auth.ts`): `POST /api/password-recovery` gerava um código de 6 dígitos e `POST /api/password-reset` trocava a senha com usuário + código. Tabela `password_resets` em `shared/schema.ts`.
- **Falhas encontradas:**
  | # | Falha | Risco |
  |---|-------|-------|
  | 1 | Código salvo **em texto puro** (`password_resets.code`) | Quem lê o banco/backup redefine senhas |
  | 2 | Código de 6 dígitos (1 milhão de combinações), sem limite de tentativas por conta | Força bruta distribuída por vários IPs |
  | 3 | Validade de **60 min**, mas o e-mail dizia 15 min | Janela de ataque maior que a anunciada |
  | 4 | Busca incluía usuários **excluídos** e o reset **reativava a conta** (`reactivateUser`) | Usuário removido pelo admin recuperava o acesso sozinho |
  | 5 | Sem política de senha no reset (aceitava 1 caractere) | Senhas triviais |
  | 6 | Nome do usuário interpolado no HTML do e-mail sem escape | Injeção de HTML no e-mail |
  | 7 | Resposta de "usuário inexistente" voltava antes do envio de e-mail | Enumeração de contas por tempo de resposta |
  | 8 | Uso do código em duas etapas (ler, depois apagar) | Condição de corrida permitia reuso |
  | 9 | Email não é único; `limit 1` escolhia uma conta arbitrária | Conta errada recebia o código |

## 2) Banco de dados

- `shared/schema.ts` → `password_resets` agora tem `token_hash` (SHA-256 hex, `UNIQUE`), `expires_at`, `created_at`, FK com `ON DELETE CASCADE` e índice em `user_id`. A coluna `code` foi removida.
- Optou-se por **tabela separada** em vez de `resetToken`/`resetTokenExpires` em `users`: não polui a tabela de usuários, facilita limpeza de expirados e permite apagar o token atomicamente.
- Migração: `migrations/password-resets-token-hash.sql`. O servidor também a aplica sozinho na primeira chamada às rotas de recuperação (`ensurePasswordResetsTable` em `server/storage.ts`, mesmo padrão já usado para `deleted_at`). A tabela é recriada porque só guarda dados temporários; pedidos pendentes antigos deixam de valer.

## 3) Backend

Arquivo dedicado `server/routes/password-reset.ts` (registrado em `server/routes/index.ts`). Rotas antigas removidas de `server/routes/auth.ts`.

- `POST /api/auth/forgot-password` `{ usernameOrEmail }`
  - Resposta **sempre igual** (200, mensagem genérica) e com tempo mínimo de 800 ms, exista ou não a conta.
  - Só contas ativas e não excluídas. Email comparado sem diferenciar maiúsculas; se o email tiver mais de uma conta, cada uma recebe seu link.
  - Token: 32 bytes aleatórios (`crypto.randomBytes`) em base64url; salvo só o SHA-256. Validade **30 min**. Um novo pedido invalida o anterior; expirados são limpos.
  - Anti-abuso: 5 pedidos/15 min por IP, 3 pedidos/hora por identificador (evita bombardear a caixa de alguém trocando de IP) e intervalo mínimo de 60 s entre e-mails para a mesma conta.
  - Link: `APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → (só fora de produção) host da requisição. Em produção nunca usa o `Host` recebido, para impedir envenenamento do link.
- `POST /api/auth/reset-password` `{ token, newPassword }`
  - 10 tentativas/15 min por IP; formato do token validado.
  - Consumo atômico (`DELETE … RETURNING`): o token não pode ser usado duas vezes.
  - Política de senha compartilhada (`shared/password-policy.ts`, mesmas regras do cadastro: 8+ caracteres, maiúscula, minúscula, número, símbolo; máx. 72 bytes por causa do bcrypt).
  - Após trocar a senha, envia e-mail de aviso "Sua senha foi alterada".
- **O token nunca aparece em respostas HTTP.** Só trafega no e-mail. Em desenvolvimento sem SMTP configurado, o link é escrito no log do servidor para permitir testes locais (nunca em produção).
- `server/email.ts`: e-mail com botão/link, versão em texto, escape de HTML, e novo `sendPasswordChangedEmail`.

## 4) Frontend

- `client/src/pages/login.tsx`: "Esqueceu a senha?" abre um modal só com o campo usuário/email e mostra a confirmação genérica após o envio. A aba "Redefinir" (código manual) foi removida.
- `client/src/pages/reset-password.tsx` (rota pública `/reset-password`, em `client/src/App.tsx`): lê o token do link, **remove-o da barra de endereço** (`history.replaceState`), pede nova senha + confirmação e mostra sucesso ou "link inválido/expirado".
- Layout responsivo testado em 390×844.

## 5) Validação

- `npx tsc --noEmit` e `npm run build`: sem erros.
- Teste de ponta a ponta (script local, não versionado): servidor Express real, Postgres em memória (PGlite atrás de um emulador do endpoint HTTP da Neon, partindo da tabela **no formato antigo** para validar a migração automática) e servidor SMTP local capturando os e-mails. Resultado: **27/27**, incluindo: resposta idêntica para conta inexistente/excluída/ativa; só o hash no banco; validade de 30 min; cooldown; token inválido, expirado e reutilizado recusados; senha fraca recusada; login com a senha nova OK e a antiga recusada; e-mail de aviso; rota antiga removida; 429 no rate limit; fluxo completo pelo navegador (Playwright) no modal e na página nova.

## 6) Falhas ou dependências pendentes

- **Configurar `APP_URL`** em produção (ou garantir que a Vercel expõe `VERCEL_PROJECT_PRODUCTION_URL`). Sem nenhuma das duas, nenhum link é enviado e o erro vai para o log.
- **SMTP**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` precisam estar configurados em produção.
- **Sessões antigas continuam válidas após o reset**: o JWT é stateless (8h) e o escopo foi não reescrever a autenticação. Para derrubar sessões após troca de senha, seria preciso um campo como `password_changed_at` checado em `authenticateJWT`.
- **Mudança de comportamento**: contas excluídas pelo administrador não conseguem mais se reativar pela recuperação de senha; a reativação passa a depender do admin.
- Rate limit é em memória por instância (limitação já existente do projeto); em serverless com várias instâncias, o limite efetivo é por instância. O token de 256 bits torna força bruta inviável de qualquer forma.
