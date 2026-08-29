# Templates de Issues — Auditoria de Segurança — SGAT-TI (Sistema de Gestão de Almoxarifado de TI)

Gerado em 29/08/2026 a partir de audit_data.py. Copie cada seção `###` abaixo (até a próxima) diretamente para uma nova issue no GitHub.

---

### [SECURITY][CRÍTICO] Middleware de autenticação vira no-op quando ENABLE_JWT não está configurado

**Labels:** `security, critical, bug`
**Categoria:** Permissões Frontend vs Backend
**Severidade:** Crítico
**ID do achado:** F01

**Arquivos afetados:**
- `server/auth.ts` (linhas 24-27, 50-51)

**Descrição / Impacto:**
isAuthEnabled() só retorna true se a variável de ambiente ENABLE_JWT for exatamente 'true' ou '1'. authenticateJWT() chama isAuthEnabled() e, se for false, executa apenas `return next()` — ou seja, ignora completamente a validação do token e deixa a requisição prosseguir sem usuário autenticado. Essa variável NÃO aparece em env.example nem no README, então um deploy seguindo a documentação oficial do próprio projeto fica com autenticação inteiramente desligada por padrão.

**Cenário de exploração (evidência):**
```
Um deploy em Vercel/Replit que siga o env.example do próprio repositório não define ENABLE_JWT. Resultado: TODAS as rotas protegidas por authenticateJWT — /api/users, /api/categories, /api/items, /api/movements, /api/dashboard/* — respondem para qualquer requisição HTTP não autenticada, de qualquer origem. Um atacante anônimo lista, cria, edita e apaga dados de estoque e usuários sem nenhuma credencial.
```

**Trecho de código relevante:**
```ts
export function isAuthEnabled() {
  const enableJwtValue = process.env.ENABLE_JWT;
  return enableJwtValue === "true" || enableJwtValue === "1";
}
...
export async function authenticateJWT(req, res, next) {
  if (!isAuthEnabled()) return next();  // <-- sem ENABLE_JWT, libera geral

```

**Correção recomendada:**
Inverter o padrão: autenticação deve ser exigida por padrão e exigir opt-out explícito (nunca opt-in). Remover a flag ENABLE_JWT ou, no mínimo, falhar o boot do servidor em produção se ela não estiver definida como true (mesmo padrão já aplicado à validação de JWT_SECRET no mesmo arquivo).

**Checklist de aceite:**
- [ ] Correção implementada em `server/auth.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F01 marcado como resolvido neste relatório na próxima auditoria
---

### [SECURITY][CRÍTICO] PUT /api/users/:id permite qualquer usuário autenticado alterar senha/e-mail/papel de QUALQUER outro usuário

**Labels:** `security, critical, bug`
**Categoria:** IDOR
**Severidade:** Crítico
**ID do achado:** F02

**Arquivos afetados:**
- `server/routes/users.ts` (linhas 9, 21, 48-102)

**Descrição / Impacto:**
As rotas GET / (listar todos os usuários), POST / (criar usuário) e PUT /:id (atualizar usuário por ID arbitrário) usam apenas o middleware authenticateJWT — nenhuma delas verifica req.user.role. O :id na URL é uma referência direta a objeto (IDOR clássico): o corpo de PUT aceita os mesmos campos de insertUserSchema, incluindo password, email e role. A checagem de matrícula para role admin (linhas 60-81) só é executada SE updateData.role ou updateData.matricula estiverem presentes no corpo — um ataque que só troca a senha (sem tocar em role/matricula) não passa por nenhuma validação de autorização. Apenas o DELETE /:id (linha 111) verifica corretamente `currentUser.role !== 'admin'`.

**Cenário de exploração (evidência):**
```
Um usuário 'tech' autentica normalmente, obtém seu próprio JWT válido e chama `PUT /api/users/<id-de-um-admin>` com body `{"password": "<senha-escolhida-pelo-atacante>"}`. Como role/matricula não mudam, a checagem de allowlist é pulada, storage.updateUser hasheia a nova senha e grava — o atacante agora loga como aquele administrador. O mesmo endpoint também permite ler (GET /) e-mail, matrícula e papel de todos os usuários do sistema.
```

**Trecho de código relevante:**
```ts
router.put("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const validation = baseInsertUserSchema.partial().safeParse(req.body);
  ...
  const user = await storage.updateUser(id, updateData); // sem checar role/dono

```

**Correção recomendada:**
Exigir role === 'admin' em GET /, POST / e PUT /:id, OU permitir que um usuário comum edite apenas o próprio registro (id === req.user.sub) e somente campos não sensíveis (nunca role). Aplicar o mesmo padrão já usado corretamente em DELETE /:id.

**Checklist de aceite:**
- [ ] Correção implementada em `server/routes/users.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F02 marcado como resolvido neste relatório na próxima auditoria
---

### [SECURITY][CRÍTICO] Cadeia de exploração: IDOR em PUT /api/users/:id + recuperação de senha = takeover completo de conta (inclusive admin)

**Labels:** `security, critical, bug`
**Categoria:** IDOR
**Severidade:** Crítico
**ID do achado:** F03

**Arquivos afetados:**
- `server/routes/users.ts` (linhas 48-102)
- `server/routes/auth.ts` (linhas 20-50)

**Descrição / Impacto:**
Combinando F02 com o fluxo de recuperação de senha: o atacante chama PUT /api/users/<id-vítima> alterando apenas o campo `email` para um endereço que ele controla (essa troca também escapa da checagem de matrícula, pois não altera role nem matricula). Em seguida chama POST /api/password-recovery com o username da vítima — o código de 6 dígitos é enviado para o e-mail que o próprio atacante acabou de configurar. Com o código em mãos, chama POST /api/password-reset e define uma nova senha para a conta da vítima.

**Cenário de exploração (evidência):**
```
Qualquer conta 'tech' recém-registrada (o autorregistro é público — POST /api/register) consegue assumir o controle de QUALQUER conta 'admin' existente sem nunca ter tido acesso ao e-mail ou senha originais da vítima — resultado final é escalonamento de privilégio completo a partir de uma conta de menor privilégio.
```

**Trecho de código relevante:**
```ts
// passo 1
PUT /api/users/<vitima-id>  { "email": "atacante@evil.com" }
// passo 2
POST /api/password-recovery { "usernameOrEmail": "<username-vitima>" }
// passo 3 — código chega no inbox do atacante
POST /api/password-reset { "usernameOrEmail": ..., "code": ..., "newPassword": "<senha-escolhida-pelo-atacante>" }
```

**Correção recomendada:**
Corrigir F02 elimina esta cadeia. Adicionalmente: exigir reautenticação (senha atual) para qualquer alteração do próprio e-mail, e notificar o e-mail ANTIGO sempre que o e-mail de uma conta for alterado.

**Checklist de aceite:**
- [ ] Correção implementada em `server/routes/users.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F03 marcado como resolvido neste relatório na próxima auditoria
---

### [SECURITY][ALTO] CRUD de categorias sem checagem de papel no backend, apesar de restrito a admin no frontend

**Labels:** `security, high-priority, bug`
**Categoria:** Permissões Frontend vs Backend
**Severidade:** Alto
**ID do achado:** F04

**Arquivos afetados:**
- `server/routes/inventory.ts` (linhas 37, 51, 67)

**Descrição / Impacto:**
POST /categories, PUT /categories/:id e DELETE /categories/:id usam apenas authenticateJWT. No React, a página /categories só é alcançável por quem passa pelo componente AdminRoute (client/src/App.tsx:120-126), criando uma falsa sensação de que a função é exclusiva de administradores.

**Cenário de exploração (evidência):**
```
Um usuário 'tech' (que nunca vê o link 'Categorias' no menu) pode, mesmo assim, chamar `DELETE /api/categories/<id>` diretamente via fetch/curl usando o próprio token válido e apagar uma categoria inteira — afetando todos os itens vinculados a ela.
```

**Trecho de código relevante:**
```ts
router.post("/categories", authenticateJWT, async (req, res) => { ... }
router.put("/categories/:id", authenticateJWT, async (req, res) => { ... }
router.delete("/categories/:id", authenticateJWT, async (req, res) => { ... }
```

**Correção recomendada:**
Criar um middleware requireAdmin reutilizável e aplicá-lo em todas as rotas mutáveis de /categories (POST, PUT, DELETE), replicando a mesma regra que o frontend já impõe visualmente.

**Checklist de aceite:**
- [ ] Correção implementada em `server/routes/inventory.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F04 marcado como resolvido neste relatório na próxima auditoria
---

### [SECURITY][ALTO] CORS permite qualquer origem quando ALLOWED_ORIGINS não está configurado, combinado com credentials: true

**Labels:** `security, high-priority, bug`
**Categoria:** Isolamento
**Severidade:** Alto
**ID do achado:** F05

**Arquivos afetados:**
- `server/app.ts` (linhas 54-64)

**Descrição / Impacto:**
allowedOrigins é derivado de process.env.ALLOWED_ORIGINS (CSV). Se a variável não estiver definida, allowedOrigins.length === 0 e a função de callback do CORS considera `isAllowed = true` para QUALQUER origin, com `credentials: true`. Assim como ENABLE_JWT, ALLOWED_ORIGINS não é mencionada no README nem no exemplo mínimo de variáveis de ambiente, apenas em env.example — que não é o mesmo arquivo consultado no README.

**Cenário de exploração (evidência):**
```
Sem ALLOWED_ORIGINS definido em produção, um site malicioso hospedado em qualquer domínio pode fazer requisições cross-origin para a API e ler as respostas JSON (o header Access-Control-Allow-Origin reflete a origem do atacante). Combinado com F01 (auth desligada por padrão), isso permite exfiltração silenciosa de dados a partir do navegador de qualquer visitante de uma página maliciosa.
```

**Trecho de código relevante:**
```ts
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',')...
app.use(cors({
  origin: (origin, callback) => {
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,

```

**Correção recomendada:**
Trocar o padrão para 'negar por padrão': se ALLOWED_ORIGINS estiver vazio, bloquear (isAllowed = false), exceto explicitamente em NODE_ENV === 'development'. Documentar a variável como obrigatória no README e no env.example.

**Checklist de aceite:**
- [ ] Correção implementada em `server/app.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F05 marcado como resolvido neste relatório na próxima auditoria
---

### [SECURITY][MÉDIO] Lista de matrículas autorizadas a virar admin é enviada ao bundle JavaScript público do cliente

**Labels:** `security, bug`
**Categoria:** Chaves Expostas
**Severidade:** Médio
**ID do achado:** F07

**Arquivos afetados:**
- `shared/allowed-admins.ts` (linhas 1-16)
- `client/src/pages/users.tsx` (linhas 22, 35)
- `client/src/pages/register.tsx` (linhas 57)

**Descrição / Impacto:**
ALLOWED_ADMIN_MATRICULAS (~140 matrículas reais de funcionários) vive em shared/, importado tanto pelo servidor (shared/schema.ts) quanto diretamente por páginas do cliente (users.tsx, register.tsx) para validação de formulário. Como o Vite empacota tudo que é importado pelo cliente, essa lista completa é embutida no arquivo JS público servido a QUALQUER visitante da tela de login/registro, autenticado ou não.

**Cenário de exploração (evidência):**
```
Qualquer pessoa abre as ferramentas de desenvolvedor do navegador na tela pública de login, procura pelo bundle e extrai a lista completa de ~140 matrículas de funcionários elegíveis a administrador — dado interno/PII que não deveria ser público, e que também ajuda um atacante a priorizar quais contas 'tech' valeria mais a pena comprometer (via F02/F03) para depois se autopromover a admin.
```

**Trecho de código relevante:**
```ts
// client/src/pages/users.tsx
import { ALLOWED_ADMIN_MATRICULAS } from "../../../shared/allowed-admins";
...
if (val.role === "admin" && !ALLOWED_ADMIN_MATRICULAS.includes(val.matricula)) {
```

**Correção recomendada:**
Mover a validação de matrícula-admin inteiramente para o backend (ela já existe lá, em shared/schema.ts) e no cliente validar apenas o formato do campo, sem embutir a lista real — o backend responde com erro 400 do mesmo jeito se a matrícula não for permitida.

**Checklist de aceite:**
- [ ] Correção implementada em `shared/allowed-admins.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F07 marcado como resolvido neste relatório na próxima auditoria
---

### [SECURITY][MÉDIO] HTML Injection no e-mail de recuperação de senha por falta de validação/escape server-side

**Labels:** `security, bug`
**Categoria:** XSS
**Severidade:** Médio
**ID do achado:** F08

**Arquivos afetados:**
- `server/email.ts` (linhas 63, 67)
- `shared/schema.ts` (linhas 74-98)

**Descrição / Impacto:**
sendPasswordResetEmail interpola `username` diretamente dentro de uma string HTML (`<strong>${username}</strong>`) sem qualquer escaping. O formato de e-mail só é validado no cliente (zod .email() em register.tsx) — no schema compartilhado usado pelo backend (baseInsertUserSchema, derivado de createInsertSchema(users)), os campos username/email/name são texto livre, sem refinamento de formato. Uma chamada direta a POST /api/register (fora do navegador) pode gravar HTML/JS arbitrário nesses campos.

**Cenário de exploração (evidência):**
```
Um atacante chama POST /api/register com `username: "<img src=x onerror=alert(document.domain)>"`. O valor é gravado sem sanitização. Ao disparar /api/password-recovery para essa conta, o payload HTML é entregue sem escaping dentro do e-mail — clientes de e-mail que renderizam HTML (a maioria) executam o markup malicioso no contexto de quem abre a mensagem. Combinado com F02/F03, o campo e-mail de destino também pode ser redirecionado.
```

**Trecho de código relevante:**
```ts
// server/email.ts
html: `... <p>Olá <strong>${username}</strong>,</p> ...`
// shared/schema.ts — nenhum .email()/.regex() aplicado a username/email/name
export const baseInsertUserSchema =
  createInsertSchema(users).omit({ id: true, createdAt: true });
```

**Correção recomendada:**
Escapar entidades HTML antes de interpolar qualquer valor fornecido pelo usuário em templates de e-mail (ex.: um helper escapeHtml()), e adicionar .email() e um regex de caracteres seguros para username/name diretamente no schema Zod compartilhado (shared/schema.ts), não só no formulário do React.

**Checklist de aceite:**
- [ ] Correção implementada em `server/email.ts`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado F08 marcado como resolvido neste relatório na próxima auditoria
