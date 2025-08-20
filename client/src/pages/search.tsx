import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import { MovementModal } from "@/components/modals/movement-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemWithCategory, Category } from "@shared/schema";

export default function Search() {
  const ALL = "ALL";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    select: (data) => data.filter((c) => !!c && typeof c.id === 'string' && c.id.trim().length > 0),
  });

  const categoryParam = selectedCategory === ALL ? undefined : selectedCategory;
  const statusParam = selectedStatus === ALL ? undefined : selectedStatus;
  const hasFilters = Boolean(debouncedQuery || categoryParam || statusParam);
  const { data: searchResults = [], isLoading } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/items/search", { q: debouncedQuery, category: categoryParam, status: statusParam }],
    enabled: hasFilters,
  });

  const handleShowQR = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowQRModal(true);
  };

  const handleMovement = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowMovementModal(true);
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
      title="Pesquisar Itens"
      subtitle="Busque itens por código, nome ou categoria"
      showAddButton={false}
    >
      <Card className="border border-gray-200 mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pesquisar Itens</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="Pesquisar por código, nome ou categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
                <SelectValue placeholder="Todas as Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as Categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
            >
              <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os Status</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="em-uso">Em Uso</SelectItem>
                <SelectItem value="manutencao">Em Manutenção</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-gray-200">
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchResults.length === 0 && hasFilters ? (
        <Card className="border border-gray-200">
          <CardContent className="p-12 text-center">
            <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum item encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros de pesquisa</p>
          </CardContent>
        </Card>
      ) : searchResults.length === 0 ? (
        <Card className="border border-gray-200">
          <CardContent className="p-12 text-center">
            <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pesquisar Itens</h3>
            <p className="text-gray-500">Digite algo no campo de pesquisa para encontrar itens</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((item) => (
            <Card
              key={item.id}
              className="border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              data-testid={`search-result-${item.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <i className={`${item.category?.icon || 'fas fa-box'} text-primary-600 text-lg`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900" data-testid={`search-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-500" data-testid={`search-item-code-${item.id}`}>
                        {item.internalCode}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShowQR(item)}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                    data-testid={`button-qr-${item.id}`}
                  >
                    <i className="fas fa-qrcode"></i>
                  </Button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Categoria:</span>
                    <span className="font-medium text-gray-900">{item.category?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estoque:</span>
                    <span className="font-medium text-gray-900">
                      {item.currentStock} unidades
                    </span>
                  </div>
                  {item.location && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Localização:</span>
                      <span className="font-medium text-gray-900">{item.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">Status:</span>
                    <Badge
                      className={getStatusColor(item.status)}
                      data-testid={`search-item-status-${item.id}`}
                    >
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleMovement(item)}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm"
                    data-testid={`button-movement-${item.id}`}
                  >
                    <i className="fas fa-exchange-alt mr-2"></i>
                    Movimentar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowQR(item)}
                    data-testid={`button-view-${item.id}`}
                  >
                    <i className="fas fa-eye"></i>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
