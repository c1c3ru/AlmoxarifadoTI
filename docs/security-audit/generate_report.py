#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do PDF de Auditoria de Segurança do SGAT-TI.

Uso:
    cd docs/security-audit
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
    .venv/bin/python generate_report.py

Saída:
    docs/security-audit/relatorio-auditoria-seguranca.pdf

Este script é isolado (não usa nenhuma dependência global do projeto Node/
TypeScript) e depende apenas de reportlab + matplotlib, instaladas em um
virtualenv local (.venv, ignorado pelo git). Os dados auditados vivem em
audit_data.py — este arquivo cuida apenas de layout/render.
"""

import os
import sys
import tempfile
import textwrap

import matplotlib
matplotlib.use("Agg")  # renderização sem display, necessário em CI/servidor
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, NextPageTemplate,
    Paragraph, Spacer, Table, TableStyle, Image, PageBreak,
    KeepTogether, HRFlowable, Preformatted,
)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audit_data import (
    REPORT_META, PALETTE, SEVERITY_ORDER, SEVERITY_COLOR,
    CATEGORY_ORDER, CATEGORY_COLOR, STACK, STACK_CATEGORY_MAPPING,
    FINDINGS, STRENGTHS, RECOMMENDATIONS, ISSUE_TEMPLATES_MD,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PDF = os.path.join(HERE, "relatorio-auditoria-seguranca.pdf")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

C = {k: colors.HexColor(v) for k, v in PALETTE.items()}


# ---------------------------------------------------------------------------
# GRÁFICOS (matplotlib) — salvos como PNG temporários e embutidos no PDF
# ---------------------------------------------------------------------------

def make_severity_donut(tmpdir):
    counts = [sum(1 for f in FINDINGS if f["severity"] == s) for s in SEVERITY_ORDER]
    colors_hex = [SEVERITY_COLOR[s] for s in SEVERITY_ORDER]
    labels = [f"{s} ({c})" for s, c in zip(SEVERITY_ORDER, counts)]

    fig, ax = plt.subplots(figsize=(4.6, 4.2), dpi=200)
    nonzero = [(l, c, col) for l, c, col in zip(labels, counts, colors_hex) if c > 0]
    wedges, _ = ax.pie(
        [c for _, c, _ in nonzero],
        colors=[col for _, _, col in nonzero],
        startangle=90,
        counterclock=False,
        wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2),
    )
    ax.text(0, 0.06, str(sum(counts)), ha="center", va="center",
            fontsize=26, fontweight="bold", color=PALETTE["text_body"])
    ax.text(0, -0.18, "achados", ha="center", va="center",
            fontsize=10, color=PALETTE["text_muted"])
    ax.legend(
        wedges, [l for l, _, _ in nonzero],
        loc="upper center", bbox_to_anchor=(0.5, -0.02),
        ncol=2, frameon=False, fontsize=9.5,
    )
    ax.set_aspect("equal")
    fig.tight_layout()
    path = os.path.join(tmpdir, "severity_donut.png")
    fig.savefig(path, transparent=True, bbox_inches="tight")
    plt.close(fig)
    return path


def make_category_bar(tmpdir):
    counts = [sum(1 for f in FINDINGS if f["category"] == c) for c in CATEGORY_ORDER]
    colors_hex = [CATEGORY_COLOR[c] for c in CATEGORY_ORDER]
    short_labels = [
        "Isolamento",
        "Permissões\nFrontend x Backend",
        "IDOR",
        "Chaves\nExpostas",
        "XSS",
    ]

    fig, ax = plt.subplots(figsize=(6.4, 4.2), dpi=200)
    bars = ax.bar(short_labels, counts, color=colors_hex, width=0.6, zorder=3)
    for rect, val in zip(bars, counts):
        ax.text(rect.get_x() + rect.get_width() / 2, rect.get_height() + 0.05,
                str(val), ha="center", va="bottom", fontsize=11, fontweight="bold",
                color=PALETTE["text_body"])

    ax.set_ylim(0, max(counts) + 1.2)
    ax.set_yticks(range(0, max(counts) + 2))
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(PALETTE["border_light"])
    ax.spines["bottom"].set_color(PALETTE["border_light"])
    ax.tick_params(axis="x", labelsize=8.8, colors=PALETTE["text_body"])
    ax.tick_params(axis="y", labelsize=9, colors=PALETTE["text_muted"])
    ax.yaxis.grid(True, color=PALETTE["border_light"], linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    fig.tight_layout()
    path = os.path.join(tmpdir, "category_bar.png")
    fig.savefig(path, transparent=True, bbox_inches="tight")
    plt.close(fig)
    return path


# ---------------------------------------------------------------------------
# ESTILOS
# ---------------------------------------------------------------------------

def build_styles():
    ss = getSampleStyleSheet()
    styles = {}
    styles["CoverTitle"] = ParagraphStyle(
        "CoverTitle", parent=ss["Title"], fontName="Helvetica-Bold",
        fontSize=27, leading=33, textColor=colors.white, alignment=TA_LEFT,
    )
    styles["CoverSubtitle"] = ParagraphStyle(
        "CoverSubtitle", parent=ss["Normal"], fontName="Helvetica",
        fontSize=13, leading=18, textColor=colors.HexColor("#CBD5E1"), alignment=TA_LEFT,
    )
    styles["CoverMeta"] = ParagraphStyle(
        "CoverMeta", parent=ss["Normal"], fontName="Helvetica",
        fontSize=10, leading=15, textColor=colors.HexColor("#94A3B8"), alignment=TA_LEFT,
    )
    styles["H1"] = ParagraphStyle(
        "H1", parent=ss["Heading1"], fontName="Helvetica-Bold", fontSize=17,
        leading=21, textColor=C["brand_primary"], spaceBefore=4, spaceAfter=10,
    )
    styles["H2"] = ParagraphStyle(
        "H2", parent=ss["Heading2"], fontName="Helvetica-Bold", fontSize=12.5,
        leading=16, textColor=C["brand_dark"], spaceBefore=12, spaceAfter=6,
    )
    styles["Body"] = ParagraphStyle(
        "Body", parent=ss["Normal"], fontName="Helvetica", fontSize=9.6,
        leading=13.6, textColor=colors.HexColor(PALETTE["text_body"]), alignment=TA_LEFT,
        spaceAfter=6,
    )
    styles["BodySmall"] = ParagraphStyle(
        "BodySmall", parent=styles["Body"], fontSize=8.7, leading=12.2,
        textColor=colors.HexColor(PALETTE["text_muted"]),
    )
    styles["Label"] = ParagraphStyle(
        "Label", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=8.6,
        leading=11, textColor=colors.HexColor(PALETTE["text_muted"]),
    )
    styles["Mono"] = ParagraphStyle(
        "Mono", parent=ss["Code"], fontName="Courier", fontSize=7.6, leading=10.4,
        textColor=colors.HexColor("#1E293B"),
    )
    # Sem backColor no próprio estilo: o fundo escuro é pintado por uma Table
    # (ver code_block()), não pelo ParagraphStyle — Preformatted.backColor não
    # repinta corretamente quando o bloco é dividido entre páginas; Table sim.
    styles["MonoOnDark"] = ParagraphStyle(
        "MonoOnDark", parent=styles["Mono"], textColor=colors.HexColor("#E2E8F0"),
    )
    styles["EvidenceTiny"] = ParagraphStyle(
        "EvidenceTiny", parent=styles["BodySmall"], fontSize=7.3, leading=9.6,
    )
    styles["FindingTitle"] = ParagraphStyle(
        "FindingTitle", parent=ss["Heading3"], fontName="Helvetica-Bold", fontSize=10.6,
        leading=13.5, textColor=colors.white, spaceBefore=0, spaceAfter=0,
    )
    styles["TOC"] = ParagraphStyle(
        "TOC", parent=ss["Normal"], fontName="Helvetica", fontSize=10.5, leading=20,
        textColor=colors.HexColor(PALETTE["text_body"]),
    )
    return styles


STY = build_styles()


def esc(text):
    """Escapa &, < e > para uso seguro dentro de reportlab Paragraph (mini-HTML).
    Necessário porque vários campos de audit_data.py citam literalmente
    trechos de código/URLs/payloads com < > (ex.: `/api/users/<id>`,
    `<img src=x onerror=...>`), que o parser de Paragraph tentaria interpretar
    como tags reais. Não deve ser usado em texto destinado a Preformatted."""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def sev_badge(sev):
    color = SEVERITY_COLOR[sev]
    t = Table([[sev]], colWidths=[20 * mm], rowHeights=[5.6 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(color)),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return t


def code_block(text):
    pre = Preformatted(text, STY["MonoOnDark"])
    t = Table([[pre]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def files_str(files):
    return esc("  |  ".join(f"{f['path']}:{f['lines']}" for f in files))


def files_str_br(files):
    """Versão multilinha (uma referência por linha) para colunas estreitas de tabela."""
    return "<br/>".join(esc(f"{f['path']}:{f['lines']}") for f in files)


def wrap_markdown_for_display(md, width=92):
    """Quebra linhas de prosa longas para exibição em Preformatted (que não
    reflui texto). Preserva blocos de código (```) e linhas curtas (títulos,
    listas, checklist) intactos — usado só para o PDF; o arquivo
    issues-templates.md mantém o Markdown original sem quebras artificiais,
    para copiar/colar sem alterações."""
    out_lines = []
    in_fence = False
    fence_is_code = False
    for line in md.split("\n"):
        stripped = line.strip()
        if stripped.startswith("```"):
            if not in_fence:
                in_fence = True
                # ``` sozinho (cenário/evidência textual) é prosa e pode quebrar;
                # ```ts (trecho de código real) fica verbatim.
                fence_is_code = len(stripped) > 3
            else:
                in_fence = False
            out_lines.append(line)
            continue
        if (in_fence and fence_is_code) or len(line) <= width:
            out_lines.append(line)
        else:
            out_lines.extend(textwrap.wrap(line, width=width, break_long_words=False,
                                            break_on_hyphens=False) or [""])
    return "\n".join(out_lines)


# ---------------------------------------------------------------------------
# PAGE TEMPLATES (capa + páginas de conteúdo)
# ---------------------------------------------------------------------------

def draw_cover_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor(PALETTE["brand_dark"]))
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor(PALETTE["brand_accent"]))
    canvas.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor(PALETTE["brand_accent"]))
    canvas.setLineWidth(1.4)
    canvas.line(MARGIN, PAGE_H - 150, MARGIN, 70)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(MARGIN, 40, "Gerado automaticamente a partir de audit_data.py — não editar o PDF manualmente.")
    canvas.restoreState()


def draw_content_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor(PALETTE["brand_dark"]))
    canvas.rect(0, PAGE_H - 14, PAGE_W, 14, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, PAGE_H - 10, "SGAT-TI — Auditoria de Segurança")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 10, REPORT_META["data"])

    canvas.setFillColor(colors.HexColor(PALETTE["text_muted"]))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(PAGE_W / 2, 14, f"Página {doc.page}")
    canvas.setStrokeColor(colors.HexColor(PALETTE["border_light"]))
    canvas.line(MARGIN, 24, PAGE_W - MARGIN, 24)
    canvas.restoreState()


def build_doc():
    doc = BaseDocTemplate(
        OUTPUT_PDF, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=18 * mm,
        title=REPORT_META["titulo"], author=REPORT_META["autor"],
    )
    cover_frame = Frame(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN, id="cover")
    content_frame = Frame(MARGIN, 18 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN - 6 * mm, id="content")
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame], onPage=draw_cover_background),
        PageTemplate(id="Content", frames=[content_frame], onPage=draw_content_page),
    ])
    return doc


# ---------------------------------------------------------------------------
# CONTEÚDO
# ---------------------------------------------------------------------------

def build_cover(story):
    story.append(Spacer(1, 210))
    story.append(Paragraph(REPORT_META["titulo"], STY["CoverTitle"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(REPORT_META["subtitulo"], STY["CoverSubtitle"]))
    story.append(Spacer(1, 40))
    meta_lines = [
        f"Repositório: {REPORT_META['repositorio']}",
        f"Branch auditada: {REPORT_META['branch_auditada']}",
        f"Data do relatório: {REPORT_META['data']}",
        f"Metodologia: {REPORT_META['autor']}",
    ]
    for line in meta_lines:
        story.append(Paragraph(line, STY["CoverMeta"]))
    story.append(NextPageTemplate("Content"))
    story.append(PageBreak())


def build_executive_summary(story, chart_paths):
    story.append(Paragraph("Resumo Executivo", STY["H1"]))
    story.append(Paragraph(
        "Esta auditoria cobre cinco categorias de risco combinadas a pedido: "
        "Isolamento, Permissões Frontend vs Backend, IDOR (Insecure Direct Object "
        "Reference), Chaves/Segredos Expostos e XSS (Cross-Site Scripting). Foram "
        "revisados todos os diretórios de código-fonte do repositório "
        f"({REPORT_META['repositorio']}), arquivo por arquivo, sem uso de "
        "ferramentas automatizadas de scanning — cada achado abaixo referencia "
        "arquivo e linha exatos no código.", STY["Body"],
    ))
    story.append(Paragraph(REPORT_META["escopo"], STY["BodySmall"]))
    story.append(Spacer(1, 6))

    n_crit = sum(1 for f in FINDINGS if f["severity"] == "Crítico")
    n_alto = sum(1 for f in FINDINGS if f["severity"] == "Alto")
    highlight = (
        f"<b>{n_crit} achado(s) crítico(s)</b> e <b>{n_alto} de severidade alta</b> "
        "foram confirmados, incluindo uma cadeia de exploração (F03) que permite "
        "a uma conta comum assumir o controle total de qualquer conta administradora "
        "combinando um IDOR de escrita (F02) com o fluxo de recuperação de senha."
    )
    story.append(Paragraph(highlight, STY["Body"]))

    donut_img = Image(chart_paths["donut"], width=78 * mm, height=71 * mm)
    bar_img = Image(chart_paths["bar"], width=92 * mm, height=60 * mm)
    chart_table = Table(
        [[Paragraph("Achados por Severidade", STY["Label"]), Paragraph("Achados por Categoria", STY["Label"])],
         [donut_img, bar_img]],
        colWidths=[82 * mm, 96 * mm],
    )
    chart_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 1), (-1, 1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
    ]))
    story.append(Spacer(1, 4))
    story.append(chart_table)
    story.append(Spacer(1, 8))


def build_stack_section(story):
    story.append(Paragraph("1. Reconhecimento de Stack", STY["H1"]))
    story.append(Paragraph(
        "Mapeamento das tecnologias reais do projeto, feito antes da varredura de "
        "vulnerabilidades, para calibrar corretamente o que cada categoria "
        "significa nesta stack específica.", STY["Body"],
    ))

    rows = [["Camada", "Tecnologias", "Observação"]]
    for s in STACK:
        rows.append([
            Paragraph(esc(s["camada"]), STY["Body"]),
            Paragraph(esc(s["tecnologias"]), STY["BodySmall"]),
            Paragraph(esc(s["observacao"]), STY["BodySmall"]),
        ])
    t = Table(rows, colWidths=[26 * mm, 62 * mm, 82 * mm], repeatRows=1)
    t.setStyle(_table_style_header())
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.1 Como cada categoria se aplica a esta stack", STY["H2"]))
    rows2 = [["Categoria", "Aplicação nesta stack"]]
    for m in STACK_CATEGORY_MAPPING:
        rows2.append([
            Paragraph(f"<b>{esc(m['categoria'])}</b>", STY["Body"]),
            Paragraph(esc(m["aplicacao"]), STY["BodySmall"]),
        ])
    t2 = Table(rows2, colWidths=[38 * mm, 132 * mm], repeatRows=1)
    t2.setStyle(_table_style_header())
    story.append(t2)
    story.append(PageBreak())


def _table_style_header():
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(PALETTE["brand_primary"])),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(PALETTE["bg_light"])]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor(PALETTE["border_light"])),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])


def build_findings_overview_table(story):
    story.append(Paragraph("2. Achados — Visão Geral (arquivo:linha)", STY["H1"]))
    rows = [["ID", "Severidade", "Categoria", "Arquivo:Linha", "Título"]]
    for f in FINDINGS:
        rows.append([
            f["id"],
            f["severity"],
            Paragraph(esc(f["category"]), STY["BodySmall"]),
            Paragraph(files_str(f["files"]), STY["BodySmall"]),
            Paragraph(esc(f["title"]), STY["BodySmall"]),
        ])
    t = Table(rows, colWidths=[10 * mm, 17 * mm, 30 * mm, 48 * mm, 65 * mm], repeatRows=1)
    style = _table_style_header()
    for i, f in enumerate(FINDINGS, start=1):
        style.add("BACKGROUND", (1, i), (1, i), colors.HexColor(SEVERITY_COLOR[f["severity"]]))
        style.add("TEXTCOLOR", (1, i), (1, i), colors.white)
        style.add("FONTNAME", (1, i), (1, i), "Helvetica-Bold")
        style.add("ALIGN", (1, i), (1, i), "CENTER")
        style.add("FONTSIZE", (1, i), (1, i), 7.6)
    t.setStyle(style)
    story.append(t)
    story.append(PageBreak())


def build_findings_detail(story):
    story.append(Paragraph("3. Achados Detalhados (linha a linha)", STY["H1"]))
    story.append(Paragraph(
        "Cada achado abaixo traz o trecho de código relevante, o cenário de "
        "exploração concreto e a correção recomendada.", STY["Body"],
    ))
    story.append(Spacer(1, 4))

    for f in FINDINGS:
        header = Table(
            [[Paragraph(f"{f['id']} · {esc(f['title'])}", STY["FindingTitle"]), sev_badge(f["severity"])]],
            colWidths=[142 * mm, 20 * mm],
        )
        header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(CATEGORY_COLOR[f["category"]])),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (0, 0), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (1, 0), (1, 0), 6),
        ]))

        meta = Paragraph(
            f"<b>Categoria:</b> {esc(f['category'])} &nbsp;·&nbsp; "
            f"<b>Arquivos:</b> {files_str(f['files'])}", STY["BodySmall"],
        )
        desc = Paragraph(f"<b>Descrição:</b> {esc(f['description'])}", STY["Body"])
        evid = code_block(f["evidence"])
        scen = Paragraph(f"<b>Cenário de exploração:</b> {esc(f['failure_scenario'])}", STY["Body"])
        rec = Paragraph(f"<b>Recomendação:</b> {esc(f['recommendation'])}", STY["Body"])

        block = KeepTogether([
            header, Spacer(1, 4), meta, Spacer(1, 3), desc,
            Spacer(1, 2), evid, Spacer(1, 3), scen, Spacer(1, 3), rec, Spacer(1, 12),
        ])
        story.append(block)

    story.append(PageBreak())


def build_strengths(story):
    story.append(Paragraph("4. Pontos Fortes (o que está correto/protegido)", STY["H1"]))
    story.append(Paragraph(
        "Nem todo achado é uma falha — a tabela abaixo documenta, também linha a "
        "linha, práticas corretas já aplicadas no projeto e que devem ser mantidas "
        "(e replicadas onde ainda faltam, ver seção 3).", STY["Body"],
    ))
    rows = [["Categoria", "Prática correta", "Evidência\n(arquivo:linha)"]]
    for s in STRENGTHS:
        rows.append([
            Paragraph(esc(s["category"]), STY["Body"]),
            Paragraph(f"<b>{esc(s['title'])}</b><br/>{esc(s['description'])}", STY["BodySmall"]),
            Paragraph(files_str_br(s["files"]), STY["EvidenceTiny"]),
        ])
    t = Table(rows, colWidths=[24 * mm, 98 * mm, 48 * mm], repeatRows=1)
    style = _table_style_header()
    style.add("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(PALETTE["cat_xss"]))
    t.setStyle(style)
    story.append(t)
    story.append(PageBreak())


def build_recommendations(story):
    story.append(Paragraph("5. Recomendações Priorizadas", STY["H1"]))
    rows = [["#", "Recomendação", "Achados", "Esforço", "Impacto"]]
    for r in RECOMMENDATIONS:
        rows.append([
            str(r["prioridade"]),
            Paragraph(esc(r["titulo"]), STY["BodySmall"]),
            ", ".join(r["relacionado"]),
            r["esforco"],
            r["impacto"],
        ])
    t = Table(rows, colWidths=[8 * mm, 96 * mm, 24 * mm, 20 * mm, 22 * mm], repeatRows=1)
    style = _table_style_header()
    for i, r in enumerate(RECOMMENDATIONS, start=1):
        impact_color = {
            "Crítico": PALETTE["sev_critico"], "Alto": PALETTE["sev_alto"],
            "Médio": PALETTE["sev_medio"], "Baixo": PALETTE["sev_baixo"],
        }.get(r["impacto"], PALETTE["text_muted"])
        style.add("TEXTCOLOR", (4, i), (4, i), colors.HexColor(impact_color))
        style.add("FONTNAME", (4, i), (4, i), "Helvetica-Bold")
    t.setStyle(style)
    story.append(t)
    story.append(PageBreak())


def build_issue_appendix(story):
    story.append(Paragraph("6. Anexo — Templates de Issues (Markdown, prontos para o GitHub)", STY["H1"]))
    story.append(Paragraph(
        "Copie cada bloco abaixo diretamente para uma nova issue no GitHub. Cada "
        "template já inclui labels sugeridas, impacto, evidência e checklist de aceite. "
        "As linhas de texto foram quebradas apenas para caber na largura da página — o "
        "arquivo <b>docs/security-audit/issues-templates.md</b> (gerado junto com este "
        "PDF) contém o Markdown original, sem quebras artificiais, pronto para copiar "
        "e colar diretamente no GitHub.",
        STY["Body"],
    ))
    story.append(Spacer(1, 6))
    for md in ISSUE_TEMPLATES_MD:
        story.append(code_block(wrap_markdown_for_display(md.rstrip())))
        story.append(Spacer(1, 10))


def write_issue_templates_md():
    path = os.path.join(HERE, "issues-templates.md")
    header = (
        f"# Templates de Issues — {REPORT_META['titulo']}\n\n"
        f"Gerado em {REPORT_META['data']} a partir de audit_data.py. "
        "Copie cada seção `###` abaixo (até a próxima) diretamente para uma "
        "nova issue no GitHub.\n\n---\n\n"
    )
    body = "\n---\n\n".join(md.strip() for md in ISSUE_TEMPLATES_MD)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(header + body + "\n")
    return path


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        donut_path = make_severity_donut(tmpdir)
        bar_path = make_category_bar(tmpdir)

        doc = build_doc()
        story = []
        story_template_first = "Cover"
        # A primeira página usa o template "Cover" por padrão (primeiro addPageTemplates)
        build_cover(story)
        build_executive_summary(story, {"donut": donut_path, "bar": bar_path})
        build_stack_section(story)
        build_findings_overview_table(story)
        build_findings_detail(story)
        build_strengths(story)
        build_recommendations(story)
        build_issue_appendix(story)

        doc.build(story)

    md_path = write_issue_templates_md()

    size_kb = os.path.getsize(OUTPUT_PDF) / 1024
    print(f"OK: PDF gerado em {OUTPUT_PDF} ({size_kb:.0f} KB)")
    print(f"OK: Templates de issues (Markdown puro) em {md_path}")


if __name__ == "__main__":
    main()
