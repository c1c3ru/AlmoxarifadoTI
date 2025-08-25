import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ItemWithCategory } from "@shared/schema";

interface ThermalQRPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemWithCategory[];
}

interface QRCodeConfig {
  size: number;
  margin: number;
  codesPerRow: number;
  showText: boolean;
  paperWidth: 'small' | 'medium' | 'large'; // 58mm, 80mm, 110mm
}

const PAPER_CONFIGS = {
  small: { width: 58, maxCodesPerRow: 2, defaultSize: 60 },
  medium: { width: 80, maxCodesPerRow: 3, defaultSize: 70 },
  large: { width: 110, maxCodesPerRow: 4, defaultSize: 80 }
};

export function ThermalQRPrinter({ open, onOpenChange, items }: ThermalQRPrinterProps) {
  const [config, setConfig] = useState<QRCodeConfig>({
    size: 60,
    margin: 1,
    codesPerRow: 2,
    showText: true,
    paperWidth: 'small'
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Clone the content to avoid modifying the original
    const clonedContent = printContent.cloneNode(true) as HTMLElement;
    
    // Convert all canvas elements to images in the cloned content
    const canvases = printContent.querySelectorAll('canvas');
    const clonedCanvases = clonedContent.querySelectorAll('canvas');
    
    const imagePromises = Array.from(canvases).map((canvas, index) => {
      return new Promise<void>((resolve) => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = canvas.className;
        img.style.cssText = canvas.style.cssText;
        img.style.imageRendering = 'pixelated';
        
        // Replace canvas with image in the cloned content
        const clonedCanvas = clonedCanvases[index];
        clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
        resolve();
      });
    });

    Promise.all(imagePromises).then(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const paperConfig = PAPER_CONFIGS[config.paperWidth];
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Codes - Impressão Térmica</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              @page {
                size: ${paperConfig.width}mm auto;
                margin: 2mm;
              }
              
              body {
                font-family: 'Courier New', monospace;
                font-size: 7px;
                line-height: 1.1;
                width: ${paperConfig.width - 2}mm;
                padding: 1mm;
              }
              
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(${config.codesPerRow}, 1fr);
                gap: 1.5mm;
                width: 100%;
                justify-items: center;
              }
              
              .qr-item {
                text-align: center;
                page-break-inside: avoid;
                margin-bottom: 1.5mm;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              
              .qr-code {
                width: ${config.size * 0.264583}mm;
                height: ${config.size * 0.264583}mm;
                margin: 0 auto ${config.showText ? '0.5mm' : '0'};
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
                image-rendering: crisp-edges;
              }
              
              .qr-text {
                font-size: 5px;
                font-weight: bold;
                word-break: break-all;
                max-width: ${config.size * 0.264583}mm;
                margin: 0;
                padding: 0;
                line-height: 1;
              }
              
              @media print {
                body { -webkit-print-color-adjust: exact; }
                img { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${clonedContent.innerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    });
  };

  const updateConfig = (key: keyof QRCodeConfig, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      
      // Auto-adjust codes per row based on paper width
      if (key === 'paperWidth') {
        const paperConfig = PAPER_CONFIGS[value as keyof typeof PAPER_CONFIGS];
        newConfig.codesPerRow = Math.min(newConfig.codesPerRow, paperConfig.maxCodesPerRow);
        newConfig.size = paperConfig.defaultSize;
      }
      
      return newConfig;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full max-h-[95vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-print text-primary-600"></i>
            Impressão Térmica - QR Codes ({items.length} itens)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Configurações */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configurações da Impressora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paper-width">Largura do Papel</Label>
                  <Select 
                    value={config.paperWidth} 
                    onValueChange={(value) => updateConfig('paperWidth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">58mm (Pequena)</SelectItem>
                      <SelectItem value="medium">80mm (Média)</SelectItem>
                      <SelectItem value="large">110mm (Grande)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="qr-size">Tamanho QR Code (px)</Label>
                  <Input
                    id="qr-size"
                    type="number"
                    min="30"
                    max="120"
                    step="5"
                    value={config.size}
                    onChange={(e) => updateConfig('size', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendado: 30-80px para impressoras térmicas
                  </p>
                </div>

                <div>
                  <Label htmlFor="codes-per-row">QR Codes por Linha</Label>
                  <Input
                    id="codes-per-row"
                    type="number"
                    min="1"
                    max={PAPER_CONFIGS[config.paperWidth].maxCodesPerRow}
                    value={config.codesPerRow}
                    onChange={(e) => updateConfig('codesPerRow', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="margin">Margem QR Code</Label>
                  <Input
                    id="margin"
                    type="number"
                    min="0"
                    max="4"
                    value={config.margin}
                    onChange={(e) => updateConfig('margin', parseInt(e.target.value))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-text"
                    checked={config.showText}
                    onChange={(e) => updateConfig('showText', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="show-text">Mostrar código do item</Label>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handlePrint}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={items.length === 0}
            >
              <i className="fas fa-print mr-2"></i>
              Imprimir {items.length} QR Code{items.length !== 1 ? 's' : ''}
            </Button>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview da Impressão</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={printRef}
                  className="border border-gray-200 p-3 bg-white min-h-[400px] overflow-auto"
                  style={{ 
                    width: `${PAPER_CONFIGS[config.paperWidth].width * 3}px`,
                    maxWidth: '100%',
                    maxHeight: '500px'
                  }}
                >
                  <div 
                    className="qr-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${config.codesPerRow}, 1fr)`,
                      gap: '6px',
                      justifyItems: 'center',
                      alignItems: 'start'
                    }}
                  >
                    {items.map((item) => (
                      <ThermalQRCode
                        key={item.id}
                        item={item}
                        config={config}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ThermalQRCodeProps {
  item: ItemWithCategory;
  config: QRCodeConfig;
}

function ThermalQRCode({ item, config }: ThermalQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return;

      try {
        const QRCode = await import('qrcode');
        const canvas = canvasRef.current;
        
        await QRCode.toCanvas(canvas, `ITEM:${item.id}:${item.internalCode}`, {
          width: config.size,
          margin: config.margin,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    };

    generateQRCode();
  }, [item, config]);

  return (
    <div className="qr-item flex flex-col items-center justify-start">
      <canvas
        ref={canvasRef}
        width={config.size}
        height={config.size}
        className="qr-code"
        style={{ 
          width: `${config.size}px`, 
          height: `${config.size}px`,
          imageRendering: 'pixelated'
        }}
      />
      {config.showText && (
        <div 
          className="qr-text font-mono font-bold text-center mt-1"
          style={{ 
            fontSize: '8px', 
            maxWidth: `${config.size}px`,
            lineHeight: '1',
            wordBreak: 'break-all'
          }}
        >
          {item.internalCode}
        </div>
      )}
    </div>
  );
}
