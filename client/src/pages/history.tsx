import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MovementWithDetails, ItemWithCategory } from "@shared/schema";

export default function History() {
  const ALL = "ALL";
  const [selectedItemFilter, setSelectedItemFilter] = useState(ALL);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(ALL);

  const { data: items = [] } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/items"],
  });

  const itemIdParam = selectedItemFilter === ALL ? undefined : selectedItemFilter;
  const { data: movements = [], isLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/movements", { itemId: itemIdParam, limit: 100 }],
  });

  const filteredMovements = movements.filter(movement => {
    const typeFilter = selectedTypeFilter === ALL ? undefined : selectedTypeFilter;
    if (typeFilter && movement.type !== typeFilter) return false;
    return true;
  });

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

  const totalEntries = filteredMovements.filter(m => m.type === "entrada").length;
  const totalExits = filteredMovements.filter(m => m.type === "saida").length;
  const totalQuantityIn = filteredMovements
    .filter(m => m.type === "entrada")
    .reduce((acc, m) => acc + m.quantity, 0);
  const totalQuantityOut = filteredMovements
    .filter(m => m.type === "saida")
    .reduce((acc, m) => acc + m.quantity, 0);

  return (
    <MainLayout
      title="Histórico"
      subtitle="Log completo de todas as movimentações do almoxarifado"
      showAddButton={false}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Movimentações</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="stat-total-movements">
                  {filteredMovements.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-exchange-alt text-primary-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Entradas</p>
                <p className="text-2xl font-semibold text-success-600" data-testid="stat-entries">
                  {totalEntries}
                </p>
                <p className="text-xs text-gray-500">{totalQuantityIn} unidades</p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-arrow-down text-success-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Saídas</p>
                <p className="text-2xl font-semibold text-error-600" data-testid="stat-exits">
                  {totalExits}
                </p>
                <p className="text-xs text-gray-500">{totalQuantityOut} unidades</p>
              </div>
              <div className="w-12 h-12 bg-error-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-arrow-up text-error-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Saldo Líquido</p>
                <p className={`text-2xl font-semibold ${
                  totalQuantityIn - totalQuantityOut >= 0 
                    ? "text-success-600" 
                    : "text-error-600"
                }`} data-testid="stat-net-balance">
                  {totalQuantityIn - totalQuantityOut}
                </p>
                <p className="text-xs text-gray-500">unidades</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-balance-scale text-gray-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and History */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Movimentações</h3>
            </div>
            <div className="flex gap-4">
              <Select value={selectedItemFilter} onValueChange={setSelectedItemFilter}>
                <SelectTrigger className="w-48" data-testid="select-item-filter">
                  <SelectValue placeholder="Filtrar por item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os itens</SelectItem>
                  {items
                    .filter((item) => typeof item.id === 'string' && item.id.trim().length > 0)
                    .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.internalCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="w-32" data-testid="select-type-filter">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-history text-4xl text-gray-400 mb-4"></i>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma movimentação encontrada</h4>
              <p className="text-gray-500">
                {selectedItemFilter || selectedTypeFilter 
                  ? "Nenhuma movimentação corresponde aos filtros selecionados" 
                  : "Ainda não há movimentações registradas"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`history-movement-${movement.id}`}
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
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-1">
                        <p className="font-medium text-gray-900" data-testid={`history-item-${movement.id}`}>
                          {movement.item?.name}
                        </p>
                        <Badge 
                          className={getMovementTypeColor(movement.type)}
                          data-testid={`history-type-${movement.id}`}
                        >
                          {getMovementTypeLabel(movement.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Código: {movement.item?.internalCode}</span>
                        <span>Quantidade: <strong>{movement.quantity}</strong></span>
                        <span>Por: {movement.user?.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span>Estoque: {movement.previousStock} → {movement.newStock}</span>
                        <span>{formatTimestamp(movement.createdAt)}</span>
                      </div>
                      {movement.destination && (
                        <p className="text-sm text-gray-600 mt-1">
                          <i className="fas fa-arrow-right mr-1"></i>
                          Destino: {movement.destination}
                        </p>
                      )}
                      {movement.observation && (
                        <p className="text-sm text-gray-600 mt-1">
                          <i className="fas fa-sticky-note mr-1"></i>
                          Obs: {movement.observation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
