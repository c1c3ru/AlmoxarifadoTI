---
name: audit-security
description: Audita o repositório SGAT-TI focado em 5 categorias (Isolamento, Permissões Frontend vs Backend, IDOR, Chaves Expostas, XSS), gera/atualiza o relatório PDF em docs/security-audit/ com os mesmos gráficos, paleta de cores e estrutura, e produz templates de issues em Markdown. Use sempre que o usuário pedir uma auditoria, re-auditoria ou atualização do relatório de segurança deste projeto.
metadata:
  version: 1.0
  created: 2026-08-29
  scope: repositório c1c3ru/AlmoxarifadoTI
---

# Skill: Auditoria de Segurança do SGAT-TI

Esta skill ensina a reproduzir, de forma metodológica e consistente, a
auditoria de segurança deste repositório sempre que o usuário pedir ("audite
o projeto de novo", "atualize o relatório de segurança", "rode a auditoria",
`/audit-security`, etc.). O objetivo é que qualquer execução futura produza
um relatório **comparável** ao anterior: mesma estrutura, mesma paleta de
cores, mesmas 5 categorias, mesmo nível de rigor (arquivo:linha, nunca
achismo).

Não copie os achados deste documento para o relatório sem revalidar o
código — a skill descreve o **processo**, não congela o resultado. A cada
execução, releia o código atual: achados podem ter sido corrigidos, e novos
podem ter surgido.

## Quando usar

- Usuário pede auditoria/revisão de segurança do projeto.
- Usuário pede para "atualizar" ou "re-executar" o relatório existente após
  mudanças no código.
- Usuário menciona as 5 categorias (Isolamento, Permissões Frontend vs
  Backend, IDOR, Chaves Expostas, XSS) especificamente para este repositório.

## Visão geral do processo (não pule etapas)

1. **Reconhecimento de stack** (sempre primeiro, nunca assuma a stack de
   memória — o projeto pode ter mudado de framework/banco desde a última
   auditoria).
2. **Varredura profunda** arquivo por arquivo das 5 categorias, registrando
   achados reais E pontos fortes, cada um com arquivo:linha.
3. **Atualizar `docs/security-audit/audit_data.py`** com os achados (dados
   estruturados — nunca escreva prosa solta fora desse arquivo).
4. **Regenerar o PDF** com o script isolado existente.
5. **Verificar visualmente** o PDF gerado antes de reportar como concluído.
6. **Reportar no chat** um resumo achado-por-achado, arquivo por arquivo.
7. **Commitar e enviar** (se autorizado) as mudanças.

---

## Passo 1 — Reconhecimento de Stack

Antes de procurar qualquer vulnerabilidade, mapeie a stack ATUAL do projeto
e registre como cada uma das 5 categorias se aplica a ela. Isso evita
aplicar checklists genéricos (ex.: RLS do Supabase) a uma arquitetura que
não os usa.

Checklist mínimo de reconhecimento:

- `package.json` (ou equivalente) — frontend, backend, ORM, autenticação,
  deploy.
- Existe multi-tenancy real (organizações/clientes)? Se não, "Isolamento"
  deve ser reinterpretado (ambientes, CORS, config), não RLS multi-tenant.
- Existe um SDK cliente de banco exposto ao navegador (ex.: `@supabase/
  supabase-js` no client)? Se sim, RLS passa a ser central para IDOR/
  Isolamento. Se não (como hoje: só Express fala com o Postgres), a
  autorização inteira está nos middlewares do backend — é ali que a
  varredura de Permissões/IDOR deve se concentrar.
- Como a autenticação funciona de fato (não confie no README — leia o
  código): sessão? JWT? feature flag que liga/desliga auth?
- Existem dependências de auth "mortas" no `package.json` (ex.: passport
  instalado mas nunca importado em nenhuma rota)? Confirme com grep antes
  de descartar ou de assumir que estão ativas.

Documente essa análise na tabela `STACK` e `STACK_CATEGORY_MAPPING` de
`docs/security-audit/audit_data.py` (edite os valores existentes se a stack
mudou; não deixe informação desatualizada).

## Passo 2 — Varredura Profunda (as 5 categorias nesta stack)

Para cada categoria, a pergunta metodológica correta nesta stack (React SPA
+ Express + Drizzle/Postgres, sem RLS, sem SSR):

| Categoria | Onde procurar | Pergunta-chave |
|---|---|---|
| **Isolamento** | `server/app.ts` (CORS, Helmet/CSP), `server/auth.ts` (segredos por ambiente), qualquer estado em escopo de módulo que possa vazar entre requisições serverless | Uma configuração ausente (env var não definida) abre a aplicação inteira, ou falha fechado com segurança? |
| **Permissões Frontend vs Backend** | Cada rota em `server/routes/*.ts` vs. os guards React (`AdminRoute`, `isAdmin()`, botões condicionais) | Toda regra de UI (`isAdmin(user)`, `AdminRoute`) tem uma checagem **idêntica** no middleware da rota correspondente? Ou a UI é a única barreira? |
| **IDOR** | Rotas com `:id` que leem/alteram um recurso que tem "dono" (tipicamente `users`; **não** recursos compartilhados por design, como itens de estoque) | Existe checagem de que `req.user.sub === id` (ou role admin) antes de ler/escrever, ou qualquer ID autenticado serve? |
| **Chaves Expostas** | `scripts/*.ts` (credenciais default), `shared/*.ts` importado pelo cliente (o que o Vite bundla é público), `.env*`/`.gitignore`, fallbacks de secret no código | Algum segredo/credencial real está versionado? Algum dado que deveria ser só-backend está sendo importado por código de `client/`? |
| **XSS** | `grep -rn "dangerouslySetInnerHTML\|innerHTML\|document.write\|eval(" client/src`, templates de e-mail no servidor (`server/email.ts`) | Algum desses pontos renderiza uma string **não vinda de código estático** (ou seja, dado de usuário) sem escaping? Validação de formato (email/username) existe no **schema compartilhado** usado pelo backend, ou só no formulário React? |

Regras da varredura:

- **Nada de achismo.** Todo achado cita arquivo:linha real, lido no código
  atual (não confie em memória de auditorias anteriores).
- Sempre que uma checagem correta existir em UM lugar do código (ex.: um
  `DELETE` que verifica `role === "admin"` corretamente), procure
  ativamente se rotas **irmãs** (`GET`/`POST`/`PUT` do mesmo recurso)
  replicam a mesma regra — essa comparação é onde os achados mais
  importantes desta categoria aparecem.
- Documente também os **Pontos Fortes** — pelo menos um por categoria,
  sempre que existir. Um achado "0 problemas encontrados nesta categoria"
  só é aceitável se acompanhado de uma prática correta específica e citada
  (arquivo:linha) que explica por quê.
- Priorize encadeamentos (attack chains): um achado de severidade média
  combinado com outro pode virar um achado crítico (ex.: IDOR de escrita +
  fluxo de recuperação de senha = takeover de conta). Sempre pergunte "o
  que um atacante faz DEPOIS de explorar isto?"

## Passo 3 — Atualizar `docs/security-audit/audit_data.py`

Este arquivo é a **única fonte de dados** do relatório — nunca edite o PDF
diretamente nem duplique os achados em outro lugar.

- `FINDINGS`: lista de achados. Cada item precisa de `id` (F01, F02, ... —
  mantenha os IDs de achados que ainda existem entre auditorias, para dar
  rastreabilidade; só crie um novo ID para um achado genuinamente novo),
  `category` (exatamente um dos 5 nomes em `CATEGORY_ORDER`), `severity`
  (`Crítico`/`Alto`/`Médio`/`Baixo`, exatamente como em `SEVERITY_ORDER`),
  `title`, `files` (lista de `{path, lines}`), `description`,
  `evidence` (trecho de código real, com `\n` quebrando linhas longas
  manualmente — `Preformatted` do ReportLab não reflui texto sozinho),
  `failure_scenario` (cenário concreto de exploração) e `recommendation`.
- `STRENGTHS`: mesma ideia, para práticas corretas.
- `RECOMMENDATIONS`: lista priorizada, cada item referenciando os IDs de
  achados em `relacionado`.
- Se um achado de uma auditoria anterior foi corrigido: remova-o de
  `FINDINGS` e adicione uma nota em `STRENGTHS` citando a correção (isso
  documenta a evolução do projeto ao invés de simplesmente apagar o
  histórico). Opcionalmente, mencione no resumo do chat que o achado F0X
  foi corrigido desde a última auditoria.
- **Não altere `PALETTE`** a menos que o usuário peça explicitamente uma
  nova identidade visual — a consistência entre relatórios é o requisito.

## Passo 4 — Regenerar o PDF (script isolado)

O script já existe em `docs/security-audit/`. Nunca instale
`reportlab`/`matplotlib` globalmente — sempre use o virtualenv local:

```bash
cd docs/security-audit
python3 -m venv .venv                       # só se .venv/ ainda não existir
.venv/bin/pip install -r requirements.txt   # idempotente
.venv/bin/python generate_report.py
```

Isso gera/atualiza:
- `docs/security-audit/relatorio-auditoria-seguranca.pdf`
- `docs/security-audit/issues-templates.md`

Se `generate_report.py` precisar de uma nova seção/gráfico que não existe
hoje, edite as funções `build_*` — mas mantenha os nomes de estilo (`STY[...]`),
a paleta (`PALETTE`/`CATEGORY_COLOR`/`SEVERITY_COLOR`) e a ordem das seções
(capa → resumo executivo com gráficos → stack → tabela geral de achados →
achados detalhados → pontos fortes → recomendações → anexo de issues).

## Passo 5 — Verificar visualmente antes de reportar concluído

`Preformatted` do ReportLab não faz reflow de texto e backgrounds de
`Paragraph` não repintam corretamente quando um bloco quebra entre páginas
— os dois bugs mais prováveis de reaparecer se novos achados tiverem
`evidence`/descrições muito longas. Depois de gerar o PDF, renderize as
páginas como imagem e inspecione visualmente (não assuma que "o script
rodou sem erro" significa "o PDF está legível"):

```bash
cd docs/security-audit
.venv/bin/pip install --quiet pymupdf   # só para inspeção, não é dependência do relatório
.venv/bin/python -c "
import fitz
doc = fitz.open('relatorio-auditoria-seguranca.pdf')
for i in range(len(doc)):
    doc[i].get_pixmap(dpi=110).save(f'/tmp/preview_p{i+1}.png')
"
```

Depois leia algumas páginas de cada seção (capa, gráficos, uma tabela densa,
alguns achados detalhados, o anexo de issues) com a ferramenta de leitura de
imagens. Sinais de problema a checar: texto cortado na borda direita da
página, caixas de código sem fundo colorido, células de tabela com texto
sobreposto. Corrija `generate_report.py` (nunca o PDF) e regenere.

## Passo 6 — Reportar no chat

Sempre feche a auditoria com um resumo no chat, achado por achado, citando
arquivo:linha — mesmo que o PDF já contenha tudo em detalhe. O usuário não
deveria precisar abrir o PDF para saber o que foi encontrado. Inclua:
quantos achados por severidade, o achado mais crítico (e por quê), e quantos
pontos fortes foram documentados.

## Passo 7 — Commit

Só commite/faça push se o usuário autorizou (ou se as instruções de
execução da sessão já autorizam commits neste repositório). Inclua no
commit: `audit_data.py`, `generate_report.py` (se alterado), o PDF
regenerado e `issues-templates.md`. Nunca commite `docs/security-audit/.venv/`
nem `__pycache__/` (já ignorados em `.gitignore`).

---

## Referência rápida — Paleta de cores (fixa entre auditorias)

| Uso | Hex |
|---|---|
| Severidade Crítico | `#DC2626` |
| Severidade Alto | `#F97316` |
| Severidade Médio | `#F59E0B` |
| Severidade Baixo | `#3B82F6` |
| Categoria Isolamento | `#7C3AED` |
| Categoria Permissões Frontend vs Backend | `#2563EB` |
| Categoria IDOR | `#DB2777` |
| Categoria Chaves Expostas | `#EA580C` |
| Categoria XSS | `#059669` |
| Fundo capa / marca escura | `#0F172A` |
| Título de seção | `#1E3A8A` |
| Destaque / links | `#2563EB` |

(Fonte canônica: `docs/security-audit/audit_data.py::PALETTE` — se este
documento e o código divergirem, o código é a verdade.)

## Estrutura obrigatória do PDF (não reordenar nem remover seções)

1. Capa (fundo escuro, título, subtítulo com as 5 categorias, repositório,
   branch, data).
2. Resumo executivo — texto + gráfico de rosca (severidade) + gráfico de
   barras (categoria), nas cores acima.
3. Reconhecimento de stack (tabela de camadas + tabela de aplicação por
   categoria).
4. Tabela geral de achados (ID, severidade, categoria, arquivo:linha,
   título).
5. Achados detalhados (um bloco por achado: descrição, trecho de código,
   cenário de exploração, recomendação).
6. Pontos fortes (mesma estrutura de tabela, com evidência arquivo:linha).
7. Recomendações priorizadas (tabela com esforço/impacto).
8. Anexo — templates de issues em Markdown (labels, categoria, severidade,
   arquivos, descrição, cenário, checklist de aceite).

## Taxonomia (não inventar novas categorias/severidades)

- Categorias válidas: `Isolamento`, `Permissões Frontend vs Backend`,
  `IDOR`, `Chaves Expostas`, `XSS` — exatamente esses 5 nomes, nesta ordem,
  sempre.
- Severidades válidas: `Crítico`, `Alto`, `Médio`, `Baixo` — nesta ordem.
- Um achado pode tocar mais de uma categoria (ex.: um IDOR que também é uma
  falha de permissão) — escolha a categoria **primária** mais específica
  para fins de contagem/gráfico, e mencione a categoria secundária na
  descrição do achado.
