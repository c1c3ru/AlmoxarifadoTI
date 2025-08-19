import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { MovementModal } from "@/components/modals/movement-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemWithCategory, MovementWithDetails } from "@shared/schema";

export default function Movements() {
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);
  const [selectedItemFilter, setSelectedItemFilter] = useState("");

  const { data: items = [] } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/items"],
  });

  const { data: movements = [], isLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/movements", { itemId: selectedItemFilter || undefined }],
  });

  const handleNewMovement = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowMovementModal(true);
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString("pt-BR");
  };

  const getMovementTypeColor = (type: string) => {
    return type === "entrada" 
      ? "bg-success-100 text-success-800" 
      : "bg-error-100 text-error-800";
  };

  const getMovementTypeLabel = (type: string) => {
    return type === "entrada" ? "Entrada" : "Saída";
  };

  const getMovementIcon = (type: string) => {
    return type === "entrada" ? "fa-arrow-down" : "fa-arrow-up";
  };

  return (
    <MainLayout
      title="Movimentações"
      subtitle="Gerencie entradas e saídas de itens do almoxarifado"
      showAddButton={false}
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-arrow-down text-success-600 text-xl"></i>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Registrar Entrada</h3>
            <p className="text-sm text-gray-500 mb-4">Adicionar itens ao estoque</p>
            <Button 
              className="w-full bg-success-600 hover:bg-success-700"
              onClick={() => setShowMovementModal(true)}
              data-testid="button-register-entry"
            >
              Nova Entrada
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-error-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-arrow-up text-error-600 text-xl"></i>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Registrar Saída</h3>
            <p className="text-sm text-gray-500 mb-4">Retirar itens do estoque</p>
            <Button 
              className="w-full bg-error-600 hover:bg-error-700"
              onClick={() => setShowMovementModal(true)}
              data-testid="button-register-exit"
            >
              Nova Saída
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-qrcode text-primary-600 text-xl"></i>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Scanner QR</h3>
            <p className="text-sm text-gray-500 mb-4">Dar baixa via QR Code</p>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = '/scanner'}
              data-testid="button-go-scanner"
            >
              Abrir Scanner
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Movements History */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Movimentações Recentes</h3>
            <div className="w-64">
              <Select value={selectedItemFilter} onValueChange={setSelectedItemFilter}>
                <SelectTrigger data-testid="select-item-filter">
                  <SelectValue placeholder="Filtrar por item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os itens</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.internalCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-exchange-alt text-4xl text-gray-400 mb-4"></i>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma movimentação encontrada</h4>
              <p className="text-gray-500 mb-4">
                {selectedItemFilter ? "Nenhuma movimentação para o item selecionado" : "Registre a primeira movimentação"}
              </p>
              <Button 
                onClick={() => setShowMovementModal(true)}
                data-testid="button-first-movement"
              >
                Nova Movimentação
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`movement-${movement.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      movement.type === "entrada" 
                        ? "bg-success-100" 
                        : "bg-error-100"
                    }`}>
                      <i className={`fas ${getMovementIcon(movement.type)} ${
                        movement.type === "entrada" 
                          ? "text-success-600" 
                          : "text-error-600"
                      }`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900" data-testid={`movement-item-${movement.id}`}>
                        {movement.item?.name}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Código: {movement.item?.internalCode}</span>
                        <span>Por: {movement.user?.name}</span>
                        <span>{formatTimestamp(movement.createdAt)}</span>
                      </div>
                      {movement.destination && (
                        <p className="text-sm text-gray-500">
                          Destino: {movement.destination}
                        </p>
                      )}
                      {movement.observation && (
                        <p className="text-sm text-gray-500">
                          Obs: {movement.observation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={getMovementTypeColor(movement.type)}
                      data-testid={`movement-type-${movement.id}`}
                    >
                      {getMovementTypeLabel(movement.type)}
                    </Badge>
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">{movement.quantity}</span> unidade(s)
                    </div>
                    <div className="text-xs text-gray-400">
                      {movement.previousStock} → {movement.newStock}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MovementModal
        open={showMovementModal}
        onOpenChange={setShowMovementModal}
        item={selectedItem}
      />
    </MainLayout>
  );
}
