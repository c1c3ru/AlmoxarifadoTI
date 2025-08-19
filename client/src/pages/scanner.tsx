import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { QRScanner } from "@/components/qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ItemWithCategory } from "@shared/schema";

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [withdrawalQuantity, setWithdrawalQuantity] = useState(1);
  const [destination, setDestination] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: scannedItem, isLoading: itemLoading } = useQuery<ItemWithCategory>({
    queryKey: ["/api/items/by-code", scannedCode],
    enabled: !!scannedCode,
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      quantity: number;
      destination?: string;
      previousStock: number;
    }) => {
      if (!user) throw new Error("Usuário não encontrado");
      
      const movementData = {
        itemId: data.itemId,
        userId: user.id,
        type: "saida" as const,
        quantity: data.quantity,
        previousStock: data.previousStock,
        newStock: data.previousStock - data.quantity,
        destination: data.destination,
        observation: "Baixa via QR Scanner",
      };

      const response = await apiRequest("POST", "/api/movements", movementData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Baixa realizada com sucesso",
        description: `${withdrawalQuantity} unidade(s) retirada(s) do estoque.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Reset form
      setScannedCode(null);
      setWithdrawalQuantity(1);
      setDestination("");
      setIsScanning(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao realizar baixa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = (code: string) => {
    setScannedCode(code);
    setIsScanning(false);
  };

  const handleConfirmWithdrawal = () => {
    if (!scannedItem) return;

    if (withdrawalQuantity > scannedItem.currentStock) {
      toast({
        title: "Estoque insuficiente",
        description: `Disponível: ${scannedItem.currentStock} unidades. Solicitado: ${withdrawalQuantity} unidades.`,
        variant: "destructive",
      });
      return;
    }

    if (withdrawalQuantity < 1) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    createMovementMutation.mutate({
      itemId: scannedItem.id,
      quantity: withdrawalQuantity,
      destination: destination.trim() || undefined,
      previousStock: scannedItem.currentStock,
    });
  };

  const handleCancelScan = () => {
    setScannedCode(null);
    setWithdrawalQuantity(1);
    setDestination("");
    setIsScanning(false);
  };

  return (
    <MainLayout
      title="Scanner de QR Code"
      subtitle="Escaneie o QR Code do item para dar baixa no estoque"
      showAddButton={false}
    >
      <div className="max-w-2xl mx-auto">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="mb-6">
              <QRScanner
                onScan={handleScan}
                isActive={isScanning}
                onActivate={() => setIsScanning(true)}
              />
            </div>
            
            {/* Scanned Item Details */}
            {scannedCode && scannedItem && !itemLoading && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-check-circle text-success-600 text-xl"></i>
                  <div>
                    <p className="font-semibold text-success-800">Item Encontrado!</p>
                    <p className="text-sm text-success-700">QR Code escaneado com sucesso</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <i className={`${scannedItem.category?.icon || 'fas fa-box'} text-primary-600`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900" data-testid="scanned-item-name">
                        {scannedItem.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Código: <span data-testid="scanned-item-code">{scannedItem.internalCode}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Estoque Atual:</span>
                      <span className="font-medium text-gray-900 ml-1" data-testid="scanned-item-stock">
                        {scannedItem.currentStock} unidades
                      </span>
                    </div>
                    {scannedItem.location && (
                      <div>
                        <span className="text-gray-500">Localização:</span>
                        <span className="font-medium text-gray-900 ml-1" data-testid="scanned-item-location">
                          {scannedItem.location}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                        Quantidade a Retirar
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={scannedItem.currentStock}
                        value={withdrawalQuantity}
                        onChange={(e) => setWithdrawalQuantity(parseInt(e.target.value) || 1)}
                        className="w-full"
                        data-testid="input-withdrawal-quantity"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2">
                        Destino/Observação (Opcional)
                      </Label>
                      <Input
                        id="destination"
                        type="text"
                        placeholder="Ex: João Silva - Depto. Financeiro"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full"
                        data-testid="input-withdrawal-destination"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleConfirmWithdrawal}
                        disabled={createMovementMutation.isPending}
                        className="flex-1 bg-success-600 hover:bg-success-700 text-white"
                        data-testid="button-confirm-withdrawal"
                      >
                        {createMovementMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Processando...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check mr-2"></i>
                            Confirmar Baixa
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelScan}
                        disabled={createMovementMutation.isPending}
                        data-testid="button-cancel-scan"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error state for invalid QR code */}
            {scannedCode && !scannedItem && !itemLoading && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-exclamation-triangle text-error-600 text-xl"></i>
                  <div>
                    <p className="font-semibold text-error-800">Item não encontrado</p>
                    <p className="text-sm text-error-700">
                      O código "{scannedCode}" não corresponde a nenhum item cadastrado.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCancelScan}
                  className="mt-4"
                  data-testid="button-scan-again"
                >
                  Escanear Novamente
                </Button>
              </div>
            )}

            {/* Loading state */}
            {itemLoading && (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-4xl text-primary-600 mb-4"></i>
                <p className="text-gray-500">Buscando item...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
