# Mapeamento da Camada de Autorização — Backend vs Frontend (SGAT-TI)

> Complementa `docs/security-audit/issues-templates.md` (auditoria anterior, achados F01–F10).
> Este documento não repete a metodologia daquele relatório: aqui o objetivo é **inventariar
> literalmente toda rota de escrita (e leitura) da API**, dizer qual é a checagem de autorização
> que roda de fato no servidor, e comparar com o que o frontend mostra/esconde — destacando todo
> caso em que a única barreira é visual.

**Data:** 2026-09-03 · **Branch:** `claude/authorization-backend-frontend-audit-529sur`
**Stack:** Express 4 + Drizzle/Postgres (backend) · React 18 + Wouter + TanStack Query (frontend) · JWT (`jsonwebtoken`) + bcrypt

> **Atualização:** todos os itens P0/P1/P2 da Seção 7 já foram corrigidos — parte em sessões
> paralelas que investigaram o mesmo sistema e mergearam em `main` enquanto este relatório era
> escrito ([#4](https://github.com/c1c3ru/AlmoxarifadoTI/pull/4) logs/erros, [#5](https://github.com/c1c3ru/AlmoxarifadoTI/pull/5) matrículas no bundle +
> `JWT_SECRET`, [#6](https://github.com/c1c3ru/AlmoxarifadoTI/pull/6) `requireAdmin` em `POST/PUT /api/users` + autoria de
> `POST /api/movements`), parte neste mesmo branch (o restante do `requireAdmin` que #6 não
> cobriu — `GET /api/users`, as 3 rotas de `/api/categories` e `DELETE /api/items/:id` —, o
> `ENABLE_JWT` seguro por padrão, que nenhuma das outras PRs tocou, e CORS deny-by-default em
> produção). Os dois conjuntos foram reconciliados por merge de `main` neste branch, com os
> pontos de sobreposição resolvidos a favor de uma única implementação (sem duplicar lógica).
> Os vereditos 🔴/🟠 abaixo descrevem o estado **antes** de qualquer uma dessas correções; cada
> um foi marcado com "✅ Corrigido" onde já resolvido. Ver Seção 7 para a atribuição exata de
> qual PR corrigiu o quê.

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
| `POST /api/register` | ~~`insertUserSchema` (Zod) — se `role:"admin"`, exigia matrícula presente em `ALLOWED_ADMIN_MATRICULAS`~~ agora a PR [#6](https://github.com/c1c3ru/AlmoxarifadoTI/pull/6) força `role: "tech"` no servidor, ignorando o que o cliente enviar | Formulário ainda mostra a opção `role: admin` (`register.tsx`), mas isso não tem mais efeito no backend | ✅ **Corrigido pela PR #6** (ver §5.5) — antes: ⚠️ a única barreira para virar admin por autorregistro era uma lista de ~140 matrículas que **vazava no bundle JS público** (F07, auditoria anterior; removida do bundle pela PR [#5](https://github.com/c1c3ru/AlmoxarifadoTI/pull/5)) |
| `PUT /api/users/me/password` | `authenticateJWT` **+** escopo travado em `req.user.sub` (nunca aceita `id` de outro usuário) + confere `currentPassword` via bcrypt | Acessível a todos, mas sempre opera na própria conta | ✅ correto — auto-escopo bem implementado |

### 4.2 Gestão de usuários (`server/routes/users.ts`, montado em `/api/users`) — área "admin" no frontend

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/users` (`:9`) | ~~Só `authenticateJWT`~~ agora `authenticateJWT` + `requireAdmin` | Página `/users` só é roteável via `AdminRoute` (`App.tsx:112-118`, redireciona se `user.role !== "admin"`) | ✅ **Corrigido nesta PR** — antes: 🔴 BYPASS DE UI (qualquer `tech` autenticado lia nome/e-mail/matrícula/role de todos os usuários chamando a API diretamente) |
| `POST /api/users` (`:21`) | ~~Só `authenticateJWT`~~ agora `authenticateJWT` + `requireAdmin` | Botão "Novo Usuário" só existe dentro da página `/users` (admin-only) | ✅ **Corrigido nesta PR** — antes: 🔴 BYPASS DE UI CRÍTICO (um `tech` criava qualquer usuário, inclusive `role: "admin"`) |
| `PUT /api/users/:id` (`:48`) | ~~Só `authenticateJWT`~~ agora `authenticateJWT` + `requireAdmin`. A validação condicional de matrícula-admin (`:61-81`) continua existindo como checagem adicional de regra de negócio. | Botão "Editar" só existe dentro de `/users` (admin-only); modal permite editar `password`, `email`, `role`, `isActive` de qualquer usuário da lista | ✅ **Corrigido nesta PR** — antes: 🔴 BYPASS DE UI CRÍTICO + IDOR (um `tech` conseguia assumir a conta de qualquer usuário, inclusive admin, via `PUT` com `password` novo). A reautenticação extra sugerida para troca de e-mail (P1) segue em aberto. |
| `DELETE /api/users/:id` (`:105`) | `authenticateJWT` **+** `if (currentUser.role !== "admin") return 403` (`:111`) **+** bloqueio de auto-exclusão (`:115`) | Botão "Deletar" só renderiza se `currentUser?.role === "admin"` (`users.tsx:621`) | ✅ **CORRETO** — único par frontend/backend do sistema inteiro onde o servidor replica fielmente a regra que o cliente já impõe visualmente. Referência de como as quatro linhas acima deveriam ter sido escritas. |

### 4.3 Categorias (`server/routes/inventory.ts`, montado em `/api`) — área "admin" no frontend

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/categories` (`:17`) | `authenticateJWT` | Dado não sensível, consumido também pelo dashboard | ✅ ok (leitura) |
| `GET /api/categories/with-counts` (`:27`) | `authenticateJWT` | idem | ✅ ok |
| `POST /api/categories` (`:37`) | ~~Só `authenticateJWT`~~ agora + `requireAdmin` | Página `/categories` inteira atrás de `AdminRoute` (`App.tsx:120-126`) | ✅ **Corrigido nesta PR** |
| `PUT /api/categories/:id` (`:51`) | ~~Só `authenticateJWT`~~ agora + `requireAdmin` | idem | ✅ **Corrigido nesta PR** |
| `DELETE /api/categories/:id` (`:67`) | ~~Só `authenticateJWT`~~ agora + `requireAdmin` | idem | ✅ **Corrigido nesta PR** — antes: 🔴 BYPASS DE UI (apagava categoria inteira, afetando todos os itens vinculados, com uma conta `tech` que nunca via o link "Categorias" no menu) |

### 4.4 Itens (`server/routes/inventory.ts`) — página aberta a todos os autenticados

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/items`, `/items/search`, `/items/:id` | `authenticateJWT` | `/items` usa só `ProtectedRoute` (qualquer logado) | ✅ consistente — leitura é intencionalmente aberta a `tech` |
| `POST /api/items` (`:117`) | `authenticateJWT`, sem checagem de `role` | Botão "Novo Item" sempre visível, sem gate de role (`items.tsx`) | ✅ consistente (aberto a ambos os papéis por design) — ver nota de escopo em §5.5 |
| `PUT /api/items/:id` (`:131`) | `authenticateJWT`, sem checagem de `role` | Botão "Editar" sempre visível | ✅ consistente |
| `DELETE /api/items/:id` (`:147`) | ~~Só `authenticateJWT`~~ agora + `requireAdmin` | Botão só renderiza se `canDeleteItems(user)` → `isAdmin(user)` (`items.tsx:568`, `lib/auth.ts:7-9`) | ✅ **Corrigido nesta PR** — antes: 🔴 BYPASS DE UI (`tech` sem o botão na tela apagava qualquer item via `DELETE /api/items/<id>`) |
| `GET/POST /api/inventory/export*`, `/import` (`:203,229,259`) | `authenticateJWT` (+ rate limit no import) | `CSVImportExport` sempre visível, sem gate de role | ✅ consistente (aberto por design) |

### 4.5 Movimentações (`server/routes/inventory.ts`) — página aberta a todos os autenticados

| Rota | Checagem exata no servidor | Barreira no frontend | Veredito |
|---|---|---|---|
| `GET /api/movements` (`:160`) | `authenticateJWT` | `/movements` usa só `ProtectedRoute` | ✅ consistente |
| `POST /api/movements` (`:174`) | `authenticateJWT`, sem checagem de `role` (correto — aberta a `tech` por design). Estoque insuficiente é bloqueado (`:181-190`) e `previousStock`/`newStock` são **sempre recalculados no servidor** a partir do estoque atual (`storage.ts:514-521`, correto). ~~`movement.userId` era gravado exatamente como veio no corpo~~ agora o handler sobrescreve com `req.user.sub` antes de chamar `storage.createMovement` (só cai no valor do corpo se a autenticação estiver explicitamente desligada). | Todos os pontos que criam movimentação enviam `userId: user?.id` lido do `AuthContext` — client-side, mas agora irrelevante para o servidor: `items.tsx:411`, `scanner.tsx:46`, `movement-modal.tsx:76` | ✅ **Corrigido nesta PR** — antes: 🟠 falsificação de autoria possível (ver §5.2, agora histórico) |

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

### 🔴 5.1 — Gestão de usuários é "admin-only" só na tela (CRÍTICO) — ✅ CORRIGIDO NESTA PR

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

### 🔴 5.2 — Categorias: CRUD inteiro sem checagem de papel (ALTO) — ✅ CORRIGIDO NESTA PR

**Rotas:** `POST/PUT/DELETE /api/categories/:id` · **Arquivo:** `server/routes/inventory.ts:37,51,67`

Mesmo padrão do item 5.1: a página `/categories` é a única barreira, e é 100% client-side.
Uma conta `tech` que nunca vê "Categorias" no menu lateral (`sidebar.tsx:170-203`, bloco
`isAdmin(user) && (...)`) apaga qualquer categoria — e por extensão desorganiza todos os itens
vinculados a ela — com uma chamada direta à API.

**Correção:** mesmo `requireAdmin` sugerido acima, aplicado às três rotas de escrita.

### 🔴 5.3 — Exclusão de itens (ALTO) — ✅ CORRIGIDO NESTA PR

**Rota:** `DELETE /api/items/:id` · **Arquivo:** `server/routes/inventory.ts:147`

Diferente de "Editar"/"Entrada"/"Saída" (que são intencionalmente abertos a `tech` — o botão
aparece para todos em `items.tsx`), o botão "Excluir" **é escondido especificamente** por
`canDeleteItems(user)` (`items.tsx:568`, `lib/auth.ts:7-9`). Isso mostra que o time já decidiu
que exclusão de item é admin-only — só não replicou a regra no servidor. Uma conta `tech` chama
`DELETE /api/items/<id>` e o item some, sem passar pelo `confirm()` nem pelo botão que ela nunca
viu.

**Correção:** `requireAdmin` nesta rota especificamente (as demais rotas de item podem
continuar abertas, já que refletem uma decisão de produto e não uma falha).

### 🟠 5.4 — Cadeia crítica: IDOR em `PUT /api/users/:id` + recuperação de senha (CRÍTICO, herdado de F02+F03) — ✅ CORRIGIDO NESTA PR (via 5.1)

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

### ⚠️ 5.5 — Autorregistro público como administrador depende só de uma lista secreta que não é secreta — ✅ CORRIGIDO (PRs #5 e #6)

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

| Prioridade | Ação | Rotas afetadas | Status |
|---|---|---|---|
| **P0 — bloqueador** | Tornar a autenticação segura por padrão: `ENABLE_JWT` agora só desliga a autenticação se setado explicitamente para `"false"`/`"0"` — a ausência da variável mantém a autenticação **ligada** (antes era o oposto) | Todas | ✅ **Corrigido neste branch** (`server/auth.ts`) — nenhuma das PRs #4/#5/#6 tocou nisso. Optou-se por inverter o padrão em vez de `process.exit(1)` no boot para não derrubar em produção um deploy que hoje já roda sem essa variável; a checagem de força do `JWT_SECRET` (endurecida pela #5) passou a rodar também sempre que `NODE_ENV=production`, além de quando `ENABLE_JWT` é ligado explicitamente — sem isso, um deploy em produção sem `ENABLE_JWT` setado passaria a exigir auth (com a inversão de padrão) sem nunca ter validado a força do segredo. Ver nota de risco operacional abaixo. |
| **P0 — bloqueador** | Criar middleware `requireAdmin` e aplicar em `GET/POST/PUT /api/users`, `POST/PUT/DELETE /api/categories/:id`, `DELETE /api/items/:id` | 8 rotas listadas em 5.1–5.3 | ✅ **Corrigido, dividido entre a PR [#6](https://github.com/c1c3ru/AlmoxarifadoTI/pull/6) e este branch** — #6 criou o middleware `requireAdmin` e já tinha aplicado em `POST /api/users` e `PUT /api/users/:id` (e refatorado `DELETE /api/users/:id` para usá-lo). Este branch aplicou nas 4 rotas que #6 não cobriu: `GET /api/users`, `POST/PUT/DELETE /api/categories/:id` e `DELETE /api/items/:id`. Reconciliado por merge de `main`, sem duplicação. |
| **P1 — alto** | Em `PUT /api/users/:id`, mesmo após `requireAdmin`, considerar reautenticação (senha atual) para trocar o próprio e-mail, e notificar o e-mail antigo em qualquer troca | `PUT /api/users/:id` | ⏳ Em aberto — a rota já exige admin (fecha a cadeia crítica de 5.4), mas a reautenticação extra por e-mail não foi implementada em nenhuma das PRs |
| **P1 — alto** | Em `POST /api/movements`, ignorar `userId` do corpo e usar sempre `req.user.sub` | `POST /api/movements` | ✅ **Corrigido pela PR [#6](https://github.com/c1c3ru/AlmoxarifadoTI/pull/6)** — injeta `userId: currentUser.sub` no corpo antes de validar com `insertMovementSchema`. Este branch tinha uma correção equivalente (aplicada depois da validação); removida no merge para não duplicar a mesma proteção de duas formas diferentes no mesmo handler. |
| **P2 — médio** | Remover a lista real de `ALLOWED_ADMIN_MATRICULAS` do bundle do cliente; validar só formato no React | `shared/allowed-admins.ts`, `register.tsx`, `users.tsx` | ✅ **Corrigido pela PR [#5](https://github.com/c1c3ru/AlmoxarifadoTI/pull/5)** — `register.tsx`/`users.tsx` não importam mais `shared/allowed-admins.ts`; a validação real continua só no backend (`shared/schema.ts`), que responde 400 e é mapeado de volta para o campo do formulário. A mesma PR também endureceu a checagem de `JWT_SECRET` fraco para rodar sempre que `ENABLE_JWT` está ligado, não só quando `NODE_ENV=production`. A PR [#6](https://github.com/c1c3ru/AlmoxarifadoTI/pull/6), à parte, também passou a forçar `role: "tech"` no servidor em `POST /api/register` independentemente do que o cliente envie (fecha a variante de auto-registro público do mesmo problema, discutida em §5.5). |
| **P2 — médio** | Definir `ALLOWED_ORIGINS` como obrigatório em produção (nega por padrão se ausente) — já catalogado como F05 | `server/app.ts:54-64` | ✅ **Corrigido neste branch** — nega por padrão quando `NODE_ENV=production` e a variável está ausente; nenhuma das outras PRs tocou nisso |

Como bônus, a PR [#4](https://github.com/c1c3ru/AlmoxarifadoTI/pull/4) corrigiu uma categoria inteira de achados que não fazia parte
do escopo original deste relatório (autorização): vazamento de dados sensíveis em logs e mensagens
de erro (código de recuperação de senha em texto puro no log, `error.message` cru repassado ao
cliente em respostas 500, corpo de resposta com token JWT sendo logado, e-mail do destinatário e
resposta bruta do SMTP no log de envio de e-mail) — ver
`docs/security-audit/logs-error-handling-findings.md`, adicionado por aquela PR.

### Nota de risco operacional (ENABLE_JWT)

Se o ambiente de produção atual **não** tiver `ENABLE_JWT` definido (o cenário provável, já que a
variável nunca foi documentada), ele está rodando hoje com autenticação desligada. A partir do
deploy desta correção, a autenticação passa a ficar **ligada por padrão** — o que é a correção
correta, mas tem um efeito colateral esperado: qualquer sessão de navegador já aberta antes do
deploy, que não tem token salvo (`sgat-token`) porque nunca precisou de um, vai passar a receber
`401` na primeira chamada à API depois do deploy e ser redirecionada para `/login`
(`client/src/lib/queryClient.ts:47-55`) — basta logar de novo para voltar ao normal, nenhum dado é
perdido. Vale avisar os usuários do sistema com antecedência.

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
