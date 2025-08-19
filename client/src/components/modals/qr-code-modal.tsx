import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ItemWithCategory } from "@shared/schema";

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
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>QR Code do Item</DialogTitle>
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
          
          {/* QR Code placeholder - in real implementation, this would be generated dynamically */}
          <Card className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <CardContent className="text-center p-6">
              <i className="fas fa-qrcode text-4xl text-gray-400 mb-2"></i>
              <p className="text-sm text-gray-500">QR Code</p>
              <p className="text-xs text-gray-400" data-testid="qr-code-data">
                {item.internalCode}
              </p>
            </CardContent>
          </Card>
          
          <div className="flex space-x-3">
            <Button
              onClick={handlePrint}
              className="flex-1 bg-primary-600 hover:bg-primary-700"
              data-testid="button-print-qr"
            >
              <i className="fas fa-print mr-2"></i>
              Imprimir
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1"
              data-testid="button-download-qr"
            >
              <i className="fas fa-download mr-2"></i>
              Baixar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
