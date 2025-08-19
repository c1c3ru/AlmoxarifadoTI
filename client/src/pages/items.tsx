import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { AddItemModal } from "@/components/modals/add-item-modal";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import { MovementModal } from "@/components/modals/movement-modal";
import { CSVImportExport } from "@/components/csv-import-export";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { canDeleteItems } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { ItemWithCategory } from "@shared/schema";

export default function Items() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);
  
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

  const handleShowQR = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowQRModal(true);
  };

  const handleMovement = (item: ItemWithCategory) => {
    setSelectedItem(item);
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
        return "bg-success-100 text-success-800";
      case "em-uso":
        return "bg-blue-100 text-blue-800";
      case "manutencao":
        return "bg-warning-100 text-warning-800";
      case "descartado":
        return "bg-error-100 text-error-800";
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

  return (
    <MainLayout
      title="Gerenciar Itens"
      subtitle="Cadastro e controle de itens do almoxarifado"
      onAddItem={() => setShowAddModal(true)}
    >
      {/* CSV Import/Export Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Gerenciar Inventário</h3>
          <CSVImportExport />
        </div>
        <p className="text-sm text-gray-600">
          Exporte todos os itens em formato CSV ou importe itens em lote para acelerar o cadastro do inventário.
        </p>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-12 w-full" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-8 w-8" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-8 w-16" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <i className="fas fa-inbox text-4xl mb-4"></i>
                      <p>Nenhum item cadastrado</p>
                      <p className="text-sm mt-2">Clique em "Novo Item" para começar</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                      data-testid={`item-row-${item.id}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900" data-testid={`item-name-${item.id}`}>
                            {item.name}
                          </p>
                          {item.serialNumber && (
                            <p className="text-sm text-gray-500">
                              SN: {item.serialNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900" data-testid={`item-code-${item.id}`}>
                        {item.internalCode}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className="bg-primary-100 text-primary-800"
                          data-testid={`item-category-${item.id}`}
                        >
                          {item.category?.name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4" data-testid={`item-stock-${item.id}`}>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-gray-500">
                            / {item.minStock} min
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={getStatusColor(item.status)}
                          data-testid={`item-status-${item.id}`}
                        >
                          {getStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowQR(item)}
                          className="text-primary-600 hover:text-primary-700"
                          data-testid={`button-qr-${item.id}`}
                        >
                          <i className="fas fa-qrcode text-lg"></i>
                        </Button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMovement(item)}
                            className="text-gray-600 hover:text-primary-600"
                            data-testid={`button-movement-${item.id}`}
                          >
                            <i className="fas fa-exchange-alt"></i>
                          </Button>
                          {canDeleteItems(user) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              disabled={deleteItemMutation.isPending}
                              className="text-gray-600 hover:text-error-600"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
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

      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        item={selectedItem}
      />

      <MovementModal
        open={showMovementModal}
        onOpenChange={setShowMovementModal}
        item={selectedItem}
      />
    </MainLayout>
  );
}
