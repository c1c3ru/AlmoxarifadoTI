import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { AddItemModal } from "@/components/modals/add-item-modal";
import { EditItemModal } from "@/components/modals/edit-item-modal";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import { ThermalQRPrinter } from "@/components/thermal-qr-printer";
import { MovementModal } from "@/components/modals/movement-modal";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { CSVImportExport } from "@/components/csv-import-export";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { canDeleteItems } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { ItemWithCategory } from "@shared/schema";

export default function Items() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showThermalPrinter, setShowThermalPrinter] = useState(false);
  const [movementTypePreset, setMovementTypePreset] = useState<"entrada" | "saida" | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/items"],
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/items/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: "Item excluído",
        description: "O item foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleShowQR = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowQRModal(true);
  };

  const handleMovement = (item: ItemWithCategory, type: "entrada" | "saida") => {
    setSelectedItem(item);
    setMovementTypePreset(type);
    setShowMovementModal(true);
  };

  const handleDelete = (item: ItemWithCategory) => {
    if (confirm(`Tem certeza que deseja excluir o item "${item.name}"?`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponivel":
        return "bg-emerald-100 text-emerald-800";
      case "em-uso":
        return "bg-blue-100 text-blue-800";
      case "manutencao":
        return "bg-amber-100 text-amber-800";
      case "descartado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      title="Gerenciar Itens"
      subtitle="Cadastro e controle de itens do almoxarifado"
      onAddItem={() => setShowAddModal(true)}
    >
      {/* Hero Section with CSV */}
      <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-lg mb-8">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-file-csv text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Gerenciar Inventário
                  </h3>
                  <p className="text-gray-600 font-medium">
                    Importe ou exporte itens em formato CSV para gerenciamento em lote
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <CSVImportExport />
            </div>
          </div>
          <div className="md:hidden mt-4 flex justify-center">
            <CSVImportExport />
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <Card className="bg-white border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-boxes-stacked text-white text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Itens Cadastrados</h3>
            </div>
            <div className="flex items-center space-x-3">
              {selectedItems.size > 0 && (
                <Button
                  onClick={() => setShowThermalPrinter(true)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg"
                  data-testid="button-thermal-print"
                >
                  <i className="fa-solid fa-print mr-2"></i>
                  Imprimir QR ({selectedItems.size})
                </Button>
              )}
              <Badge className="bg-blue-100 text-blue-800 font-semibold px-3 py-1">
                {items.length} itens
              </Badge>
            </div>
          </div>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === items.length && items.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(new Set(items.map(item => item.id)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <i className="fa-solid fa-cube text-blue-500"></i>
                      <span>Item</span>
                    </div>
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <i className="fa-solid fa-barcode mr-2 text-green-500"></i>
                    Código
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <i className="fa-solid fa-tags mr-2 text-purple-500"></i>
                    Categoria
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <i className="fa-solid fa-warehouse mr-2 text-orange-500"></i>
                    Estoque
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <i className="fa-solid fa-info-circle mr-2 text-blue-500"></i>
                    Status
                  </th>
                  <th className="px-2 py-3 sm:px-4 md:px-6 sm:py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <i className="fa-solid fa-qrcode mr-1 sm:mr-2 text-indigo-500"></i>
                    <span className="hidden sm:inline">QR Code</span>
                    <span className="sm:hidden">QR</span>
                  </th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <i className="fa-solid fa-cog mr-2 text-gray-500"></i>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-8 w-8" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-8 w-32" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                          <i className="fa-solid fa-inbox text-gray-400 text-3xl"></i>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhum item cadastrado</h4>
                          <p className="text-gray-500 mb-4">Clique em "Novo Item" para começar a gerenciar seu inventário</p>
                          <Button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                          >
                            <i className="fa-solid fa-plus mr-2"></i>
                            Adicionar Primeiro Item
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group"
                      data-testid={`item-row-${item.id}`}
                    >
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems);
                              if (e.target.checked) {
                                newSelected.add(item.id);
                              } else {
                                newSelected.delete(item.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                            <i className={`${item.category?.icon || 'fa-solid fa-cube'} text-blue-600 text-lg`}></i>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate max-w-[160px] sm:max-w-[240px] md:max-w-none" data-testid={`item-name-${item.id}`}>
                              {item.name}
                            </p>
                            {item.serialNumber && (
                              <p className="text-sm text-gray-500 flex items-center mt-1 truncate max-w-[200px] sm:max-w-[260px] md:max-w-none">
                                <i className="fa-solid fa-hashtag mr-1 text-xs"></i>
                                {item.serialNumber}
                              </p>
                            )}
                            {item.location && (
                              <p className="text-xs text-gray-400 flex items-center mt-1 truncate max-w-[200px] sm:max-w-[260px] md:max-w-none">
                                <i className="fa-solid fa-location-dot mr-1"></i>
                                {item.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4">
                        <div className="bg-gray-50 px-3 py-1 rounded-lg border font-mono text-sm text-gray-900" data-testid={`item-code-${item.id}`}>
                          {item.internalCode}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4">
                        <Badge
                          className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-200 font-medium"
                          data-testid={`item-category-${item.id}`}
                        >
                          <i className={`${item.category?.icon || 'fa-solid fa-tag'} mr-2 text-xs`}></i>
                          {item.category?.name}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4" data-testid={`item-stock-${item.id}`}>
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-lg font-bold text-lg ${
                            item.currentStock <= item.minStock 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.currentStock}
                          </div>
                          <div className="text-xs text-gray-500">
                            <div>de {item.minStock} mín</div>
                            {item.currentStock <= item.minStock && (
                              <div className="text-red-500 font-medium flex items-center">
                                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                Baixo!
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4">
                        <Badge
                          className={`${getStatusColor(item.status)} font-medium flex items-center w-fit`}
                          data-testid={`item-status-${item.id}`}
                        >
                          <i className={`${getStatusIcon(item.status)} mr-2 text-xs`}></i>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 sm:px-4 md:px-6 sm:py-4">
                        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                          <div className="p-0.5 sm:p-1 bg-white rounded-lg shadow-sm border">
                            <QRCodeGenerator 
                              value={`ITEM:${item.id}:${item.internalCode}`}
                              size={24}
                              className="cursor-pointer hover:scale-110 transition-transform sm:hidden"
                            />
                            <QRCodeGenerator 
                              value={`ITEM:${item.id}:${item.internalCode}`}
                              size={32}
                              className="cursor-pointer hover:scale-110 transition-transform hidden sm:block"
                            />
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShowQR(item)}
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 w-6 h-6 sm:w-8 sm:h-8 p-0"
                                  data-testid={`button-qr-modal-${item.id}`}
                                  aria-label="Ver QR em tamanho maior"
                                >
                                  <i className="fa-solid fa-expand text-xs"></i>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ampliar QR Code</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* QR Code button for mobile/tablet screens */}
                          <div className="lg:hidden">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleShowQR(item)}
                                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
                                    data-testid={`button-qr-mobile-${item.id}`}
                                    aria-label="Ver QR Code"
                                  >
                                    <i className="fa-solid fa-qrcode text-sm"></i>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver QR Code</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleEdit(item)}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm"
                                  data-testid={`button-edit-${item.id}`}
                                  aria-label="Editar item"
                                >
                                  <i className="fa-solid fa-edit mr-2 text-sm"></i>
                                  Editar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar item</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleMovement(item, "entrada")}
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
                                  data-testid={`button-entrada-${item.id}`}
                                  aria-label="Registrar entrada"
                                >
                                  <i className="fa-solid fa-arrow-down mr-2 text-sm"></i>
                                  Entrada
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Registrar entrada (adicionar ao estoque)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleMovement(item, "saida")}
                                  className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-sm"
                                  data-testid={`button-saida-${item.id}`}
                                  aria-label="Registrar saída"
                                >
                                  <i className="fa-solid fa-arrow-up mr-2 text-sm"></i>
                                  Saída
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Registrar saída (retirar do estoque)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {canDeleteItems(user) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(item)}
                                    disabled={deleteItemMutation.isPending}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                                    data-testid={`button-delete-${item.id}`}
                                    aria-label="Excluir item"
                                  >
                                    {deleteItemMutation.isPending ? (
                                      <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                                    ) : (
                                      <i className="fa-solid fa-trash text-sm"></i>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir item</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <EditItemModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        item={selectedItem}
      />

      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        item={selectedItem}
      />

      <MovementModal
        open={showMovementModal}
        onOpenChange={(open) => {
          setShowMovementModal(open);
          if (!open) setMovementTypePreset(null);
        }}
        item={selectedItem}
        initialType={movementTypePreset || undefined}
      />

      <ThermalQRPrinter
        open={showThermalPrinter}
        onOpenChange={setShowThermalPrinter}
        items={items.filter(item => selectedItems.has(item.id))}
      />
    </MainLayout>
  );
}