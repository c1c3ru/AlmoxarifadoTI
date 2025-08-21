import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { MovementWithDetails, ItemWithCategory } from "@shared/schema";

export default function History() {
  const ALL = "ALL";
  const [selectedItemFilter, setSelectedItemFilter] = useState(ALL);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(ALL);
  const [searchQuery, setSearchQuery] = useState("");

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
    if (searchQuery && !movement.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !movement.item?.internalCode.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !movement.user?.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString("pt-BR");
  };

  const getMovementTypeColor = (type: string) => {
    return type === "entrada" 
      ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
      : "bg-red-100 text-red-800 border-red-200";
  };

  const getMovementTypeLabel = (type: string) => {
    return type === "entrada" ? "Entrada" : "Saída";
  };

  const getMovementIcon = (type: string) => {
    return type === "entrada" ? "fa-solid fa-arrow-down" : "fa-solid fa-arrow-up";
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
      title="Histórico de Movimentações"
      subtitle="Log completo de todas as operações do almoxarifado"
      showAddButton={false}
    >
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total de Movimentações</p>
                <p className="text-3xl font-bold text-blue-900" data-testid="stat-total-movements">
                  {filteredMovements.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-arrows-rotate text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 mb-1">Entradas</p>
                <p className="text-3xl font-bold text-emerald-900" data-testid="stat-entries">
                  {totalEntries}
                </p>
                <p className="text-xs text-emerald-700 font-medium">{totalQuantityIn} unidades</p>
              </div>
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-arrow-down text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">Saídas</p>
                <p className="text-3xl font-bold text-red-900" data-testid="stat-exits">
                  {totalExits}
                </p>
                <p className="text-xs text-red-700 font-medium">{totalQuantityOut} unidades</p>
              </div>
              <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-arrow-up text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Saldo Líquido</p>
                <p className={`text-3xl font-bold ${
                  totalQuantityIn - totalQuantityOut >= 0 
                    ? "text-emerald-900" 
                    : "text-red-900"
                }`} data-testid="stat-net-balance">
                  {totalQuantityIn - totalQuantityOut >= 0 ? "+" : ""}{totalQuantityIn - totalQuantityOut}
                </p>
                <p className="text-xs text-purple-700 font-medium">unidades</p>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                totalQuantityIn - totalQuantityOut >= 0 ? "bg-emerald-500" : "bg-red-500"
              }`}>
                <i className="fa-solid fa-balance-scale text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History and Filters */}
      <Card className="bg-white border-0 shadow-xl">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-history text-white text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Histórico Detalhado</h3>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fa-solid fa-search text-gray-400"></i>
                </div>
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-48"
                />
              </div>
              
              <Select value={selectedItemFilter} onValueChange={setSelectedItemFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-item-filter">
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
                <SelectTrigger className="w-full sm:w-32" data-testid="select-type-filter">
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
        </div>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-xl">
                  <Skeleton className="w-14 h-14 rounded-xl" />
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
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-history text-gray-400 text-3xl"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Nenhuma movimentação encontrada</h4>
              <p className="text-gray-500">
                {selectedItemFilter !== ALL || selectedTypeFilter !== ALL || searchQuery
                  ? "Nenhuma movimentação corresponde aos filtros selecionados" 
                  : "Ainda não há movimentações registradas no sistema"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:shadow-lg hover:border-blue-200 transition-all duration-300 group bg-gradient-to-r from-white to-gray-50"
                  data-testid={`history-movement-${movement.id}`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                      movement.type === "entrada" 
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600" 
                        : "bg-gradient-to-br from-red-400 to-red-600"
                    }`}>
                      <i className={`${getMovementIcon(movement.type)} text-white text-xl`}></i>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors" data-testid={`history-item-${movement.id}`}>
                          {movement.item?.name}
                        </p>
                        <Badge 
                          className={`${getMovementTypeColor(movement.type)} font-medium border px-3 py-1`}
                          data-testid={`history-type-${movement.id}`}
                        >
                          <i className={`${getMovementIcon(movement.type)} mr-2 text-xs`}></i>
                          {getMovementTypeLabel(movement.type)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <i className="fa-solid fa-barcode mr-2 text-blue-500"></i>
                          {movement.item?.internalCode}
                        </span>
                        <span className="flex items-center">
                          <i className="fa-solid fa-cubes mr-2 text-green-500"></i>
                          <strong>{movement.quantity}</strong> unidades
                        </span>
                        <span className="flex items-center">
                          <i className="fa-solid fa-user mr-2 text-purple-500"></i>
                          {movement.user?.name}
                        </span>
                        <span className="flex items-center">
                          <i className="fa-solid fa-clock mr-2 text-orange-500"></i>
                          {formatTimestamp(movement.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        <span className="bg-gray-100 px-2 py-1 rounded-lg font-medium">
                          Estoque: {movement.previousStock} → {movement.newStock}
                        </span>
                      </div>
                      
                      {movement.destination && (
                        <p className="text-sm text-gray-700 mt-2 flex items-center">
                          <i className="fa-solid fa-location-dot mr-2 text-blue-500"></i>
                          <strong>Destino:</strong> {movement.destination}
                        </p>
                      )}
                      {movement.observation && (
                        <p className="text-sm text-gray-700 mt-2 flex items-center">
                          <i className="fa-solid fa-sticky-note mr-2 text-yellow-500"></i>
                          <strong>Observação:</strong> {movement.observation}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className={`text-2xl font-bold ${
                      movement.type === "entrada" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {movement.type === "entrada" ? "+" : "-"}{movement.quantity}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {movement.type === "entrada" ? "Adicionado" : "Removido"}
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