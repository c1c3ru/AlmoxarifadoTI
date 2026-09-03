# Mapeamento da Camada de Autorização — Backend vs Frontend (SGAT-TI)

> Complementa `docs/security-audit/issues-templates.md` (auditoria anterior, achados F01–F10).
> Este documento não repete a metodologia daquele relatório: aqui o objetivo é **inventariar
> literalmente toda rota de escrita (e leitura) da API**, dizer qual é a checagem de autorização
> que roda de fato no servidor, e comparar com o que o frontend mostra/esconde — destacando todo
> caso em que a única barreira é visual.

**Data:** 2026-09-03 · **Branch:** `claude/authorization-backend-frontend-audit-529sur`
**Stack:** Express 4 + Drizzle/Postgres (backend) · React 18 + Wouter + TanStack Query (frontend) · JWT (`jsonwebtoken`) + bcrypt

---

## 1. Conclusão em uma frase

**O backend tem exatamente UMA verificação de papel (`role`) em todo o sistema** —
`server/routes/users.ts:111`, dentro de `DELETE /api/users/:id`. Todas as outras ~29 rotas
autenticadas (incluindo toda a gestão de usuários, categorias e itens que o frontend
apresenta como "área do administrador") aceitam qualquer usuário logado, `tech` ou `admin`,
sem distinção. A tela de administração é **apenas um filtro visual** (`AdminRoute` no React) —
não existe um `requireAdmin` (ou equivalente) no Express em lugar nenhum do código.

```bash
$ grep -rn "req.user.role\|role !==\|role ===" server/
server/routes/users.ts:61:   if (updateData.role === 'admin' || updateData.matricula) {   # validação de matrícula, não de quem pode chamar a rota
server/routes/users.ts:111:  if (currentUser.role !== "admin") {                          # ÚNICA checagem de admin de todo o backend
```

Isso por si só já haveria de ser o achado central do relatório. Mas há uma camada anterior a
essa, que precisa ser lida primeiro porque **anula toda a análise de "tech vs admin" abaixo**.

---

## 2. Camada 0 — a autenticação em si é opt-in

`server/auth.ts:24-27` e `:50-51`:

```ts
export function isAuthEnabled() {
  const enableJwtValue = process.env.ENABLE_JWT;
  return enableJwtValue === "true" || enableJwtValue === "1";
}

export async function authenticateJWT(req, res, next) {
  if (!isAuthEnabled()) return next();   // <- sem ENABLE_JWT=true, o middleware não faz nada
  ...
}
```

`ENABLE_JWT` **não aparece em `env.example` nem no README** (confirmado por busca no
repositório). Um deploy que siga a documentação do próprio projeto não define essa variável —
e nesse caso `authenticateJWT` vira um `next()` puro: a requisição segue com `req.user`
`undefined`, para **qualquer rota**, de **qualquer origem**, sem token nenhum.

Isso já está catalogado como F01 na auditoria anterior; ele é reafirmado aqui porque muda o
enunciado de cada linha da tabela da Seção 4: toda rota marcada abaixo como
"`authenticateJWT` (sem checagem de papel)" deve ser lida, neste cenário, como
"**sem autenticação nenhuma**". As únicas 3 rotas que sobrevivem parcialmente a esse cenário são
as que fazem sua própria checagem manual de `req.user` dentro do handler (não do middleware):
`DELETE /api/users/:id`, `PUT /api/users/me/password` e `POST /api/heartbeat` — essas retornam
401 para uma chamada anônima mesmo com `ENABLE_JWT` desligado, porque checam
`if (!req.user) return res.status(401)` explicitamente no corpo da rota. Todas as demais (leitura
e escrita de usuários, categorias, itens e movimentações) **não têm nenhuma rede de segurança**
além do middleware.

O restante deste relatório assume o cenário "correto" (`ENABLE_JWT=true`, como presumivelmente
roda em produção hoje) para poder falar de "tech vs admin" — mas o parágrafo acima é o motivo
pelo qual F01 deveria ser tratado como bloqueador antes de qualquer outra correção.

---

## 3. Como ler a tabela

- **Checagem exata no servidor** — o que o código do Express realmente valida antes de executar
  a operação (nunca o que "deveria" validar).
- **Barreira no frontend** — o que impede um usuário de *ver o botão ou a rota* no React.
- **Veredito:**
  - 🔴 **BYPASS DE UI** — o frontend esconde a ação, mas a API aceita de qualquer usuário
    autenticado (ou de qualquer requisição, se F01 se aplicar). Basta um `fetch`/`curl` com o
    token de um usuário `tech` para executar a ação "restrita a admin".
  - 🟠 **Falha correlata** (não é bypass de UI clássico, mas é uma falha de autorização/integridade
    do lado do servidor).
  - 🟡 **Bypass de UI menor / informativo** — inconsistência real, mas sem ganho de acesso a dado
    novo (o mesmo dado já está disponível ao usuário por outro caminho legítimo).
  - ✅ **Consistente / correto** — servidor e cliente aplicam a mesma regra, ou a rota é
    intencionalmente pública.

---

## 4. Inventário completo de rotas

### 4.1 Autenticação e conta (`server/routes/auth.ts`, montado em `/api`)

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `POST /api/password-recovery` | Nenhuma (pública por design) — sempre responde 200 genérico | Pública | ✅ correto (enumeração de conta mitigada pela resposta genérica) |
| `POST /api/password-reset` | Código de 6 dígitos + expiração de 1h, ambos server-side | Pública | ✅ correto isoladamente — mas ver §5.3 (cadeia com o achado de `PUT /users/:id`) |
| `POST /api/auth/login` | `loginLimiter` (10/15min) + `bcrypt.compare` + `user.isActive` | Pública | ✅ correto |
| `POST /api/register` | `insertUserSchema` (Zod) — se `role:"admin"`, exige matrícula presente em `ALLOWED_ADMIN_MATRICULAS` (`shared/schema.ts:91`) | Pública; formulário permite escolher `role: admin` livremente (`register.tsx:27-29,56`) | ⚠️ ver §5.4 — a única barreira para virar admin por autorregistro é uma lista de ~140 matrículas que **vaza no bundle JS público** (F07, auditoria anterior) |
| `PUT /api/users/me/password` | `authenticateJWT` **+** escopo travado em `req.user.sub` (nunca aceita `id` de outro usuário) + confere `currentPassword` via bcrypt | Acessível a todos, mas sempre opera na própria conta | ✅ correto — auto-escopo bem implementado |

### 4.2 Gestão de usuários (`server/routes/users.ts`, montado em `/api/users`) — área "admin" no frontend

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/users` (`:9`) | **Só `authenticateJWT`.** Nenhuma verificação de `role`. | Página `/users` só é roteável via `AdminRoute` (`App.tsx:112-118`, redireciona se `user.role !== "admin"`) | 🔴 **BYPASS DE UI** — qualquer `tech` autenticado lê nome/e-mail/matrícula/role de todos os usuários chamando a API diretamente |
| `POST /api/users` (`:21`) | **Só `authenticateJWT`.** Nenhuma verificação de `role`. | Botão "Novo Usuário" só existe dentro da página `/users` (admin-only) | 🔴 **BYPASS DE UI CRÍTICO** — um `tech` cria qualquer usuário, inclusive `role: "admin"` (basta usar uma das ~140 matrículas da allowlist) |
| `PUT /api/users/:id` (`:48`) | **Só `authenticateJWT`.** `id` do path é um IDOR clássico — não há checagem de que `req.user.sub === id` nem de `req.user.role === "admin"`. A única validação condicional (`:61-81`) só roda **se** `role` ou `matricula` vierem no corpo, e mesmo assim só valida a allowlist de matrícula — nunca valida *quem* pode fazer a chamada. `storage.updateUser` (`storage.ts:170-183`) hasheia e grava qualquer `password` enviado. | Botão "Editar" só existe dentro de `/users` (admin-only); modal permite editar `password`, `email`, `role`, `isActive` de qualquer usuário da lista | 🔴 **BYPASS DE UI CRÍTICO + IDOR** — um `tech` chama `PUT /api/users/<id-de-qualquer-um>` com `{"password":"nova-senha"}` e assume a conta (inclusive de um admin), sem nunca ter passado pela tela de administração |
| `DELETE /api/users/:id` (`:105`) | `authenticateJWT` **+** `if (currentUser.role !== "admin") return 403` (`:111`) **+** bloqueio de auto-exclusão (`:115`) | Botão "Deletar" só renderiza se `currentUser?.role === "admin"` (`users.tsx:621`) | ✅ **CORRETO** — único par frontend/backend do sistema inteiro onde o servidor replica fielmente a regra que o cliente já impõe visualmente. Referência de como as quatro linhas acima deveriam ter sido escritas. |

### 4.3 Categorias (`server/routes/inventory.ts`, montado em `/api`) — área "admin" no frontend

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/categories` (`:17`) | `authenticateJWT` | Dado não sensível, consumido também pelo dashboard | ✅ ok (leitura) |
| `GET /api/categories/with-counts` (`:27`) | `authenticateJWT` | idem | ✅ ok |
| `POST /api/categories` (`:37`) | **Só `authenticateJWT`.** Nenhuma verificação de `role`. | Página `/categories` inteira atrás de `AdminRoute` (`App.tsx:120-126`) | 🔴 **BYPASS DE UI** |
| `PUT /api/categories/:id` (`:51`) | **Só `authenticateJWT`.** | idem | 🔴 **BYPASS DE UI** |
| `DELETE /api/categories/:id` (`:67`) | **Só `authenticateJWT`.** | idem | 🔴 **BYPASS DE UI** — apaga uma categoria inteira (afeta todos os itens vinculados) com uma conta `tech` que nunca vê o link "Categorias" no menu |

### 4.4 Itens (`server/routes/inventory.ts`) — página aberta a todos os autenticados

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/items`, `/items/search`, `/items/:id` | `authenticateJWT` | `/items` usa só `ProtectedRoute` (qualquer logado) | ✅ consistente — leitura é intencionalmente aberta a `tech` |
| `POST /api/items` (`:117`) | `authenticateJWT`, sem checagem de `role` | Botão "Novo Item" sempre visível, sem gate de role (`items.tsx`) | ✅ consistente (aberto a ambos os papéis por design) — ver nota de escopo em §5.5 |
| `PUT /api/items/:id` (`:131`) | `authenticateJWT`, sem checagem de `role` | Botão "Editar" sempre visível | ✅ consistente |
| `DELETE /api/items/:id` (`:147`) | **Só `authenticateJWT`.** Nenhuma verificação de `role`. | Botão só renderiza se `canDeleteItems(user)` → `isAdmin(user)` (`items.tsx:568`, `lib/auth.ts:7-9`) | 🔴 **BYPASS DE UI** — `tech` sem o botão na tela apaga qualquer item via `DELETE /api/items/<id>` |
| `GET/POST /api/inventory/export*`, `/import` (`:203,229,259`) | `authenticateJWT` (+ rate limit no import) | `CSVImportExport` sempre visível, sem gate de role | ✅ consistente (aberto por design) |

### 4.5 Movimentações (`server/routes/inventory.ts`) — página aberta a todos os autenticados

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/movements` (`:160`) | `authenticateJWT` | `/movements` usa só `ProtectedRoute` | ✅ consistente |
| `POST /api/movements` (`:174`) | `authenticateJWT`, sem checagem de `role`. Estoque insuficiente é bloqueado (`:181-190`) e `previousStock`/`newStock` são **sempre recalculados no servidor** a partir do estoque atual (`storage.ts:514-521`, correto — nunca confia no saldo enviado pelo cliente). **Porém `movement.userId` é gravado exatamente como veio no corpo da requisição** (`storage.ts:524-528`, `insertMovementSchema` não omite `userId` — `shared/schema.ts:112-117`) — o servidor nunca substitui esse campo por `req.user.sub`. | Todos os pontos que criam movimentação enviam `userId: user?.id` lido do `AuthContext`, que por sua vez vem de `localStorage.getItem("sgat-user")` — editável no DevTools do navegador: `items.tsx:411`, `scanner.tsx:46`, `movement-modal.tsx:76` | 🟠 **Falha correlata (não é bypass de UI, é falsificação de autoria)** — não há tela nem role escondendo nada aqui (a criação de movimentação é aberta a `tech` por design); o problema é que o *autor* registrado no histórico de auditoria é um dado que o cliente escolhe, não um dado que o servidor deriva do token. Ver §5.2. |

### 4.6 Dashboard (`server/routes/dashboard.ts`, montado em `/api/dashboard`)

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/dashboard/stats` (`:7`) | `authenticateJWT` | Visível a todos | ✅ ok |
| `GET /api/dashboard/low-stock` (`:17`) | `authenticateJWT` | Visível a todos | ✅ ok |
| `GET /api/dashboard/recent-movements` (`:27`) | **Só `authenticateJWT`.** Nenhuma verificação de `role`. | `useQuery` só dispara `enabled: isAdmin` (`dashboard.tsx:40-43`); card "Atividades Recentes" só renderiza `{isAdmin && (...)}` (`dashboard.tsx:264`) | 🟡 **BYPASS DE UI menor** — tecnicamente qualquer `tech` obtém o mesmo JSON chamando a rota direto, mas **o mesmo dado (histórico de movimentações) já está 100% acessível para ele via `GET /api/movements` e a própria página `/movements`** — não há elevação real de acesso, só inconsistência de onde a regra é aplicada |
| `GET /api/dashboard/consumption` (`:37`) | `authenticateJWT` | Página `/consumption` só usa `ProtectedRoute` | ✅ consistente |

### 4.7 Presença (`server/routes/activity.ts`, montado em `/api`)

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/users/online` (`:8`) | `authenticateJWT` | Visível a todos no dashboard | ✅ ok (baixa sensibilidade) |
| `POST /api/heartbeat` (`:20`) | `authenticateJWT` + escopo travado em `req.user.sub` | Chamado internamente pelo app | ✅ correto |

---

## 5. Casos de Bypass de UI em detalhe

### 🔴 5.1 — Gestão de usuários é "admin-only" só na tela (CRÍTICO)

**Rotas:** `GET/POST/PUT /api/users*` · **Arquivo:** `server/routes/users.ts:9,21,48`

O React só deixa um `tech` alcançar `/users` via `AdminRoute`. A API não sabe que essa regra
existe. Uma conta `tech` — inclusive uma recém-autorregistrada via `POST /api/register`, que é
pública — pode:

```
1) GET  /api/users                       → lista todo mundo (nome, e-mail, matrícula, role)
2) POST /api/users  {..., "role":"admin"}→ cria um admin novo (se a matrícula estiver na allowlist)
3) PUT  /api/users/<id-de-um-admin>
        {"password":"SenhaEscolhidaPeloAtacante123!"}
                                          → assume a conta daquele admin (senha é hasheada e
                                            gravada por storage.updateUser sem checar quem pediu)
```

O passo 3 não depende de a matrícula do atacante estar na allowlist — a validação de matrícula
só roda quando o corpo da requisição contém `role` ou `matricula`; trocar só `password` (ou só
`email`) escapa dela completamente.

**Correção:** um middleware `requireAdmin` (checando `req.user.role === "admin"`) nas três
rotas, no mesmo padrão já usado em `DELETE /:id`. Para `PUT /:id`, considerar também permitir
que um usuário edite alguns poucos campos do próprio registro (nunca `role`) como exceção
explícita, em vez de abrir a rota inteira.

### 🔴 5.2 — Categorias: CRUD inteiro sem checagem de papel (ALTO)

**Rotas:** `POST/PUT/DELETE /api/categories/:id` · **Arquivo:** `server/routes/inventory.ts:37,51,67`

Mesmo padrão do item 5.1: a página `/categories` é a única barreira, e é 100% client-side.
Uma conta `tech` que nunca vê "Categorias" no menu lateral (`sidebar.tsx:170-203`, bloco
`isAdmin(user) && (...)`) apaga qualquer categoria — e por extensão desorganiza todos os itens
vinculados a ela — com uma chamada direta à API.

**Correção:** mesmo `requireAdmin` sugerido acima, aplicado às três rotas de escrita.

### 🔴 5.3 — Exclusão de itens (ALTO)

**Rota:** `DELETE /api/items/:id` · **Arquivo:** `server/routes/inventory.ts:147`

Diferente de "Editar"/"Entrada"/"Saída" (que são intencionalmente abertos a `tech` — o botão
aparece para todos em `items.tsx`), o botão "Excluir" **é escondido especificamente** por
`canDeleteItems(user)` (`items.tsx:568`, `lib/auth.ts:7-9`). Isso mostra que o time já decidiu
que exclusão de item é admin-only — só não replicou a regra no servidor. Uma conta `tech` chama
`DELETE /api/items/<id>` e o item some, sem passar pelo `confirm()` nem pelo botão que ela nunca
viu.

**Correção:** `requireAdmin` nesta rota especificamente (as demais rotas de item podem
continuar abertas, já que refletem uma decisão de produto e não uma falha).

### 🟠 5.4 — Cadeia crítica: IDOR em `PUT /api/users/:id` + recuperação de senha (CRÍTICO, herdado de F02+F03)

Combinando 5.1 com o fluxo público de recuperação de senha:

```
1) PUT  /api/users/<id-da-vítima>  {"email":"atacante@dominio-do-atacante.com"}
   → passa batido pela validação de matrícula (só mexeu no e-mail)
2) POST /api/password-recovery     {"usernameOrEmail":"<username-da-vítima>"}
   → código de 6 dígitos vai para o e-mail que o atacante acabou de configurar no passo 1
3) POST /api/password-reset        {code, newPassword}
   → conta da vítima (inclusive admin) sob controle total do atacante
```

Isso já está catalogado como F03 na auditoria anterior; ele é reafirmado aqui porque é a
consequência direta e mais grave de 5.1 — a correção de 5.1 elimina esta cadeia por completo.

### ⚠️ 5.5 — Autorregistro público como administrador depende só de uma lista secreta que não é secreta

**Rota:** `POST /api/register` · **Arquivos:** `shared/allowed-admins.ts`, `register.tsx:13,56`,
`users.tsx:22,35`

Tecnicamente esta rota pública **é** validada no servidor (`insertUserSchema` em
`shared/schema.ts:79-98` recusa `role:"admin"` fora da allowlist). O problema não é falta de
checagem no backend — é que a única coisa que separa "qualquer visitante" de "administrador
autorregistrado" é o sigilo de uma lista de ~140 matrículas, e essa lista é **importada
diretamente por componentes do cliente** (`register.tsx:13`, `users.tsx:22`) só para exibir a
mensagem de erro mais cedo. Como o Vite empacota tudo que o cliente importa, a lista completa
vai para o bundle JS público servido na tela de login/registro — quem souber abrir o DevTools
tem a lista inteira de matrículas elegíveis a admin (já catalogado como F07).

**Correção:** mover a validação de "matrícula elegível a admin" só para o backend; no cliente,
validar apenas formato (obrigatório: numérico, N dígitos) e deixar o backend devolver o erro
400 — sem embutir a lista real no bundle.

---

## 6. O que está correto (para contraste)

Vale registrar os pontos em que backend e frontend **concordam de fato**, porque mostram que o
padrão certo já existe no código — só não foi replicado nas rotas acima:

- **`DELETE /api/users/:id`** (`users.ts:105-137`) — único par 100% consistente do sistema:
  checa `role === "admin"` no servidor, replicando exatamente a condição que o React usa para
  desenhar o botão.
- **Cálculo de saldo de estoque** (`storage.ts:498-537`) — `previousStock`/`newStock` de uma
  movimentação são sempre recalculados a partir do estado atual do item no banco; o cliente pode
  mandar qualquer coisa em `quantity`/`type`, mas nunca decide o saldo resultante. (A ressalva é
  só sobre `userId`, tratada em 4.5.)
- **`PUT /api/users/me/password`** e **`POST /api/heartbeat`** — ambas travadas em
  `req.user.sub`; nenhuma aceita operar sobre outro usuário via parâmetro.
- IDs são UUIDv4 aleatórios em todas as tabelas — não sequenciais, o que pelo menos torna
  impraticável adivinhar um `id` por tentativa em qualquer rota que ainda dependa disso.

---

## 7. Priorização das correções

| Prioridade | Ação | Rotas afetadas |
|---|---|---|
| **P0 — bloqueador** | Fazer `ENABLE_JWT` obrigatório (ou removê-lo e sempre autenticar), falhando o boot em produção se ausente, no mesmo padrão já usado para `JWT_SECRET` (`auth.ts:8-19`) | Todas |
| **P0 — bloqueador** | Criar middleware `requireAdmin` e aplicar em `GET/POST/PUT /api/users`, `POST/PUT/DELETE /api/categories/:id`, `DELETE /api/items/:id` | 8 rotas listadas em 5.1–5.3 |
| **P1 — alto** | Em `PUT /api/users/:id`, mesmo após `requireAdmin`, considerar reautenticação (senha atual) para trocar o próprio e-mail, e notificar o e-mail antigo em qualquer troca | `PUT /api/users/:id` |
| **P1 — alto** | Em `POST /api/movements`, ignorar `userId` do corpo e usar sempre `req.user.sub` | `POST /api/movements` |
| **P2 — médio** | Remover a lista real de `ALLOWED_ADMIN_MATRICULAS` do bundle do cliente; validar só formato no React | `shared/allowed-admins.ts`, `register.tsx`, `users.tsx` |
| **P2 — médio** | Definir `ALLOWED_ORIGINS` como obrigatório em produção (nega por padrão se ausente) — já catalogado como F05 | `server/app.ts:54-64` |

---

## 8. Metodologia

Leitura completa e manual de:

- `server/auth.ts`, `server/app.ts`, `server/index.ts`, `api/index.ts` (bootstrap e middlewares globais)
- `server/routes/*.ts` (as 5 rotas montadas: `auth`, `activity`, `inventory`, `users`, `dashboard`) — 31 endpoints HTTP no total
- `server/storage.ts` (camada de persistência, para confirmar o que cada rota realmente grava/hasheia)
- `shared/schema.ts`, `shared/allowed-admins.ts` (validação compartilhada e origem da allowlist)
- `client/src/App.tsx` (definição de `ProtectedRoute`/`AdminRoute` e todas as rotas do Wouter)
- `client/src/hooks/use-auth.tsx`, `client/src/lib/{auth,queryClient}.ts` (como o token é obtido, guardado e anexado às requisições)
- `client/src/pages/{users,categories,items,dashboard,register}.tsx`, `client/src/components/layout/sidebar.tsx` (onde botões/menus são condicionados a `role`)
- Busca exaustiva (`grep`) por `req.user.role`, `role !==`, `role ===`, `requireAdmin`, `requireRole` em todo `server/` para confirmar que não existe nenhuma checagem de papel fora das duas ocorrências citadas na Seção 1

Nenhuma chamada de rede real foi feita contra um ambiente vivo — a validação é 100% estática,
lendo o código que decide cada resposta.

---

*Gerado a partir de leitura estática do código-fonte na branch
`claude/authorization-backend-frontend-audit-529sur`. Referencia achados F01–F10 de
`docs/security-audit/issues-templates.md` onde aplicável; não os reformula.*
