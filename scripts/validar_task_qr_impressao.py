#!/usr/bin/env python3
import os
import re
import json
import sys
from pathlib import Path

# Cores ANSI para terminal
VERDE = "\033[92m"
VERMELHO = "\033[91m"
AMARELO = "\033[93m"
NEGRITO = "\033[1m"
RESET = "\033[0m"

CHECK_OK = f"{VERDE}✔ [PASSOU]{RESET}"
CHECK_FAIL = f"{VERMELHO}✘ [FALHOU]{RESET}"

EXTENSOES_ALVO = {".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".html"}
DIRS_IGNORADOS = {"node_modules", ".next", ".git", "dist", "build", ".vercel"}


def coletar_arquivos(raiz: Path):
    arquivos = {}
    for root, dirs, files in os.walk(raiz):
        dirs[:] = [d for d in dirs if d not in DIRS_IGNORADOS]
        for file in files:
            p = Path(root) / file
            if p.suffix in EXTENSOES_ALVO:
                try:
                    arquivos[str(p)] = p.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    pass
    return arquivos


def buscar_padrao(arquivos: dict, regex: str, flags=re.IGNORECASE):
    comp = re.compile(regex, flags)
    encontrados = []
    for path, conteudo in arquivos.items():
        if comp.search(conteudo):
            encontrados.append(path)
    return encontrados


def validar_homologacao_fisica(arquivo_evidencia: Path):
    resultados = []
    if not arquivo_evidencia.exists():
        return [
            ("Homologação Física Android", False, "Arquivo homologacao_hardware.json ausente"),
            ("Homologação Física iOS", False, "Arquivo homologacao_hardware.json ausente"),
            ("Homologação Impressora Térmica", False, "Arquivo homologacao_hardware.json ausente"),
        ]

    try:
        dados = json.loads(arquivo_evidencia.read_text(encoding="utf-8"))
    except Exception as e:
        return [("Homologação Física (JSON)", False, f"Erro ao ler JSON: {e}")]

    mapa = [
        ("Homologação Física Android", "android", "dispositivo"),
        ("Homologação Física iOS", "ios", "dispositivo"),
        ("Homologação Impressora Térmica", "impressora_termica", "modelo"),
    ]

    for titulo, chave, campo_id in mapa:
        item = dados.get(chave, {})
        validado = item.get("validado") is True
        identificador = str(item.get(campo_id, "")).strip()
        evidencia = str(item.get("evidencia_path", "")).strip()
        arquivo_existe = bool(evidencia) and Path(evidencia).exists()

        if validado and identificador and arquivo_existe:
            resultados.append((titulo, True, f"{identificador} (evidência: {evidencia})"))
        else:
            motivo = "Sem evidência física anexada (não declarado como validado)"
            if validado and not arquivo_existe:
                motivo = f"Flag validado=true, mas arquivo '{evidencia}' não existe"
            resultados.append((titulo, False, motivo))

    return resultados


def main():
    raiz = Path(".")
    arquivos = coletar_arquivos(raiz)
    conteudo_total = "\n".join(arquivos.values())

    print(f"\n{NEGRITO}=== AUDITORIA TÉCNICA: QR CODE, CAMERA, SAFE AREA & IMPRESSÃO ==={RESET}\n")

    checks = []

    # 1. Orientação e Safe Area
    tem_safe_area = bool(buscar_padrao(arquivos, r"env\(safe-area-inset-(top|bottom|left|right)\)|viewport-fit=cover"))
    checks.append((
        "Safe Area (inset / viewport-fit=cover)",
        tem_safe_area,
        "Encontrado suporte a safe-area-inset" if tem_safe_area else "Ausente env(safe-area-inset-*) ou viewport-fit=cover"
    ))

    tem_orientacao = bool(buscar_padrao(arquivos, r"orientation|portrait|landscape|window\.screen\.orientation"))
    checks.append((
        "Controle/Adaptação de Orientação",
        tem_orientacao,
        "Tratamento de orientação encontrado" if tem_orientacao else "Nenhuma regra de orientação (CSS/JS) localizada"
    ))

    # 2. Câmera: Start/Stop e Permissões
    tem_camera_api = bool(buscar_padrao(arquivos, r"getUserMedia|Html5Qrcode|BrowserMultiFormatReader|QrScanner|BarcodeDetector"))
    tem_stop_tracks = bool(buscar_padrao(arquivos, r"getTracks\(\)\.forEach|track\.stop\(\)|\.stop\(\)|\.clear\(\)"))
    checks.append((
        "Câmera: Ciclo de vida Start/Stop",
        tem_camera_api and tem_stop_tracks,
        "Start e cleanup/stop de stream detectados" if (tem_camera_api and tem_stop_tracks) else "Falta encerramento explícito da câmera (track.stop / clear)"
    ))

    tem_permissoes = bool(buscar_padrao(arquivos, r"NotAllowedError|PermissionDenied|permissions\.query|catch\s*\("))
    checks.append((
        "Câmera: Tratamento de Permissões",
        tem_permissoes,
        "Tratamento de erro/permissão presente" if tem_permissoes else "Sem tratamento explícito para negação de permissão de câmera"
    ))

    # 3. Decodificação, Formato QR e Payload
    tem_formato_qr = bool(buscar_padrao(arquivos, r"QR_CODE|qr_code|formats.*qr|qrcode"))
    tem_validacao_payload = bool(buscar_padrao(arquivos, r"JSON\.parse|zod|schema|validate|payload|regex|startsWith"))
    checks.append((
        "Decodificação, Formato QR e Validação de Payload",
        tem_formato_qr and tem_validacao_payload,
        "Formato QR e parser/validação de payload detectados" if (tem_formato_qr and tem_validacao_payload) else "Falta restrição explícita de formato QR ou validação do payload"
    ))

    # 4. Separação CSS de Impressão vs Navegação
    tem_media_print = bool(buscar_padrao(arquivos, r"@media\s+print"))
    oculta_nav_print = bool(re.search(r"@media\s+print[\s\S]{0,1200}?(nav|header|sidebar|no-print)[\s\S]{0,200}?display\s*:\s*none", conteudo_total, re.IGNORECASE))
    checks.append((
        "Separação CSS Impressão vs Navegação (@media print)",
        tem_media_print and oculta_nav_print,
        "Regras @media print isolando navegação encontradas" if (tem_media_print and oculta_nav_print) else "Falta @media print ocultando elementos de navegação (.no-print / nav)"
    ))

    # 5. Dimensão Real das Etiquetas, Quiet Zone e Qualidade
    tem_dimensao_fisica = bool(buscar_padrao(arquivos, r"@page[\s\S]{0,300}?(mm|cm|in)|width\s*:\s*\d+(\.\d+)?(mm|cm)"))
    tem_quiet_zone = bool(buscar_padrao(arquivos, r"margin\s*:\s*[1-9]\d*(\.\d+)?mm|quietZone|margin\s*:\s*[2-9]|padding\s*:\s*[2-9]\d*mm"))
    tem_qualidade_render = bool(buscar_padrao(arquivos, r"image-rendering\s*:\s*pixelated|crisp-edges|shape-rendering\s*:\s*crispEdges|<svg|errorCorrectionLevel|level\s*:\s*['\"][MQH]['\"]"))

    checks.append((
        "Etiqueta: Dimensão Física Real (@page / mm / cm)",
        tem_dimensao_fisica,
        "Unidades físicas reais (mm/cm) e @page detectadas" if tem_dimensao_fisica else "Dimensões físicas reais (mm/cm) ou @page não encontradas"
    ))

    checks.append((
        "Etiqueta: Quiet Zone (Margem de silêncio do QR)",
        tem_quiet_zone,
        "Margem/quiet zone configurada" if tem_quiet_zone else "Quiet zone explícita não detectada"
    ))

    checks.append((
        "Etiqueta: Qualidade de Impressão (SVG / crisp-edges / ECC)",
        tem_qualidade_render,
        "Renderização vetorial/nítida ou correção de erro configurada" if tem_qualidade_render else "Falta SVG, crisp-edges/pixelated ou errorCorrectionLevel"
    ))

    # 6. Teste Simulado (Existência de suíte automatizada)
    arquivos_teste = [p for p in arquivos if re.search(r"\.(test|spec)\.(ts|tsx|js|jsx)$", p)]
    checks.append((
        "Teste Simulado (Suíte unitária / E2E no repositório)",
        len(arquivos_teste) > 0,
        f"{len(arquivos_teste)} arquivo(s) de teste encontrado(s)" if arquivos_teste else "Nenhum arquivo *.test.* ou *.spec.* encontrado"
    ))

    # 7. Homologação Física (Bloqueia falso positivo sem evidência)
    checks.extend(validar_homologacao_fisica(raiz / "homologacao_hardware.json"))

    # Exibição do Relatório
    total_ok = 0
    for titulo, status, detalhe in checks:
        icone = CHECK_OK if status else CHECK_FAIL
        if status:
            total_ok += 1
        print(f"{icone} {NEGRITO}{titulo}{RESET}")
        print(f"    └─ {detalhe}")

    print(f"\n{NEGRITO}Resumo:{RESET} {total_ok}/{len(checks)} critérios aprovados.")

    if total_ok < len(checks):
        print(f"{VERMELHO}Status Final: PENDENTE / REPROVADO (Hardware não homologado ou regras ausentes).{RESET}\n")
        sys.exit(1)
    else:
        print(f"{VERDE}Status Final: TOTALMENTE VALIDADO COM EVIDÊNCIAS.{RESET}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
