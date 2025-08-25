import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { QRScanner } from "@/components/qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ItemWithCategory } from "@shared/schema";

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [rawScannedCode, setRawScannedCode] = useState<string | null>(null);
  const [withdrawalQuantity, setWithdrawalQuantity] = useState(1);
  const [destination, setDestination] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: scannedItem, isLoading: itemLoading } = useQuery<ItemWithCategory>({
    queryKey: ["/api/items/by-code", scannedCode],
    enabled: !!scannedCode,
    queryFn: async () => {
      if (!scannedCode) throw new Error("Código não definido");
      const res = await apiRequest("GET", `/api/items/by-code/${encodeURIComponent(scannedCode)}`);
      return res.json();
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-movements"] });
      
      // Reset form
      setScannedCode(null);
      setRawScannedCode(null);
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
    try {
      const raw = (code || "").trim();
      // Tentar decodificar caso venha URL-encoded
      const decoded = (() => {
        try { return decodeURIComponent(raw); } catch { return raw; }
      })();
      // Extrair padrão ITEM:<uuid>:<internalCode> => usar apenas <internalCode>
      let extracted = decoded;
      const match = decoded.match(/^ITEM:([0-9a-fA-F-]{36}):(.+)$/);
      if (match) {
        extracted = match[2];
      } else if (decoded.toUpperCase().startsWith("ITEM:")) {
        // Fallback genérico: pegar o último segmento após ':'
        const parts = decoded.split(":");
        extracted = parts[parts.length - 1] || decoded;
      }
      extracted = extracted.trim().replace(/^"|"$/g, "");
      setRawScannedCode(decoded);
      setScannedCode(extracted);
    } finally {
      setIsScanning(false);
    }
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
    setRawScannedCode(null);
    setWithdrawalQuantity(1);
    setDestination("");
    setIsScanning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponivel":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "em-uso":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "manutencao":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "descartado":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "disponivel":
        return "Disponível";
      case "em-uso":
        return "Em Uso";
      case "manutencao":
        return "Em Manutenção";
      case "descartado":
        return "Descartado";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "disponivel":
        return "fa-solid fa-circle-check";
      case "em-uso":
        return "fa-solid fa-clock";
      case "manutencao":
        return "fa-solid fa-wrench";
      case "descartado":
        return "fa-solid fa-trash";
      default:
        return "fa-solid fa-circle";
    }
  };

  return (
    <MainLayout
      title="Scanner QR Code"
      subtitle="Escaneie QR Codes para dar baixa rápida no estoque"
      showAddButton={false}
    >
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-lg mb-8">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <i className="fa-solid fa-qrcode text-white text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Scanner QR Code
            </h3>
            <p className="text-gray-600 font-medium mb-6">
              Aponte a câmera para o QR Code do item para dar baixa instantânea no estoque
            </p>
            {!isScanning && !scannedCode && (
              <Button
                onClick={() => setIsScanning(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-3 text-lg font-semibold shadow-lg"
              >
                <i className="fa-solid fa-camera mr-3"></i>
                Iniciar Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Scanner Interface */}
        <Card className="bg-white border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="mb-8">
              <QRScanner
                onScan={handleScan}
                isActive={isScanning}
                onActivate={() => setIsScanning(true)}
              />
            </div>
            
            {/* Success State - Item Found */}
            {scannedCode && scannedItem && !itemLoading && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6 shadow-lg">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-check text-white text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-800 mb-1">Item Encontrado!</p>
                    <p className="text-emerald-700 font-medium">QR Code escaneado com sucesso</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-md">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-md">
                      <i className={`${scannedItem.category?.icon || 'fa-solid fa-cube'} text-blue-600 text-xl`}></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-gray-900 mb-2" data-testid="scanned-item-name">
                        {scannedItem.name}
                      </h4>
                      <div className="flex items-center space-x-3">
                        <div className="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm" data-testid="scanned-item-code">
                          {scannedItem.internalCode}
                        </div>
                        <Badge
                          className={`${getStatusColor(scannedItem.status)} font-medium border px-3 py-1`}
                        >
                          <i className={`${getStatusIcon(scannedItem.status)} mr-2 text-xs`}></i>
                          {getStatusLabel(scannedItem.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-warehouse text-white"></i>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Estoque Atual</p>
                          <p className="text-2xl font-bold text-blue-900" data-testid="scanned-item-stock">
                            {scannedItem.currentStock}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-tags text-white"></i>
                        </div>
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Categoria</p>
                          <p className="text-lg font-bold text-purple-900">
                            {scannedItem.category?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {scannedItem.location && (
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-location-dot text-white"></i>
                          </div>
                          <div>
                            <p className="text-sm text-orange-600 font-medium">Localização</p>
                            <p className="text-lg font-bold text-orange-900" data-testid="scanned-item-location">
                              {scannedItem.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="quantity" className="text-lg font-bold text-gray-700 mb-3 block">
                        Quantidade a Retirar
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={scannedItem.currentStock}
                        value={withdrawalQuantity}
                        onChange={(e) => setWithdrawalQuantity(parseInt(e.target.value) || 1)}
                        className="h-14 text-lg font-medium border-2 border-gray-200 focus:border-blue-400"
                        data-testid="input-withdrawal-quantity"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="destination" className="text-lg font-bold text-gray-700 mb-3 block">
                        Destino/Observação <span className="text-gray-500 font-normal">(Opcional)</span>
                      </Label>
                      <Input
                        id="destination"
                        type="text"
                        placeholder="Ex: João Silva - Depto. Financeiro"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="h-14 text-lg border-2 border-gray-200 focus:border-blue-400"
                        data-testid="input-withdrawal-destination"
                      />
                    </div>
                    
                    <div className="flex space-x-4 pt-4">
                      <Button
                        onClick={handleConfirmWithdrawal}
                        disabled={createMovementMutation.isPending}
                        className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-lg shadow-lg"
                        data-testid="button-confirm-withdrawal"
                      >
                        {createMovementMutation.isPending ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin mr-3"></i>
                            Processando...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-check mr-3"></i>
                            Confirmar Baixa
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelScan}
                        disabled={createMovementMutation.isPending}
                        className="h-14 px-6 border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 text-gray-700 font-bold"
                        data-testid="button-cancel-scan"
                      >
                        <i className="fa-solid fa-times mr-2"></i>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State - Invalid QR Code */}
            {scannedCode && !scannedItem && !itemLoading && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 mb-6 shadow-lg">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-exclamation-triangle text-white text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-800 mb-1">Item não encontrado</p>
                    <p className="text-red-700 font-medium">
                      O código "<strong>{rawScannedCode || scannedCode}</strong>" não corresponde a nenhum item cadastrado.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCancelScan}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3"
                  data-testid="button-scan-again"
                >
                  <i className="fa-solid fa-camera mr-2"></i>
                  Escanear Novamente
                </Button>
              </div>
            )}

            {/* Loading State */}
            {itemLoading && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <i className="fa-solid fa-spinner fa-spin text-white text-2xl"></i>
                </div>
                <p className="text-xl font-bold text-gray-700 mb-2">Buscando item...</p>
                <p className="text-gray-500">Verificando o código escaneado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}