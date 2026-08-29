# -*- coding: utf-8 -*-
"""
Fonte única de dados da Auditoria de Segurança do SGAT-TI (Almoxarifado TI).

Este módulo NÃO contém lógica de geração de PDF/gráficos — apenas os dados
estruturados da auditoria (stack, achados, pontos fortes, recomendações e
templates de issues). O script `generate_report.py` importa este módulo e
renderiza o PDF a partir dele.

Reexecuções futuras da skill de auditoria devem atualizar este arquivo
(ou um novo `audit_data_YYYYMMDD.py`) mantendo a mesma paleta e schema de
campos, para que o relatório permaneça consistente entre execuções.
"""

from datetime import date

# ---------------------------------------------------------------------------
# METADADOS DO RELATÓRIO
# ---------------------------------------------------------------------------

REPORT_META = {
    "titulo": "Auditoria de Segurança — SGAT-TI (Sistema de Gestão de Almoxarifado de TI)",
    "subtitulo": "Isolamento · Permissões Frontend vs Backend · IDOR · Chaves Expostas · XSS",
    "repositorio": "c1c3ru/AlmoxarifadoTI",
    "data": date.today().strftime("%d/%m/%Y"),
    "branch_auditada": "claude/security-audit-pdf-report-17kdy0",
    "autor": "Auditoria assistida por IA (Claude Code) — revisão linha a linha do código-fonte",
    "escopo": (
        "Código-fonte completo do repositório (client/, server/, api/, shared/, "
        "scripts/, migrations/) na branch indicada. Não inclui teste de intrusão "
        "contra ambiente de produção ao vivo, nem varredura de dependências "
        "(SCA) de terceiros — apenas revisão estática de código."
    ),
}

# ---------------------------------------------------------------------------
# PALETA DE CORES (hexadecimal) — REUTILIZAR EM TODAS AS AUDITORIAS FUTURAS
# ---------------------------------------------------------------------------
# Esta paleta é o "padrão de cor" exigido pela skill de auditoria: deve ser
# repetida em todos os relatórios gerados por este processo para manter
# identidade visual e permitir comparação entre execuções ao longo do tempo.

PALETTE = {
    # Cores de marca / estrutura do documento
    "brand_dark": "#0F172A",     # slate-900 — capa, cabeçalhos
    "brand_primary": "#1E3A8A",  # blue-900  — títulos de seção
    "brand_accent": "#2563EB",   # blue-600  — destaques, links, linhas
    "bg_light": "#F8FAFC",       # slate-50  — fundo de blocos/tabelas
    "border_light": "#E2E8F0",   # slate-200 — bordas de tabela
    "text_body": "#111827",      # gray-900  — texto corrido
    "text_muted": "#6B7280",     # gray-500  — legendas

    # Severidade (gráfico de rosca) — do mais crítico ao menos crítico
    "sev_critico": "#DC2626",     # red-600
    "sev_alto": "#F97316",        # orange-500
    "sev_medio": "#F59E0B",       # amber-500
    "sev_baixo": "#3B82F6",       # blue-500
    "sev_info": "#94A3B8",        # slate-400

    # Categorias (gráfico de barras) — uma cor fixa por categoria
    "cat_isolamento": "#7C3AED",       # violet-600
    "cat_permissoes": "#2563EB",       # blue-600
    "cat_idor": "#DB2777",             # pink-600
    "cat_chaves": "#EA580C",           # orange-600
    "cat_xss": "#059669",              # emerald-600
}

SEVERITY_ORDER = ["Crítico", "Alto", "Médio", "Baixo"]
SEVERITY_COLOR = {
    "Crítico": PALETTE["sev_critico"],
    "Alto": PALETTE["sev_alto"],
    "Médio": PALETTE["sev_medio"],
    "Baixo": PALETTE["sev_baixo"],
}

CATEGORY_ORDER = [
    "Isolamento",
    "Permissões Frontend vs Backend",
    "IDOR",
    "Chaves Expostas",
    "XSS",
]
CATEGORY_COLOR = {
    "Isolamento": PALETTE["cat_isolamento"],
    "Permissões Frontend vs Backend": PALETTE["cat_permissoes"],
    "IDOR": PALETTE["cat_idor"],
    "Chaves Expostas": PALETTE["cat_chaves"],
    "XSS": PALETTE["cat_xss"],
}

# ---------------------------------------------------------------------------
# RECONHECIMENTO DE STACK
# ---------------------------------------------------------------------------
# Mapeamento das tecnologias reais do projeto (feito ANTES da varredura de
# vulnerabilidades) e de como cada uma das 5 categorias se aplica a elas.
# Importante: este projeto NÃO usa Flutter nem o SDK cliente do Supabase.
# É uma SPA React consumindo uma API Express própria, com Postgres
# (Neon/Supabase apenas como provedor de banco) acessado só pelo backend.

STACK = [
    {
        "camada": "Frontend",
        "tecnologias": "React 18 + Vite + TypeScript + Wouter (router) + TanStack Query + Radix UI + Tailwind",
        "observacao": (
            "SPA servida como arquivos estáticos (dist/public). Não há SSR. "
            "Autenticação guardada em localStorage (chaves sgat-user/sgat-token)."
        ),
    },
    {
        "camada": "Backend / API",
        "tecnologias": "Node.js + Express 4, empacotado com esbuild, servido via Vercel Serverless Functions (api/index.ts)",
        "observacao": (
            "Único ponto de acesso ao banco de dados — o frontend nunca fala "
            "diretamente com o Postgres/Supabase."
        ),
    },
    {
        "camada": "Banco de Dados",
        "tecnologias": "PostgreSQL (Neon serverless driver — @neondatabase/serverless) via Drizzle ORM",
        "observacao": (
            "Sem Row Level Security (RLS) — não se aplica no modelo atual, pois "
            "não há client SQL exposto ao navegador; toda a autorização é "
            "responsabilidade do código Express."
        ),
    },
    {
        "camada": "Autenticação",
        "tecnologias": "JWT (jsonwebtoken) opcional via flag ENABLE_JWT + bcryptjs para hashing",
        "observacao": (
            "Dependências de sessão (express-session, passport, passport-local, "
            "connect-pg-simple, memorystore) constam no package.json mas NÃO são "
            "utilizadas em nenhuma rota — código morto / documentação desatualizada."
        ),
    },
    {
        "camada": "Deploy",
        "tecnologias": "Vercel (vercel.json) + Replit (.replit, integração javascript_supabase)",
        "observacao": "Confirma que Neon/Supabase é usado apenas como Postgres gerenciado.",
    },
]

STACK_CATEGORY_MAPPING = [
    {
        "categoria": "Isolamento",
        "aplicacao": (
            "Não há multi-tenancy (organizações/clientes) no domínio — é um sistema "
            "de almoxarifado de uso interno único. 'Isolamento' aqui foi reinterpretado "
            "como: (1) isolamento entre origens (CORS), (2) isolamento de configuração "
            "entre ambientes dev/preview/produção (segredos e feature flags), e "
            "(3) isolamento de estado entre requisições em runtime serverless "
            "(módulo Node reaproveitado entre invocações da mesma instância)."
        ),
    },
    {
        "categoria": "Permissões Frontend vs Backend",
        "aplicacao": (
            "O frontend implementa checagens de papel (admin/tech) via "
            "AdminRoute (rotas) e isAdmin()/canManage*() (lib/auth.ts) para "
            "esconder telas e botões. A pergunta central da auditoria: cada rota "
            "de API espelha exatamente a mesma regra que o React aplica, ou a "
            "UI é a única barreira?"
        ),
    },
    {
        "categoria": "IDOR",
        "aplicacao": (
            "Quase todas as entidades (items, categories, movements) são "
            "recursos compartilhados por design — não há 'dono' individual, "
            "então acesso direto por ID não é por si só uma falha. A exceção é "
            "a entidade users, onde cada registro pertence a uma pessoa e "
            "só deveria ser alterado por ela mesma ou por um admin."
        ),
    },
    {
        "categoria": "Chaves Expostas",
        "aplicacao": (
            "Verificação de segredos hardcoded (JWT secrets, credenciais de "
            "e-mail/SMTP, connection strings), credenciais padrão em scripts "
            "operacionais, e dados sensíveis (listas de controle de acesso) "
            "que podem vazar para o bundle JavaScript público do cliente."
        ),
    },
    {
        "categoria": "XSS",
        "aplicacao": (
            "Como o frontend é 100% React/JSX, o vetor clássico é uso de "
            "dangerouslySetInnerHTML/innerHTML/document.write. Também avaliado: "
            "geração de HTML no servidor (e-mails transacionais) que interpola "
            "dados fornecidos pelo usuário sem escaping."
        ),
    },
]

# ---------------------------------------------------------------------------
# ACHADOS (FINDINGS) — um por linha de tabela no relatório
# ---------------------------------------------------------------------------
# category deve ser um dos valores em CATEGORY_ORDER
# severity deve ser um dos valores em SEVERITY_ORDER

FINDINGS = [
    {
        "id": "F01",
        "category": "Permissões Frontend vs Backend",
        "severity": "Crítico",
        "title": "Middleware de autenticação vira no-op quando ENABLE_JWT não está configurado",
        "files": [{"path": "server/auth.ts", "lines": "24-27, 50-51"}],
        "description": (
            "isAuthEnabled() só retorna true se a variável de ambiente ENABLE_JWT "
            "for exatamente 'true' ou '1'. authenticateJWT() chama isAuthEnabled() "
            "e, se for false, executa apenas `return next()` — ou seja, ignora "
            "completamente a validação do token e deixa a requisição prosseguir "
            "sem usuário autenticado. Essa variável NÃO aparece em env.example "
            "nem no README, então um deploy seguindo a documentação oficial do "
            "próprio projeto fica com autenticação inteiramente desligada por padrão."
        ),
        "evidence": (
            "export function isAuthEnabled() {\n"
            "  const enableJwtValue = process.env.ENABLE_JWT;\n"
            "  return enableJwtValue === \"true\" || enableJwtValue === \"1\";\n"
            "}\n"
            "...\n"
            "export async function authenticateJWT(req, res, next) {\n"
            "  if (!isAuthEnabled()) return next();  // <-- sem ENABLE_JWT, libera geral\n"
        ),
        "failure_scenario": (
            "Um deploy em Vercel/Replit que siga o env.example do próprio repositório "
            "não define ENABLE_JWT. Resultado: TODAS as rotas protegidas por "
            "authenticateJWT — /api/users, /api/categories, /api/items, /api/movements, "
            "/api/dashboard/* — respondem para qualquer requisição HTTP não autenticada, "
            "de qualquer origem. Um atacante anônimo lista, cria, edita e apaga dados "
            "de estoque e usuários sem nenhuma credencial."
        ),
        "recommendation": (
            "Inverter o padrão: autenticação deve ser exigida por padrão e exigir opt-out "
            "explícito (nunca opt-in). Remover a flag ENABLE_JWT ou, no mínimo, falhar o "
            "boot do servidor em produção se ela não estiver definida como true (mesmo "
            "padrão já aplicado à validação de JWT_SECRET no mesmo arquivo)."
        ),
    },
    {
        "id": "F02",
        "category": "IDOR",
        "severity": "Crítico",
        "title": "PUT /api/users/:id permite qualquer usuário autenticado alterar senha/e-mail/papel de QUALQUER outro usuário",
        "files": [{"path": "server/routes/users.ts", "lines": "9, 21, 48-102"}],
        "description": (
            "As rotas GET / (listar todos os usuários), POST / (criar usuário) e "
            "PUT /:id (atualizar usuário por ID arbitrário) usam apenas o middleware "
            "authenticateJWT — nenhuma delas verifica req.user.role. O :id na URL é "
            "uma referência direta a objeto (IDOR clássico): o corpo de PUT aceita "
            "os mesmos campos de insertUserSchema, incluindo password, email e role. "
            "A checagem de matrícula para role admin (linhas 60-81) só é executada "
            "SE updateData.role ou updateData.matricula estiverem presentes no corpo — "
            "um ataque que só troca a senha (sem tocar em role/matricula) não passa "
            "por nenhuma validação de autorização. Apenas o DELETE /:id (linha 111) "
            "verifica corretamente `currentUser.role !== 'admin'`."
        ),
        "evidence": (
            "router.put(\"/:id\", authenticateJWT, async (req, res) => {\n"
            "  const { id } = req.params;\n"
            "  const validation = baseInsertUserSchema.partial().safeParse(req.body);\n"
            "  ...\n"
            "  const user = await storage.updateUser(id, updateData); // sem checar role/dono\n"
        ),
        "failure_scenario": (
            "Um usuário 'tech' autentica normalmente, obtém seu próprio JWT válido e "
            "chama `PUT /api/users/<id-de-um-admin>` com body `{\"password\":\"invadido123\"}`. "
            "Como role/matricula não mudam, a checagem de allowlist é pulada, "
            "storage.updateUser hasheia a nova senha e grava — o atacante agora loga "
            "como aquele administrador. O mesmo endpoint também permite ler (GET /) "
            "e-mail, matrícula e papel de todos os usuários do sistema."
        ),
        "recommendation": (
            "Exigir role === 'admin' em GET /, POST / e PUT /:id, OU permitir que um "
            "usuário comum edite apenas o próprio registro (id === req.user.sub) e "
            "somente campos não sensíveis (nunca role). Aplicar o mesmo padrão já "
            "usado corretamente em DELETE /:id."
        ),
    },
    {
        "id": "F03",
        "category": "IDOR",
        "severity": "Crítico",
        "title": "Cadeia de exploração: IDOR em PUT /api/users/:id + recuperação de senha = takeover completo de conta (inclusive admin)",
        "files": [
            {"path": "server/routes/users.ts", "lines": "48-102"},
            {"path": "server/routes/auth.ts", "lines": "20-50"},
        ],
        "description": (
            "Combinando F02 com o fluxo de recuperação de senha: o atacante chama "
            "PUT /api/users/<id-vítima> alterando apenas o campo `email` para um "
            "endereço que ele controla (essa troca também escapa da checagem de "
            "matrícula, pois não altera role nem matricula). Em seguida chama "
            "POST /api/password-recovery com o username da vítima — o código de "
            "6 dígitos é enviado para o e-mail que o próprio atacante acabou de "
            "configurar. Com o código em mãos, chama POST /api/password-reset e "
            "define uma nova senha para a conta da vítima."
        ),
        "evidence": (
            "// passo 1\n"
            "PUT /api/users/<vitima-id>  { \"email\": \"atacante@evil.com\" }\n"
            "// passo 2\n"
            "POST /api/password-recovery { \"usernameOrEmail\": \"<username-vitima>\" }\n"
            "// passo 3 — código chega no inbox do atacante\n"
            "POST /api/password-reset { \"usernameOrEmail\": ..., \"code\": ..., \"newPassword\": \"nova\" }"
        ),
        "failure_scenario": (
            "Qualquer conta 'tech' recém-registrada (o autorregistro é público — "
            "POST /api/register) consegue assumir o controle de QUALQUER conta "
            "'admin' existente sem nunca ter tido acesso ao e-mail ou senha "
            "originais da vítima — resultado final é escalonamento de privilégio "
            "completo a partir de uma conta de menor privilégio."
        ),
        "recommendation": (
            "Corrigir F02 elimina esta cadeia. Adicionalmente: exigir reautenticação "
            "(senha atual) para qualquer alteração do próprio e-mail, e notificar o "
            "e-mail ANTIGO sempre que o e-mail de uma conta for alterado."
        ),
    },
    {
        "id": "F04",
        "category": "Permissões Frontend vs Backend",
        "severity": "Alto",
        "title": "CRUD de categorias sem checagem de papel no backend, apesar de restrito a admin no frontend",
        "files": [{"path": "server/routes/inventory.ts", "lines": "37, 51, 67"}],
        "description": (
            "POST /categories, PUT /categories/:id e DELETE /categories/:id usam "
            "apenas authenticateJWT. No React, a página /categories só é alcançável "
            "por quem passa pelo componente AdminRoute (client/src/App.tsx:120-126), "
            "criando uma falsa sensação de que a função é exclusiva de administradores."
        ),
        "evidence": (
            "router.post(\"/categories\", authenticateJWT, async (req, res) => { ... }\n"
            "router.put(\"/categories/:id\", authenticateJWT, async (req, res) => { ... }\n"
            "router.delete(\"/categories/:id\", authenticateJWT, async (req, res) => { ... }"
        ),
        "failure_scenario": (
            "Um usuário 'tech' (que nunca vê o link 'Categorias' no menu) pode, "
            "mesmo assim, chamar `DELETE /api/categories/<id>` diretamente via "
            "fetch/curl usando o próprio token válido e apagar uma categoria "
            "inteira — afetando todos os itens vinculados a ela."
        ),
        "recommendation": (
            "Criar um middleware requireAdmin reutilizável e aplicá-lo em todas as "
            "rotas mutáveis de /categories (POST, PUT, DELETE), replicando a mesma "
            "regra que o frontend já impõe visualmente."
        ),
    },
    {
        "id": "F05",
        "category": "Isolamento",
        "severity": "Alto",
        "title": "CORS permite qualquer origem quando ALLOWED_ORIGINS não está configurado, combinado com credentials: true",
        "files": [{"path": "server/app.ts", "lines": "54-64"}],
        "description": (
            "allowedOrigins é derivado de process.env.ALLOWED_ORIGINS (CSV). Se a "
            "variável não estiver definida, allowedOrigins.length === 0 e a função "
            "de callback do CORS considera `isAllowed = true` para QUALQUER origin, "
            "com `credentials: true`. Assim como ENABLE_JWT, ALLOWED_ORIGINS não é "
            "mencionada no README nem no exemplo mínimo de variáveis de ambiente, "
            "apenas em env.example — que não é o mesmo arquivo consultado no README."
        ),
        "evidence": (
            "const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',')...\n"
            "app.use(cors({\n"
            "  origin: (origin, callback) => {\n"
            "    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);\n"
            "    return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);\n"
            "  },\n"
            "  credentials: true,\n"
        ),
        "failure_scenario": (
            "Sem ALLOWED_ORIGINS definido em produção, um site malicioso hospedado "
            "em qualquer domínio pode fazer requisições cross-origin para a API e "
            "ler as respostas JSON (o header Access-Control-Allow-Origin reflete a "
            "origem do atacante). Combinado com F01 (auth desligada por padrão), "
            "isso permite exfiltração silenciosa de dados a partir do navegador de "
            "qualquer visitante de uma página maliciosa."
        ),
        "recommendation": (
            "Trocar o padrão para 'negar por padrão': se ALLOWED_ORIGINS estiver "
            "vazio, bloquear (isAllowed = false), exceto explicitamente em "
            "NODE_ENV === 'development'. Documentar a variável como obrigatória "
            "no README e no env.example."
        ),
    },
    {
        "id": "F06",
        "category": "Chaves Expostas",
        "severity": "Médio",
        "title": "Credencial administrativa hardcoded (admin/admin123) em script de restauração",
        "files": [{"path": "scripts/restore-admin.ts", "lines": "27, 32-42"}],
        "description": (
            "O script cria automaticamente um usuário admin com username 'admin' e "
            "senha literal 'admin123' sempre que a tabela users estiver vazia (ex.: "
            "banco recém-provisionado ou restaurado). A senha em texto puro está "
            "versionada no repositório e também é impressa no console em texto claro."
        ),
        "evidence": (
            "const hashedPassword = await bcrypt.hash(\"admin123\", 10);\n"
            "...VALUES ('admin', hashedPassword, 'Administrador', "
            "'admin@almoxarifado.local', '2329311', 'admin', true)\n"
            "console.log(`   Password: admin123`);"
        ),
        "failure_scenario": (
            "Se o script for executado contra um banco de produção recém-criado "
            "(cenário exatamente descrito no próprio script, para 'restaurar' o "
            "admin), qualquer pessoa que conheça esse padrão amplamente documentado "
            "(admin/admin123) consegue logar como administrador antes que a senha "
            "seja trocada — e nada no fluxo força essa troca imediata."
        ),
        "recommendation": (
            "Gerar uma senha aleatória forte a cada execução e imprimi-la uma única "
            "vez (nunca hardcoded), ou exigir troca de senha obrigatória no primeiro "
            "login (flag must_change_password)."
        ),
    },
    {
        "id": "F07",
        "category": "Chaves Expostas",
        "severity": "Médio",
        "title": "Lista de matrículas autorizadas a virar admin é enviada ao bundle JavaScript público do cliente",
        "files": [
            {"path": "shared/allowed-admins.ts", "lines": "1-16"},
            {"path": "client/src/pages/users.tsx", "lines": "22, 35"},
            {"path": "client/src/pages/register.tsx", "lines": "57"},
        ],
        "description": (
            "ALLOWED_ADMIN_MATRICULAS (~140 matrículas reais de funcionários) vive "
            "em shared/, importado tanto pelo servidor (shared/schema.ts) quanto "
            "diretamente por páginas do cliente (users.tsx, register.tsx) para "
            "validação de formulário. Como o Vite empacota tudo que é importado "
            "pelo cliente, essa lista completa é embutida no arquivo JS público "
            "servido a QUALQUER visitante da tela de login/registro, autenticado "
            "ou não."
        ),
        "evidence": (
            "// client/src/pages/users.tsx\n"
            "import { ALLOWED_ADMIN_MATRICULAS } from \"../../../shared/allowed-admins\";\n"
            "...\n"
            "if (val.role === \"admin\" && !ALLOWED_ADMIN_MATRICULAS.includes(val.matricula)) {"
        ),
        "failure_scenario": (
            "Qualquer pessoa abre as ferramentas de desenvolvedor do navegador na "
            "tela pública de login, procura pelo bundle e extrai a lista completa "
            "de ~140 matrículas de funcionários elegíveis a administrador — dado "
            "interno/PII que não deveria ser público, e que também ajuda um "
            "atacante a priorizar quais contas 'tech' valeria mais a pena "
            "comprometer (via F02/F03) para depois se autopromover a admin."
        ),
        "recommendation": (
            "Mover a validação de matrícula-admin inteiramente para o backend "
            "(ela já existe lá, em shared/schema.ts) e no cliente validar apenas "
            "o formato do campo, sem embutir a lista real — o backend responde "
            "com erro 400 do mesmo jeito se a matrícula não for permitida."
        ),
    },
    {
        "id": "F08",
        "category": "XSS",
        "severity": "Médio",
        "title": "HTML Injection no e-mail de recuperação de senha por falta de validação/escape server-side",
        "files": [
            {"path": "server/email.ts", "lines": "63, 67"},
            {"path": "shared/schema.ts", "lines": "74-98"},
        ],
        "description": (
            "sendPasswordResetEmail interpola `username` diretamente dentro de uma "
            "string HTML (`<strong>${username}</strong>`) sem qualquer escaping. "
            "O formato de e-mail só é validado no cliente (zod .email() em "
            "register.tsx) — no schema compartilhado usado pelo backend "
            "(baseInsertUserSchema, derivado de createInsertSchema(users)), os "
            "campos username/email/name são texto livre, sem refinamento de "
            "formato. Uma chamada direta a POST /api/register (fora do navegador) "
            "pode gravar HTML/JS arbitrário nesses campos."
        ),
        "evidence": (
            "// server/email.ts\n"
            "html: `... <p>Olá <strong>${username}</strong>,</p> ...`\n"
            "// shared/schema.ts — nenhum .email()/.regex() aplicado a username/email/name\n"
            "export const baseInsertUserSchema =\n"
            "  createInsertSchema(users).omit({ id: true, createdAt: true });"
        ),
        "failure_scenario": (
            "Um atacante chama POST /api/register com "
            "`username: \"<img src=x onerror=alert(document.domain)>\"`. O valor é "
            "gravado sem sanitização. Ao disparar /api/password-recovery para essa "
            "conta, o payload HTML é entregue sem escaping dentro do e-mail — "
            "clientes de e-mail que renderizam HTML (a maioria) executam o "
            "markup malicioso no contexto de quem abre a mensagem. Combinado com "
            "F02/F03, o campo e-mail de destino também pode ser redirecionado."
        ),
        "recommendation": (
            "Escapar entidades HTML antes de interpolar qualquer valor fornecido "
            "pelo usuário em templates de e-mail (ex.: um helper escapeHtml()), e "
            "adicionar .email() e um regex de caracteres seguros para username/name "
            "diretamente no schema Zod compartilhado (shared/schema.ts), não só no "
            "formulário do React."
        ),
    },
    {
        "id": "F09",
        "category": "Isolamento",
        "severity": "Baixo",
        "title": "Fallback fraco de JWT_SECRET fora de NODE_ENV=production",
        "files": [{"path": "server/auth.ts", "lines": "6-20"}],
        "description": (
            "O valor padrão \"change-me-in-prod\" só é bloqueado quando "
            "`process.env.NODE_ENV === \"production\"` exatamente. Ambientes de "
            "preview/staging que não definam NODE_ENV=production (ex.: preview "
            "deployments customizados, execução local com NODE_ENV=staging) "
            "assinam e validam tokens usando um segredo público e previsível, "
            "presente no próprio código-fonte do repositório."
        ),
        "evidence": (
            "const JWT_SECRET_RAW = process.env.JWT_SECRET || \"change-me-in-prod\";\n"
            "if (process.env.NODE_ENV === \"production\") { /* só aqui valida */ }"
        ),
        "failure_scenario": (
            "Em qualquer ambiente onde NODE_ENV não seja literalmente 'production' "
            "mas ENABLE_JWT esteja ligado, um atacante que descubra essa string no "
            "código público do repositório consegue forjar tokens JWT válidos com "
            "qualquer role/sub, incluindo 'admin'."
        ),
        "recommendation": (
            "Nunca usar um valor default versionado para segredos — falhar o boot "
            "sempre que JWT_SECRET não estiver definido, independentemente do "
            "valor de NODE_ENV."
        ),
    },
    {
        "id": "F10",
        "category": "XSS",
        "severity": "Baixo",
        "title": "Uso de document.write + innerHTML para montar janela de impressão térmica",
        "files": [{"path": "client/src/components/thermal-qr-printer.tsx", "lines": "68-144"}],
        "description": (
            "ThermalQRPrinter constrói uma nova janela via window.open() e grava "
            "seu documento inteiro com document.write(`...${clonedContent.innerHTML}...`), "
            "misturando HTML estático com valores de configuração numéricos "
            "(config.size, config.margin, config.codesPerRow) diretamente em "
            "atributos de estilo. Hoje esses valores só vêm de <input type='number'> "
            "com min/max, e clonedContent.innerHTML é uma cópia de nós já "
            "escapados pelo React (contém apenas item.internalCode, gerado pelo "
            "servidor no formato AAAA-NNNN) — por isso o risco atual é baixo — mas "
            "o padrão em si (concatenar strings em document.write) é frágil e some "
            "com as garantias de escaping do React caso o componente passe a "
            "exibir campos de texto livre no futuro (ex.: nome do item, observação)."
        ),
        "evidence": (
            "printWindow.document.write(`\n"
            "  ... size: ${config.size * 0.264583}mm ...\n"
            "  <body>${clonedContent.innerHTML}</body>\n"
            "`);"
        ),
        "failure_scenario": (
            "Caso um campo de texto livre (ex.: item.name ou item.location) seja "
            "adicionado a este template no futuro sem passar por escaping manual, "
            "reabre-se um vetor de XSS armazenado dentro da janela de impressão."
        ),
        "recommendation": (
            "Substituir document.write por manipulação segura do DOM da nova janela "
            "(createElement/textContent) ou por um <iframe sandbox> renderizado via "
            "React, evitando concatenação manual de HTML mesmo para dados hoje "
            "considerados seguros."
        ),
    },
]

# ---------------------------------------------------------------------------
# PONTOS FORTES (o que está correto/protegido)
# ---------------------------------------------------------------------------

STRENGTHS = [
    {
        "category": "IDOR",
        "title": "IDs de todas as entidades são UUIDv4 aleatórios, não sequenciais",
        "files": [{"path": "shared/schema.ts", "lines": "8, 23, 31, 48, 61"}],
        "description": (
            "Todas as tabelas usam `uuid(\"id\").primaryKey().default(sql`gen_random_uuid()`)`. "
            "Isso impede enumeração cega por IDOR (ex.: tentar /api/items/1, /2, /3...) "
            "mesmo nos poucos pontos onde a autorização por si só é fraca — reduz a "
            "superfície de ataque prática, embora não substitua checagem de autorização."
        ),
    },
    {
        "category": "Permissões Frontend vs Backend",
        "title": "DELETE /api/users/:id replica corretamente a regra de admin do frontend",
        "files": [{"path": "server/routes/users.ts", "lines": "105-137"}],
        "description": (
            "Ao contrário de GET/POST/PUT no mesmo arquivo, o DELETE verifica "
            "explicitamente `if (currentUser.role !== \"admin\") return 403` e ainda "
            "impede autoexclusão (`currentUser.sub === id`). É o padrão correto e "
            "deveria ser copiado para as demais rotas de usuários e categorias (ver F02/F04)."
        ),
    },
    {
        "category": "Permissões Frontend vs Backend",
        "title": "Cálculo de estoque (entrada/saída) é sempre recomputado no servidor, nunca confia no cliente",
        "files": [{"path": "server/storage.ts", "lines": "499-538"}],
        "description": (
            "createMovement busca o estoque atual do item no banco, calcula "
            "previousStock/newStock no servidor e rejeita a operação se o resultado "
            "for negativo — o cliente não pode manipular esses valores mesmo "
            "interceptando e alterando a requisição."
        ),
    },
    {
        "category": "Chaves Expostas",
        "title": "Nenhum segredo real (chave de API, token, connection string) foi encontrado hardcoded",
        "files": [{"path": ".gitignore", "lines": "1-8"}],
        "description": (
            ".env, .env.* e .vercel estão corretamente listados no .gitignore. "
            "env.example contém apenas placeholders. JWT_SECRET tem validação de "
            "comprimento mínimo (32 caracteres) e recusa explicitamente o valor "
            "padrão em produção (server/auth.ts:8-19) — boa prática apesar da "
            "lacuna de ambiente descrita em F09."
        ),
    },
    {
        "category": "XSS",
        "title": "Uso sistemático de JSX/React sem renderização de HTML bruto de dados de usuário",
        "files": [{"path": "client/src", "lines": "toda a árvore de pages/ e components/"}],
        "description": (
            "Uma varredura completa por dangerouslySetInnerHTML/innerHTML/"
            "document.write/eval em todo client/src retornou apenas 3 ocorrências "
            "em toda a base (chart.tsx, thermal-qr-printer.tsx) — nenhuma renderiza "
            "diretamente texto de usuário (nome de item, observação, nome de "
            "usuário) como HTML. Todo o restante da aplicação (dezenas de "
            "componentes e páginas) usa interpolação JSX padrão, que escapa "
            "automaticamente. Isso é uma defesa sistêmica forte contra XSS refletido/armazenado."
        ),
    },
    {
        "category": "Isolamento",
        "title": "Nenhum SDK cliente do Supabase/Postgres é exposto ao navegador",
        "files": [{"path": "package.json", "lines": "13-91 (dependencies)"}],
        "description": (
            "Diferente de arquiteturas Supabase-nativas (client + RLS), aqui o "
            "banco de dados só é acessível através do backend Express — não há "
            "anon key nem client SQL no bundle do navegador. Isso elimina uma "
            "classe inteira de bypass de RLS a partir do cliente, concentrando (e "
            "simplificando a auditoria de) toda a superfície de autorização nos "
            "middlewares Express — exatamente onde F01/F02/F04 foram encontrados."
        ),
    },
    {
        "category": "Isolamento",
        "title": "Cabeçalhos de segurança (Helmet/CSP) configurados de forma restritiva",
        "files": [{"path": "server/app.ts", "lines": "28-51"}],
        "description": (
            "object-src 'none', frame-ancestors 'self', frameguard sameorigin e "
            "referrer-policy no-referrer estão configurados — mitigação em "
            "profundidade que reduz o impacto mesmo se um XSS pontual ocorrer. "
            "O próprio comentário do código já sinaliza o próximo passo correto "
            "('migrar para nonces/hashes e remover unsafe-inline')."
        ),
    },
    {
        "category": "Chaves Expostas",
        "title": "Rate limiting aplicado a login e importação em massa",
        "files": [{"path": "server/routes/auth.ts", "lines": "13-17"}, {"path": "server/routes/inventory.ts", "lines": "10-14"}],
        "description": (
            "express-rate-limit está configurado para login (10 tentativas / 15 "
            "min) e importação CSV (20 / 5 min), reduzindo a viabilidade de força "
            "bruta de credenciais mesmo que uma senha fraca (ex.: F06) esteja em uso."
        ),
    },
]

# ---------------------------------------------------------------------------
# RECOMENDAÇÕES PRIORIZADAS
# ---------------------------------------------------------------------------

RECOMMENDATIONS = [
    {
        "prioridade": 1,
        "titulo": "Tornar autenticação obrigatória por padrão (remover/inverter ENABLE_JWT)",
        "relacionado": ["F01"],
        "esforco": "Baixo",
        "impacto": "Crítico",
    },
    {
        "prioridade": 2,
        "titulo": "Adicionar checagem de role='admin' em GET/POST/PUT /api/users e em /api/categories",
        "relacionado": ["F02", "F03", "F04"],
        "esforco": "Baixo",
        "impacto": "Crítico",
    },
    {
        "prioridade": 3,
        "titulo": "Negar CORS por padrão quando ALLOWED_ORIGINS não estiver configurado",
        "relacionado": ["F05"],
        "esforco": "Baixo",
        "impacto": "Alto",
    },
    {
        "prioridade": 4,
        "titulo": "Exigir senha atual para alteração de e-mail + notificar e-mail antigo",
        "relacionado": ["F03"],
        "esforco": "Médio",
        "impacto": "Alto",
    },
    {
        "prioridade": 5,
        "titulo": "Remover a lista de matrículas admin do bundle do cliente; validar só no backend",
        "relacionado": ["F07"],
        "esforco": "Baixo",
        "impacto": "Médio",
    },
    {
        "prioridade": 6,
        "titulo": "Escapar HTML em templates de e-mail + validar formato de email/username no schema Zod compartilhado",
        "relacionado": ["F08"],
        "esforco": "Baixo",
        "impacto": "Médio",
    },
    {
        "prioridade": 7,
        "titulo": "Gerar senha aleatória (não hardcoded) em scripts/restore-admin.ts",
        "relacionado": ["F06"],
        "esforco": "Baixo",
        "impacto": "Médio",
    },
    {
        "prioridade": 8,
        "titulo": "Falhar o boot se JWT_SECRET não estiver definido, independente de NODE_ENV",
        "relacionado": ["F09"],
        "esforco": "Baixo",
        "impacto": "Baixo",
    },
    {
        "prioridade": 9,
        "titulo": "Substituir document.write/innerHTML por DOM API segura na impressão térmica",
        "relacionado": ["F10"],
        "esforco": "Médio",
        "impacto": "Baixo",
    },
]

# ---------------------------------------------------------------------------
# TEMPLATES DE ISSUES (Markdown) — anexo pronto para copiar ao GitHub
# ---------------------------------------------------------------------------

def _issue_template(finding):
    sev = finding["severity"]
    files_md = "\n".join(f"- `{f['path']}` (linhas {f['lines']})" for f in finding["files"])
    labels = {
        "Crítico": "security, critical, bug",
        "Alto": "security, high-priority, bug",
        "Médio": "security, bug",
        "Baixo": "security, tech-debt",
    }[sev]
    return f"""### [SECURITY][{sev.upper()}] {finding['title']}

**Labels:** `{labels}`
**Categoria:** {finding['category']}
**Severidade:** {sev}
**ID do achado:** {finding['id']}

**Arquivos afetados:**
{files_md}

**Descrição / Impacto:**
{finding['description']}

**Cenário de exploração (evidência):**
```
{finding['failure_scenario']}
```

**Trecho de código relevante:**
```ts
{finding['evidence']}
```

**Correção recomendada:**
{finding['recommendation']}

**Checklist de aceite:**
- [ ] Correção implementada em `{finding['files'][0]['path']}`
- [ ] Teste automatizado ou manual cobrindo o cenário de exploração acima
- [ ] Revisão de código por outra pessoa (não o autor da correção)
- [ ] Validado em ambiente de staging antes do deploy em produção
- [ ] Achado {finding['id']} marcado como resolvido neste relatório na próxima auditoria
"""


def build_issue_templates():
    # Apenas achados Crítico/Alto/Médio viram templates de issue (Baixo vira tech-debt opcional)
    return [_issue_template(f) for f in FINDINGS if f["severity"] in ("Crítico", "Alto", "Médio")]


ISSUE_TEMPLATES_MD = build_issue_templates()
