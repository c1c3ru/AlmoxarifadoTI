#!/bin/bash

# Script para importar inventário completo por categoria
# Baseado no arquivo inventario-completo.csv

echo "🚀 Iniciando importação do inventário completo..."

# Função para obter ID da categoria
get_category_id() {
    local category_name="$1"
    curl -sS "http://localhost:5000/api/categories" | \
    jq -r ".[] | select(.name==\"$category_name\") | .id"
}

# Função para importar itens de uma categoria
import_category() {
    local category_name="$1"
    local csv_data="$2"
    
    echo "📦 Importando categoria: $category_name"
    
    local category_id=$(get_category_id "$category_name")
    if [ -z "$category_id" ] || [ "$category_id" = "null" ]; then
        echo "❌ Categoria '$category_name' não encontrada!"
        return 1
    fi
    
    echo "   ID da categoria: $category_id"
    
    # Fazer a requisição de importação
    local response=$(curl -sS -X POST "http://localhost:5000/api/inventory/import" \
        -H "Content-Type: application/json" \
        -d "{\"csvData\":\"$csv_data\",\"categoryId\":\"$category_id\"}")
    
    local success=$(echo "$response" | jq -r '.success // 0')
    local errors=$(echo "$response" | jq -r '.errors // [] | length')
    
    if [ "$success" -gt 0 ]; then
        echo "   ✅ $success itens importados com sucesso"
        if [ "$errors" -gt 0 ]; then
            echo "   ⚠️  $errors erros encontrados"
        fi
    else
        echo "   ❌ Falha na importação: $response"
    fi
    
    echo ""
}

# Aguardar servidor estar pronto
echo "⏳ Aguardando servidor..."
sleep 3

# 1. PROCESSADORES
echo "🔧 Importando PROCESSADORES..."
processadores_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Intel Celeron,Processador Intel Celeron,22,5,Almoxarifado TI - Prateleira A1
Intel Pentium,Processador Intel Pentium,22,5,Almoxarifado TI - Prateleira A1
Intel Core i5,Processador Intel Core i5,14,4,Almoxarifado TI - Prateleira A1
Intel Core i3,Processador Intel Core i3,11,3,Almoxarifado TI - Prateleira A1
Intel Dual Core,Processador Intel Dual Core,4,2,Almoxarifado TI - Prateleira A2
Intel Quad Core,Processador Intel Quad Core,7,2,Almoxarifado TI - Prateleira A2"
import_category "PROCESSADORES" "$processadores_csv"

# 2. ARMAZENAMENTO
echo "💾 Importando ARMAZENAMENTO..."
armazenamento_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
HD 500GB Seagate,Disco Rígido de 500GB da marca Seagate,22,5,Almoxarifado TI - Prateleira B1
HD 500GB WD Blue,Disco Rígido de 500GB da marca Western Digital Blue,3,1,Almoxarifado TI - Prateleira B1
HD 320GB,Disco Rígido de 320GB,2,1,Almoxarifado TI - Prateleira B2
HD 750GB Seagate,Disco Rígido de 750GB da marca Seagate,50,10,Almoxarifado TI - Prateleira B2
HD 1TB Western Digital,Disco Rígido de 1TB da marca Western Digital,9,3,Almoxarifado TI - Prateleira B3
HD 160GB Samsung,Disco Rígido de 160GB da marca Samsung,19,4,Almoxarifado TI - Prateleira B3
SSD 240GB GTA,Unidade de Estado Sólido de 240GB da marca GTA,11,3,Almoxarifado TI - Prateleira B4"
import_category "ARMAZENAMENTO" "$armazenamento_csv"

# 3. MEMÓRIA RAM
echo "🧠 Importando MEMÓRIA RAM..."
memoria_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
DDR4 8GB (GTA),Memória RAM DDR4 de 8GB da marca GTA,12,3,Almoxarifado TI - Prateleira C1
DDR3 4GB (Kingston),Memória RAM DDR3 de 4GB da marca Kingston,25,5,Almoxarifado TI - Prateleira C1
SO-DIMM DDR3 2GB (Markvision),Memória RAM SO-DIMM DDR3 de 2GB da marca Markvision para notebooks,22,5,Almoxarifado TI - Prateleira C2"
import_category "MEMÓRIA RAM" "$memoria_csv"

# 4. CABOS
echo "🔌 Importando CABOS..."
cabos_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Cabo USB tipo C,Cabo de dados e energia com conector USB tipo C,63,15,Caixa de Cabos - Seção 1
Cabo USB 3.0,Cabo de dados com conector USB 3.0,13,4,Caixa de Cabos - Seção 1
Cabo P2 (auxiliar),Cabo de áudio auxiliar com conector P2,7,2,Caixa de Cabos - Seção 2
Cabo HDMI,Cabo de vídeo e áudio digital HDMI,25,5,Caixa de Cabos - Seção 3
Cabo DVI,Cabo de vídeo digital DVI,17,4,Caixa de Cabos - Seção 3
Cabo VGA para HDMI,Adaptador de vídeo VGA para HDMI,1,1,Caixa de Cabos - Seção 4
Cabo VGA,Cabo de vídeo analógico VGA,52,10,Caixa de Cabos - Seção 4
Cabo DisplayPort,Cabo de vídeo digital DisplayPort,54,10,Caixa de Cabos - Seção 3
Cabo ATA,Cabo de dados para HDs e drives antigos,39,8,Caixa de Cabos - Seção 5
Cabo de força com 3 pinos (modelo antigo),Cabo de energia para fontes de computador (padrão antigo),34,7,Caixa de Cabos - Seção 6
Cabo de força padrão,Cabo de energia para fontes de computador (padrão novo),15,5,Caixa de Cabos - Seção 6
Cabo de força com 3 entradas,Cabo de energia com conector triplo (Mickey),15,4,Caixa de Cabos - Seção 6
Cabo de força em Y,Cabo de energia duplicador,1,1,Caixa de Cabos - Seção 6
Conector RJ45,Pacote com aproximadamente 50 conectores RJ45 para cabos de rede,1,1,Caixa de Conectores"
import_category "CABOS" "$cabos_csv"

# 5. FONTES DE ENERGIA
echo "⚡ Importando FONTES DE ENERGIA..."
fontes_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Adaptador AC-DC (padrão antigo),Fonte de alimentação AC-DC de modelo antigo,0,0,Armário de Fontes
Fonte 400W Fortrek,Fonte de alimentação ATX de 400W da marca Fortrek,0,0,Armário de Fontes
Fonte PoE,Fonte de alimentação Power over Ethernet,0,0,Armário de Fontes
Fonte de notebook,Fonte de alimentação para notebooks diversos,0,0,Armário de Fontes"
import_category "FONTES DE ENERGIA" "$fontes_csv"

# 6. REDES E CONECTIVIDADE
echo "🌐 Importando REDES E CONECTIVIDADE..."
redes_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Roteador,Roteador para distribuição de sinal de internet,15,3,Sala de Servidores - Prateleira A
Placa de rede,Placa de interface de rede para desktops,3,1,Almoxarifado TI - Gaveta 1
Antena de rede,Antena para roteadores ou placas de rede,6,2,Almoxarifado TI - Gaveta 1
DisplayPort para HDMI,Adaptador de vídeo DisplayPort para HDMI,4,2,Caixa de Adaptadores
Conector USB Bluetooth,Adaptador USB para conectividade Bluetooth,10,3,Caixa de Adaptadores"
import_category "REDES E CONECTIVIDADE" "$redes_csv"

# 7. PERIFÉRICOS
echo "🖱️ Importando PERIFÉRICOS..."
perifericos_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Headset com microfone,Fone de ouvido com microfone integrado,3,1,Armário de Periféricos - Seção A
Mouse ergonômico,Mouse com design ergonômico,4,2,Armário de Periféricos - Seção B
Mouse óptico,Mouse óptico com fio USB,19,5,Armário de Periféricos - Seção B
Teclado + mouse C3Plus,Kit de teclado e mouse da marca C3Plus,3,1,Armário de Periféricos - Seção C
Teclado,Teclado padrão ABNT2,9,3,Armário de Periféricos - Seção C
Webcam Multilaser,Câmera de vídeo para computador da marca Multilaser,1,1,Armário de Periféricos - Seção D
Monitor Dell,Monitor de vídeo da marca Dell,6,2,Estoque de Monitores
Monitor Samsung,Monitor de vídeo da marca Samsung,1,1,Estoque de Monitores
Notebook,Computador portátil,8,2,Sala de Equipamentos"
import_category "PERIFÉRICOS" "$perifericos_csv"

# 8. COMPONENTES E ACESSÓRIOS
echo "🔧 Importando COMPONENTES E ACESSÓRIOS..."
componentes_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Chave estrela,Chave de fenda do tipo estrela,4,2,Bancada de Manutenção
VBOX – caixa de passagem,Caixa de passagem para instalações,10,3,Almoxarifado Geral - Prateleira 1
Gabinete Dell,Gabinete de computador da marca Dell,2,1,Estoque de Gabinetes
Espelho de gabinete,Painel traseiro para placas-mãe,4,2,Almoxarifado TI - Gaveta 2
Suporte para mini PC,Suporte de fixação para computadores de formato pequeno,28,6,Almoxarifado Geral - Prateleira 2
Suporte universal desmontável,Suporte desmontável para diversos fins,8,2,Almoxarifado Geral - Prateleira 2
Suporte universal para TV,Suporte de parede para televisores,5,2,Almoxarifado Geral - Prateleira 3
Suporte para monitor,Suporte de mesa ou parede para monitores,16,4,Almoxarifado Geral - Prateleira 3
Guia passa cabo,Organizador para direcionamento de cabos,10,3,Almoxarifado Geral - Gaveta A
Trava de notebook,Cabo de segurança para notebooks,36,7,Almoxarifado Geral - Gaveta B
Estabilizador,Estabilizador de tensão para equipamentos eletrônicos,4,2,Sala de Equipamentos
Leitor de cartão,Leitor de cartões de memória USB,5,2,Almoxarifado TI - Gaveta 3
Leitor biométrico,Leitor de impressão digital USB,4,1,Almoxarifado TI - Gaveta 3
Apresentador sem fio,Passador de slides com apontador laser,3,1,Armário de Periféricos - Seção D
Speaker,Caixa de som para computador,2,1,Armário de Periféricos - Seção A
Cooler Next PC,Ventoinha para refrigeração de gabinete da marca Next PC,6,2,Almoxarifado TI - Gaveta 4"
import_category "COMPONENTES E ACESSÓRIOS" "$componentes_csv"

# 9. CADEADOS
echo "🔒 Importando CADEADOS..."
cadeados_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Cadeados Gold 35mm (6 unidades cada),Caixa com 6 unidades de cadeados de 35mm da marca Gold,3,1,Armário de Segurança - Gaveta 1
Cadeados Piller 20mm (1 unidade cada),Cadeado de 20mm da marca Piller,9,3,Armário de Segurança - Gaveta 1
Cadeados General 20mm (1 unidade cada),Cadeado de 20mm da marca General,2,1,Armário de Segurança - Gaveta 1
Cadeado Stam 20mm (1 unidade),Cadeado de 20mm da marca Stam,1,1,Armário de Segurança - Gaveta 1
Cadeados Land 25mm com chave (1 unidade cada),Cadeado de 25mm com chave da marca Land,28,6,Armário de Segurança - Gaveta 2"
import_category "CADEADOS" "$cadeados_csv"

# 10. CONSUMÍVEIS E PEQUENOS ITENS
echo "📦 Importando CONSUMÍVEIS E PEQUENOS ITENS..."
consumiveis_csv="Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Cartucho NP,Cartucho de tinta para impressora,3,1,Armário de Suprimentos - Prateleira A
Toner vazio,Cartucho de toner para impressora (vazio para recarga),13,3,Área de Descarte/Reciclagem
Pasta térmica (comum),Pasta térmica para dissipadores de calor,1,1,Bancada de Manutenção
Pasta térmica 5g,Seringa de 5g de pasta térmica de alta performance,1,1,Bancada de Manutenção
Micro óleo,Óleo lubrificante para pequenos mecanismos,2,1,Bancada de Manutenção
Limpa contato,Spray para limpeza de contatos elétricos,12,3,Bancada de Manutenção
Etiqueta para etiquetadora,Rolo de etiquetas para rotuladora,2,1,Armário de Suprimentos - Gaveta A
Bateria de BIOS,Bateria modelo CR2032 para placa-mãe,15,5,Almoxarifado TI - Gaveta 5
Organizador de cabo,Pacote com organizadores de cabos tipo velcro ou similar,3,1,Almoxarifado Geral - Gaveta A
Abraçadeira de nylon,Pacote com abraçadeiras de nylon (enforca-gato),200,50,Bancada de Manutenção
Rolo de solda,Rolo de estanho para solda eletrônica,10,2,Bancada de Manutenção
T's,Adaptador de tomada tipo 'T',25,5,Caixa de Adaptadores Elétricos"
import_category "CONSUMÍVEIS E PEQUENOS ITENS" "$consumiveis_csv"

echo "🎉 Importação concluída!"
echo "📊 Verificando total de itens..."

# Verificar total final
total_items=$(curl -sS "http://localhost:5000/api/items" | jq 'length')
echo "📈 Total de itens no sistema: $total_items"

echo ""
echo "✅ Inventário completo importado com sucesso!"
echo "🌐 Acesse a interface web para visualizar todos os itens" 