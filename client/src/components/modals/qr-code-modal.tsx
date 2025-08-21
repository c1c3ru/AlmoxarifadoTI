import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ItemWithCategory } from "@shared/schema";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithCategory | null;
}

export function QRCodeModal({ open, onOpenChange, item }: QRCodeModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real implementation, this would generate and download the QR code image
    console.log("Download QR code for item:", item?.internalCode);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-white shadow-2xl border border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-qrcode text-primary-600"></i>
            QR Code do Item
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900" data-testid="qr-item-name">
              {item.name}
            </h4>
            <p className="text-sm text-gray-500">
              Código: <span data-testid="qr-item-code">{item.internalCode}</span>
            </p>
          </div>
          
          {/* QR Code real */}
          <Card className="mx-auto bg-white border rounded-lg flex items-center justify-center p-4 print:shadow-none">
            <CardContent className="text-center p-0">
              <QRCodeGenerator
                value={`ITEM:${item.id}:${item.internalCode}`}
                size={256}
                className="mx-auto"
              />
              <p className="mt-3 text-xs text-gray-500" data-testid="qr-code-data">
                {item.internalCode}
              </p>
            </CardContent>
          </Card>
          
          <div className="flex space-x-3 print:hidden">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handlePrint}
                    className="flex-1 bg-primary-600 hover:bg-primary-700"
                    data-testid="button-print-qr"
                    aria-label="Imprimir QR Code"
                  >
                    <i className="fas fa-print mr-2"></i>
                    Imprimir
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimir QR Code</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-download-qr"
                    aria-label="Baixar QR Code"
                  >
                    <i className="fas fa-download mr-2"></i>
                    Baixar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Baixar como imagem</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

