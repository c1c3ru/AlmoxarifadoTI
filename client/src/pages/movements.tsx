import { useState } from "react";
import { buildApiUrl } from "@/lib/url";
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
  const ALL = "ALL";
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);
  const [selectedItemFilter, setSelectedItemFilter] = useState(ALL);
  const [movementType, setMovementType] = useState<"entrada" | "saida" | null>(null);

  const { data: items = [] } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/items"],
  });

  const itemIdParam = selectedItemFilter === ALL ? undefined : selectedItemFilter;
  const { data: movements = [], isLoading, isError, error } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/movements", { itemId: itemIdParam, limit: 100 }],
    // Garante atualização ao entrar na página mesmo com staleTime global infinito
    refetchOnMount: "always",
  });

  const normalizeIcon = (icon?: string, fallback: string = 'fa-solid fa-box') => {
    if (!icon || typeof icon !== 'string' || icon.trim().length === 0) return fallback;
    const v = icon.trim();
    // Se já vier completo (ex.: "fa-solid fa-laptop"), usa direto
    if (v.startsWith('fa-')) return `fa-solid ${v}`;
    if (v.startsWith('fa ')) return `fa-solid ${v.slice(3)}`;
    if (v.startsWith('fa-solid') || v.startsWith('fa-regular') || v.startsWith('fa-brands')) return v;
    // Se vier só o nome (ex.: "fa-laptop" sem estilo) ou "laptop", normaliza com fa-solid
    return v.includes('fa-') ? `fa-solid ${v}` : `fa-solid fa-${v}`;
  };

  // Itens recentes com base nas movimentações (únicos por itemId)
  const recentItems = (() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name?: string; internalCode?: string; icon?: string } > = [];
    for (const mv of movements) {
      const id = mv.itemId as string;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        name: mv.item?.name,
        internalCode: mv.item?.internalCode,
        icon: mv.category?.icon,
      });
      if (result.length >= 10) break;
    }
    return result;
  })();

  const handleNewMovement = (type: "entrada" | "saida", item?: ItemWithCategory) => {
    setMovementType(type);
    setSelectedItem(item || null);
    setShowMovementModal(true);
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Há menos de 1 hora";
    if (diffInHours === 1) return "Há 1 hora";
    return `Há ${diffInHours} horas`;
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

  return (
    <MainLayout
      title="Movimentações"
      subtitle="Gerencie entradas e saídas de itens do almoxarifado"
      showAddButton={false}
    >
      {/* Quick Actions Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer" 
              onClick={() => handleNewMovement("entrada")}>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-arrow-down text-white text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-emerald-900 mb-2">Registrar Entrada</h3>
            <p className="text-emerald-700 mb-6">Adicionar itens ao estoque do almoxarifado</p>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg h-12 text-base font-semibold"
              data-testid="button-register-entry"
              onClick={(e) => { e.stopPropagation(); handleNewMovement("entrada"); }}
            >
              <i className="fa-solid fa-plus mr-2"></i>
              Nova Entrada
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => handleNewMovement("saida")}>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-arrow-up text-white text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Registrar Saída</h3>
            <p className="text-red-700 mb-6">Retirar itens do estoque para uso</p>
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 shadow-lg h-12 text-base font-semibold"
              data-testid="button-register-exit"
              onClick={(e) => { e.stopPropagation(); handleNewMovement("saida"); }}
            >
              <i className="fa-solid fa-minus mr-2"></i>
              Nova Saída
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => window.location.href = '/scanner'}>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-qrcode text-white text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">Scanner QR</h3>
            <p className="text-blue-700 mb-6">Dar baixa rápida via QR Code</p>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg h-12 text-base font-semibold"
              data-testid="button-go-scanner"
            >
              <i className="fa-solid fa-camera mr-2"></i>
              Abrir Scanner
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card className="bg-white border-0 shadow-xl">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-clock-rotate-left text-white text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Movimentações Recentes</h3>
            </div>
            <div className="w-full lg:w-64">
              <Select value={selectedItemFilter} onValueChange={setSelectedItemFilter}>
                <SelectTrigger data-testid="select-item-filter">
                  <SelectValue placeholder="Filtrar por item" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs text-gray-500">Filtro</div>
                  <SelectItem value={ALL}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                        <i className="fa-solid fa-list text-gray-600 text-xs"></i>
                      </div>
                      <span>Todos os itens</span>
                    </div>
                  </SelectItem>

                  {recentItems.length > 0 && (
                    <div className="px-2 py-1 text-xs text-gray-500 mt-2">Recentes</div>
                  )}
                  {recentItems.map((it) => (
                    <SelectItem key={`recent-${it.id}`} value={it.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                          <i className={`${normalizeIcon(it.icon)} text-blue-600 text-xs`}></i>
                        </div>
                        <span className="truncate">{it.name} ({it.internalCode})</span>
                      </div>
                    </SelectItem>
                  ))}

                  <div className="px-2 py-1 text-xs text-gray-500 mt-2">Todos</div>
                  {items
                    .filter((item) => typeof item.id === 'string' && item.id.trim().length > 0)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                            <i className={`${normalizeIcon(item.category?.icon)} text-gray-600 text-xs`}></i>
                          </div>
                          <span className="truncate">{item.name} ({item.internalCode})</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-xl">
                  <Skeleton className="w-16 h-16 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">Erro ao carregar movimentações.</p>
              <p className="text-sm text-gray-500 mt-1">{(error as any)?.message || "Tente novamente mais tarde."}</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-arrows-rotate text-gray-400 text-3xl"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Nenhuma movimentação encontrada</h4>
              <p className="text-gray-500 mb-6">
                {selectedItemFilter !== ALL ? "Nenhuma movimentação para o item selecionado" : "Registre a primeira movimentação do almoxarifado"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => handleNewMovement("entrada")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="button-first-entry"
                >
                  <i className="fa-solid fa-arrow-down mr-2"></i>
                  Nova Entrada
                </Button>
                <Button 
                  onClick={() => handleNewMovement("saida")}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-first-exit"
                >
                  <i className="fa-solid fa-arrow-up mr-2"></i>
                  Nova Saída
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:shadow-lg hover:border-blue-200 transition-all duration-300 group bg-gradient-to-r from-white to-gray-50"
                  data-testid={`movement-${movement.id}`}
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
                        <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center shrink-0">
                          <i className={`${normalizeIcon(movement.category?.icon)} text-blue-600 text-xs`}></i>
                        </div>
                        <p className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors" data-testid={`movement-item-${movement.id}`}>
                          {movement.item?.name}
                        </p>
                        <Badge 
                          className={`${getMovementTypeColor(movement.type)} font-medium border px-3 py-1`}
                          data-testid={`movement-type-${movement.id}`}
                        >
                          <i className={`${getMovementIcon(movement.type)} mr-2 text-xs`}></i>
                          {getMovementTypeLabel(movement.type)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <i className="fa-solid fa-barcode mr-2 text-blue-500"></i>
                          {movement.item?.internalCode}
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
                          {movement.previousStock} → {movement.newStock}
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
                          <strong>Obs:</strong> {movement.observation}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className={`text-3xl font-bold ${
                      movement.type === "entrada" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {movement.type === "entrada" ? "+" : "-"}{movement.quantity}
                    </div>
                    <div className="text-sm text-gray-500">unidade(s)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MovementModal
        open={showMovementModal}
        onOpenChange={(open) => {
          setShowMovementModal(open);
          if (!open) {
            setMovementType(null);
            setSelectedItem(null);
          }
        }}
        item={selectedItem}
        initialType={movementType || undefined}
      />
    </MainLayout>
  );
}