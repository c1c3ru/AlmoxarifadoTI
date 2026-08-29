# Auditoria de Segurança — SGAT-TI

Esta pasta contém o script **isolado** (dependências locais, não afeta o
projeto Node/TypeScript) que gera o relatório de auditoria de segurança em
PDF, cobrindo as 5 categorias: **Isolamento**, **Permissões Frontend vs
Backend**, **IDOR**, **Chaves Expostas** e **XSS**.

## Arquivos

| Arquivo | O que é |
|---|---|
| `audit_data.py` | Fonte única de dados: stack mapeada, achados (`FINDINGS`), pontos fortes (`STRENGTHS`), recomendações e paleta de cores. Editar aqui para atualizar o conteúdo do relatório. |
| `generate_report.py` | Gera o PDF (ReportLab + Matplotlib) e o Markdown de issues a partir de `audit_data.py`. Não contém conteúdo da auditoria, só layout. |
| `requirements.txt` | Dependências isoladas (`reportlab`, `matplotlib`) — instaladas em um virtualenv local `.venv/`, nunca no ambiente global. |
| `relatorio-auditoria-seguranca.pdf` | **Saída gerada.** Capa, resumo executivo com gráficos, mapeamento de stack, tabela de achados, achados detalhados linha a linha, pontos fortes, recomendações priorizadas e anexo de issues em Markdown. |
| `issues-templates.md` | **Saída gerada.** Os mesmos templates de issue do anexo do PDF, em Markdown puro (sem quebras de linha artificiais), prontos para copiar e colar no GitHub. |

## Como (re)gerar o relatório

```bash
cd docs/security-audit
python3 -m venv .venv                      # ambiente isolado, não é commitado (.gitignore)
.venv/bin/pip install -r requirements.txt
.venv/bin/python generate_report.py
```

Saída esperada:
```
OK: PDF gerado em .../relatorio-auditoria-seguranca.pdf (XXX KB)
OK: Templates de issues (Markdown puro) em .../issues-templates.md
```

## Paleta de cores (fixa entre execuções)

Definida em `audit_data.py::PALETTE`. Reutilize os mesmos hex em toda nova
auditoria para manter identidade visual comparável ao longo do tempo:

- Severidade: Crítico `#DC2626` · Alto `#F97316` · Médio `#F59E0B` · Baixo `#3B82F6`
- Categoria: Isolamento `#7C3AED` · Permissões Frontend vs Backend `#2563EB` · IDOR `#DB2777` · Chaves Expostas `#EA580C` · XSS `#059669`
- Marca/estrutura: fundo escuro `#0F172A` · título `#1E3A8A` · destaque `#2563EB`

## Atualizando uma auditoria futura

1. Edite `audit_data.py` (novos achados em `FINDINGS`, novos pontos fortes em
   `STRENGTHS`, ajuste `RECOMMENDATIONS`). Não mude a paleta sem necessidade.
2. Rode `generate_report.py` novamente — os gráficos e a tabela são
   recalculados automaticamente a partir das listas.
3. Revise visualmente o PDF (ex.: renderizando páginas com PyMuPDF/`pdftoppm`)
   antes de considerar a auditoria concluída — `Preformatted` do ReportLab
   não reflui texto automaticamente; `generate_report.py::wrap_markdown_for_display`
   já cuida disso para o anexo de issues, mas trechos de código muito longos
   em `FINDINGS[i]["evidence"]` devem ser quebrados manualmente com `\n`.

A skill `.claudecode/skills/audit-security.md` na raiz do repositório ensina
a Claude a repetir esse processo (reconhecimento de stack → varredura →
atualização de `audit_data.py` → regeneração do PDF) sempre que solicitado.
