# Auditoria — Logs e Tratamento de Erros (Vazamento de Dados Sensíveis)

**Repositório:** c1c3ru/AlmoxarifadoTI
**Branch auditada:** `claude/logs-error-handling-data-leak-czp2o6`
**Escopo:** blocos `try/catch`, middlewares de erro e instâncias de `console.log`/`console.error`/`console.warn` em `server/`, `api/`, `scripts/` e `client/src/` (nenhuma biblioteca de logging estruturado — Winston/Pino/Morgan/Bunyan — está em uso; todo log é `console.*` puro).

Este documento é complementar ao relatório em `docs/security-audit/relatorio-auditoria-seguranca.pdf` (5 categorias: Isolamento, Permissões Frontend vs Backend, IDOR, Chaves Expostas, XSS). Ele **não** foi integrado a `audit_data.py`/ao PDF porque a skill `audit-security` fixa deliberadamente essas 5 categorias e não inclui "Logs e Tratamento de Erros" — este é um relatório próprio, mesmo padrão de rigor (arquivo:linha real, sem achismo).

## Regras aplicadas

1. Analisar `try/catch`, middlewares de erro e `console.log/error` ou libs de logging.
2. Apontar onde detalhes internos de infraestrutura (stack traces, queries SQL puras) podem vazar ao usuário final via resposta da API (Status 500 não tratados).
3. Apontar onde dados sensíveis (senhas em plain text, tokens, e-mails, payload completo de requisição) são gravados indevidamente nos logs do servidor.

## Resumo executivo

| Severidade | Qtde |
|---|---|
| Crítico | 3 |
| Alto | 3 |
| Médio | 3 |
| Baixo | 3 |
| **Total** | **12** |

| ID | Severidade | Regra | Arquivo:Linha | Título |
|---|---|---|---|---|
| L01 | Crítico | #3 | `server/routes/auth.ts:39` | Código de recuperação de senha (segredo) gravado em log |
| L02 | Crítico | #2 | `server/routes/inventory.ts:198` | Objeto de erro bruto devolvido ao cliente em 500 |
| L03 | Crítico | #2 | `server/routes/users.ts:135` | `error.message` bruto devolvido ao cliente em 500 |
| L04 | Alto | #2 | `server/routes/inventory.ts:331-333` | Mensagem de erro (possivelmente de banco) devolvida via `results.errors` |
| L05 | Alto | #2 | `server/app.ts` (sem handler) vs `server/index.ts:16-28` | Sem middleware de erro centralizado no app de produção (Vercel) |
| L06 | Alto | #3 | 26 ocorrências em `server/routes/*.ts` e `server/storage.ts` | `console.error(label, error)` grava objeto de erro completo |
| L07 | Médio | #3 | `server/email.ts:86` | E-mail do usuário gravado em log |
| L08 | Médio | #3 | `server/email.ts:89-94` | Detalhes de resposta/comando SMTP gravados em log |
| L09 | Médio | #3 | `server/app.ts:70-95` | Log de acesso captura corpo da resposta (pode incluir token) |
| L10 | Baixo | #3 | `scripts/restore-admin.ts:51` | Senha em texto puro impressa no console (script) |
| L11 | Baixo | #3 | `scripts/check-database.ts:22-23` | Amostra de e-mails reais impressa no console (script) |
| L12 | Baixo | #1/#3 | `client/src/hooks/use-auth.tsx:40,46` | Token JWT parcial e username no console do navegador |

---

## Críticos

### L01 — Código de recuperação de senha gravado em log do servidor
**Arquivo:** `server/routes/auth.ts:39`
```ts
console.log(`[password-recovery] Generated code ${resetCode} for user ${user.username} (ID: ${user.id})`);
```
O código de 6 dígitos gerado em `auth.ts:34` é, na prática, uma credencial temporária válida por 1h (`auth.ts:35`) — quem a possui redefine a senha de qualquer conta (inclusive admin) via `POST /api/password-reset`. Gravá-lo em log dá a qualquer pessoa com acesso ao log do servidor (dashboard de hosting, agregador de logs, etc.) a mesma capacidade de um invasor que interceptasse o e-mail. **Correção:** remover o `console.log` ou, se necessário para debug, logar apenas `user.id` sem o código.

### L02 — Objeto de erro bruto devolvido ao cliente em resposta 500
**Arquivo:** `server/routes/inventory.ts:195-199`
```ts
} catch (error) {
    console.error("Create movement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ message: errorMessage, detail: error });   // linha 198
}
```
Diferente de todos os outros `catch` do projeto (que devolvem mensagens genéricas fixas), este endpoint (`POST /api/movements`) serializa o **objeto de erro inteiro** em `detail`. Erros do driver Neon/Postgres/Drizzle frequentemente carregam campos como `code`, `detail`, `table`, `constraint`, `severity` (e, dependendo da versão do driver, texto de query) — exatamente "detalhes internos de infraestrutura" chegando ao usuário final via 500 não tratado. **Correção:** remover `detail: error` da resposta; manter só `message` genérica ao cliente e logar detalhes no servidor.

### L03 — `error.message` bruto devolvido ao cliente
**Arquivo:** `server/routes/users.ts:133-136`
```ts
} catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: error?.message || "Erro interno do servidor" });   // linha 135
}
```
Todos os outros handlers de `users.ts`/`inventory.ts`/`dashboard.ts` retornam uma string fixa ("Internal server error"); só este (`DELETE /api/users/:id`) repassa `error.message` diretamente. Se `storage.deleteUser` (que já trata FK constraint internamente e relança "outros erros" — `storage.ts:252`) propagar uma exceção não prevista, o texto bruto do driver de banco vai para a resposta HTTP. **Correção:** usar mensagem genérica fixa, como nos demais handlers.

---

## Altos

### L04 — Mensagem de erro (possivelmente de banco) devolvida via `results.errors` na importação CSV
**Arquivo:** `server/routes/inventory.ts:296-335` (ponto de vazamento: linha 332)
```ts
for (let i = 0; i < body.length; i++) {
    try {
        ...
        if (!name?.trim()) throw new Error("Nome do item não informado");
        await storage.createItem({ ... });
        results.success++;
    } catch (err: any) {
        results.errors.push(`Linha ${i + 2}: ${err.message}`);   // linha 332
    }
}
res.json(results);   // linha 335 — devolvido ao cliente
```
A única exceção lançada explicitamente no laço tem mensagem controlada ("Nome do item não informado"), mas `storage.createItem` (que insere no banco) também pode lançar — nesse caso, `err.message` de uma falha real do Postgres/Drizzle (ex.: violação de constraint) é incluído em `results.errors`, que é serializado direto na resposta ao cliente. **Correção:** capturar erros de banco separadamente e mapear para uma mensagem genérica antes de adicioná-los a `results.errors`.

### L05 — Ausência de middleware de erro centralizado no caminho de produção (Vercel)
**Arquivos:** `server/app.ts` (nenhum `app.use((err, req, res, next) => ...)` registrado em `createApp()`) vs. `server/index.ts:16-28` (handler existe, mas só é montado pelo entry point de desenvolvimento local/`npm start`)
```ts
// server/index.ts — só roda fora do Vercel
app.use((err, _req, res, _next) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  console.error("[error]", { status, message, stack: app.get("env") === "development" ? err?.stack : undefined });
  if (!res.headersSent) res.status(status).json({ message });
});
```
`vercel.json` roteia toda a API para `api/index.ts`, que importa **apenas** `createApp()` de `server/app.ts` (via `dist/server/app.js`) — o handler acima nunca é registrado nesse caminho. Assim, qualquer erro que não seja pego por um `try/catch` de rota (ex.: JSON malformado no body, lançado por `express.json()` em `app.ts:67`; um `throw` síncrono em algum middleware) cai no handler padrão do Express, cujo comportamento (incluir ou não stack trace) depende inteiramente de `NODE_ENV` estar corretamente setado como `production` no ambiente serverless — não há garantia em código. Hoje a Vercel define `NODE_ENV=production` por padrão, então o risco prático é baixo, mas é uma lacuna de defesa em profundidade: não há rede de segurança própria da aplicação para "Status 500 não tratados" no runtime que efetivamente serve produção. **Correção:** registrar um error handler equivalente também em `createApp()` (`server/app.ts`), sempre devolvendo mensagem genérica e nunca `err.stack` ao cliente, independentemente de `NODE_ENV`.

### L06 — Objetos de erro completos gravados em `console.error` em praticamente todas as rotas
**Arquivos (uma amostra representativa; padrão se repete em todos os handlers):**
- `server/routes/auth.ts:47, 82, 118, 148, 179`
- `server/routes/users.ts:15, 42, 99, 134`
- `server/routes/inventory.ts:22, 32, 46, 62, 74, 85, 100, 112, 126, 142, 154, 169, 196, 224, 254, 337`
- `server/routes/dashboard.ts:12, 22, 32, 42`
- `server/routes/activity.ts:14, 29`
- `server/storage.ts:30-32, 59-61` (dentro de `getDb()`/`ensureDeletedAtColumn()`)

```ts
} catch (error) {
    console.error("Login error:", error);   // exemplo: server/routes/auth.ts:118
    res.status(500).json({ message: "Internal server error" });
}
```
O padrão `console.error(label, error)` grava o objeto `error` inteiro (não apenas `.message`). Para erros do driver Postgres/Neon isso normalmente inclui `detail`, `table`, `column`, `constraint` — que podem conter o valor de campo que violou a constraint (ex.: e-mail ou matrícula duplicados enviados por um usuário). Nenhuma resposta HTTP é afetada (todas usam mensagem genérica, exceto L02/L03/L04 acima), mas o log do servidor acumula esse conteúdo sem nenhuma sanitização/redação — exatamente o tipo de dado que a Regra 3 pede para não gravar em log. **Correção:** padronizar para logar apenas `{ message: error.message, code: error.code }` (nunca o objeto inteiro), e considerar uma lib de logging estruturado com redação de campos sensíveis se o volume justificar.

---

## Médios

### L07 — E-mail do usuário gravado em log do servidor
**Arquivo:** `server/email.ts:85-87`
```ts
await this.transporter.sendMail(mailOptions);
console.log(`[email] Password reset email sent to ${email}`);   // linha 86
```
Exemplo direto do que a Regra 3 cita nominalmente ("e-mails"). Não é crítico isoladamente, mas é PII sendo gravada sem necessidade — o e-mail já está associado ao `user.id`/`username` que aparecem em outros logs (inclusive no L01, agravando o problema).

### L08 — Detalhes de resposta/comando SMTP gravados em log de erro
**Arquivo:** `server/email.ts:88-96`
```ts
} catch (error: any) {
    console.error('[email] Failed to send password reset email:', {
        message: error.message,
        code: error.code,
        command: error.command,     // ex.: "RCPT TO", "AUTH LOGIN"
        response: error.response    // resposta bruta do servidor SMTP
    });
    return false;
}
```
`command`/`response` expõem a conversa SMTP crua (host de destino, respostas do servidor de e-mail) nos logs — infraestrutura interna do provedor de e-mail vazando para o log da aplicação (Regra 3). Baixo risco de exposição de credenciais em si (usuário/senha SMTP não aparecem aqui), mas ainda é detalhe de infraestrutura desnecessário no log.

### L09 — Log de acesso captura corpo da resposta, incluindo possíveis tokens
**Arquivo:** `server/app.ts:70-95`
```ts
const originalResJson = res.json.bind(res);
res.json = function (bodyJson) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
};
res.on("finish", () => {
    ...
    if (capturedJsonResponse) {
        try { logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`; } catch { }
    }
    if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";   // única "proteção"
    log(logLine);
});
```
`POST /api/auth/login` responde `{ user, token }` (`server/routes/auth.ts:113`). Esse corpo é capturado e concatenado ao log de acesso; a única coisa que evita o JWT completo (ou campos do usuário) de aparecer no log é o corte arbitrário em 80 caracteres — não é uma redação deliberada, é um efeito colateral do formato do log. Qualquer mudança de ordem/tamanho dos campos JSON pode voltar a expor um token válido (ou parte dele) no log de acesso. **Correção:** não serializar o corpo da resposta no log (registrar só método/rota/status/duração), ou aplicar uma lista de bloqueio explícita de campos (`token`, `password`) antes de logar.

---

## Baixos / Observações complementares

### L10 — Senha em texto puro impressa no console em script operacional
**Arquivo:** `scripts/restore-admin.ts:48-55`
```ts
console.log("\n✅ Usuário administrador criado com sucesso!");
console.log("📋 Detalhes (a senha abaixo só aparece agora — anote-a):");
console.log(`   Username: admin`);
console.log(`   Password: ${generatedPassword}`);   // linha 51
```
O comentário no código (linhas 29-30) afirma que a senha "só existe neste console output; não é persistida em texto puro em nenhum lugar" — mas stdout de scripts de bootstrap executados em CI/deploy (Vercel build logs, GitHub Actions, etc.) é tipicamente capturado e retido por bastante tempo, e frequentemente acessível a mais pessoas do que o terminal interativo original. Severidade baixa porque é um script de uso único (não faz parte do runtime da API), mas ainda é uma gravação de credencial em texto puro em um canal de log.

### L11 — Amostra de e-mails reais impressa no console em script de diagnóstico
**Arquivo:** `scripts/check-database.ts:21-24`
```ts
if (table === 'users' && count > 0) {
    const sample = await sql(`SELECT id, username, email, role, is_active FROM "${table}" LIMIT 3`);
    console.log(`   Amostra:`, sample);   // linha 23
}
```
Não inclui senha (a query já a omite), mas imprime e-mails reais de usuários no console — mesma categoria da Regra 3, severidade baixa por ser script manual de diagnóstico.

### L12 — Token JWT parcial e username gravados no console do navegador (client-side)
**Arquivo:** `client/src/hooks/use-auth.tsx:38-46`
```ts
if (data.token) {
    localStorage.setItem("sgat-token", data.token as string);
    console.log("[auth] Token salvo no localStorage:", data.token.substring(0, 20) + "...");   // linha 40
} else {
    localStorage.removeItem("sgat-token");
    console.log("[auth] Nenhum token recebido do servidor");
}
console.log("[auth] Login bem-sucedido para:", username);   // linha 46
```
Não é "log do servidor" (Regra 3 fala em logs do servidor), mas é uma instância de `console.log` (Regra 1) que grava parte de um token de sessão e o username no console do navegador a cada login. Qualquer ferramenta de session-replay/monitoramento (Sentry, LogRocket, etc.) ou extensão de navegador que capture `console output` teria acesso a esse fragmento. Recomenda-se remover esses logs em produção (ex.: `if (import.meta.env.DEV)`).

---

## Priorização recomendada

| Prioridade | Ação | Achados | Esforço |
|---|---|---|---|
| 1 | Remover `console.log` do código de recuperação de senha | L01 | Baixo |
| 2 | Remover `detail: error` e `error.message` cru das respostas HTTP | L02, L03, L04 | Baixo |
| 3 | Adicionar error handler centralizado em `server/app.ts` | L05 | Baixo |
| 4 | Padronizar `console.error` para logar só `message`/`code` | L06 | Médio (muitos pontos, mudança repetitiva) |
| 5 | Remover e-mail/SMTP detail dos logs de `email.ts` | L07, L08 | Baixo |
| 6 | Remover corpo da resposta do log de acesso (ou aplicar allowlist de campos) | L09 | Baixo |
| 7 | Ajustar scripts operacionais e logs client-side | L10, L11, L12 | Baixo |
