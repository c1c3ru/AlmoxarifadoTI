import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { EditItemModal } from "@/components/modals/edit-item-modal";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import { MovementModal } from "@/components/modals/movement-modal";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ItemWithCategory, Category } from "@shared/schema";

export default function Search() {
  const ALL = "ALL";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 100);

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
    queryKey: ["/api/items/search", debouncedQuery, categoryParam, statusParam],
    queryFn: async () => {
      if (!hasFilters) return [];
      
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (categoryParam) params.append('category', categoryParam);
      if (statusParam) params.append('status', statusParam);
      
      const url = `/api/items/search?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha na pesquisa');
      const data = await response.json();
      return data;
    },
    enabled: hasFilters,
  });

  const handleEdit = (item: ItemWithCategory) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

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
      title="Pesquisar Itens"
      subtitle="Busque itens por código, nome, categoria ou status"
      showAddButton={false}
    >
      {/* Search Hero */}
      <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-lg mb-8">
        <CardContent className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-search text-white text-2xl"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Busca Avançada de Itens
              </h3>
              <p className="text-gray-600 font-medium">
                Use filtros avançados para encontrar exatamente o que procura
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fa-solid fa-search text-gray-400 text-lg"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Pesquisar por código, nome, categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-4 h-14 text-lg border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-blue-400" data-testid="select-category-filter">
                <div className="flex items-center space-x-2">
                  <i className="fa-solid fa-tags text-purple-500"></i>
                  <SelectValue placeholder="Todas as Categorias" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as Categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <i className={`${category.icon} text-purple-500`}></i>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-blue-400" data-testid="select-status-filter">
                <div className="flex items-center space-x-2">
                  <i className="fa-solid fa-info-circle text-blue-500"></i>
                  <SelectValue placeholder="Todos os Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os Status</SelectItem>
                <SelectItem value="disponivel">
                  <div className="flex items-center space-x-2">
                    <i className="fa-solid fa-circle-check text-emerald-500"></i>
                    <span>Disponível</span>
                  </div>
                </SelectItem>
                <SelectItem value="em-uso">
                  <div className="flex items-center space-x-2">
                    <i className="fa-solid fa-clock text-blue-500"></i>
                    <span>Em Uso</span>
                  </div>
                </SelectItem>
                <SelectItem value="manutencao">
                  <div className="flex items-center space-x-2">
                    <i className="fa-solid fa-wrench text-amber-500"></i>
                    <span>Em Manutenção</span>
                  </div>
                </SelectItem>
                <SelectItem value="descartado">
                  <div className="flex items-center space-x-2">
                    <i className="fa-solid fa-trash text-red-500"></i>
                    <span>Descartado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchResults.length === 0 && hasFilters ? (
        <Card className="bg-white border-0 shadow-xl">
          <CardContent className="p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-search text-gray-400 text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhum item encontrado</h3>
            <p className="text-gray-500 mb-6">Tente ajustar os filtros de pesquisa ou use termos diferentes</p>
            <Button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(ALL);
                setSelectedStatus(ALL);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <i className="fa-solid fa-refresh mr-2"></i>
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      ) : searchResults.length === 0 ? (
        <Card className="bg-white border-0 shadow-xl">
          <CardContent className="p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-search text-blue-500 text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Pronto para Pesquisar</h3>
            <p className="text-gray-500">Digite algo no campo de pesquisa ou selecione filtros para encontrar itens</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 text-gray-600">
            <i className="fa-solid fa-search text-blue-500"></i>
            <span className="font-medium">
              Encontrados <strong className="text-blue-600">{searchResults.length}</strong> resultado(s)
              {debouncedQuery && (
                <> para "<strong className="text-gray-900">{debouncedQuery}</strong>"</>
              )}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {searchResults.map((item) => (
              <Card key={item.id} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col" data-testid={`search-item-${item.id}`}>
                <CardContent className="p-4 sm:p-6 flex flex-col h-full">
                  {/* Cabeçalho com título e ícone */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                      <i className={`${item.category?.icon || 'fa-solid fa-cube'} text-blue-600 text-sm sm:text-base`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1 group-hover:text-blue-700 transition-colors leading-tight" data-testid={`search-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700 inline-block" data-testid={`search-item-code-${item.id}`}>
                        {item.internalCode}
                      </div>
                    </div>
                  </div>
                  
                  {/* QR Code compacto */}
                  <div className="flex justify-center mb-3 py-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-white rounded shadow-sm border">
                        <QRCodeGenerator 
                          value={`ITEM:${item.id}:${item.internalCode}`}
                          size={32}
                          className="cursor-pointer hover:scale-110 transition-transform"
                        />
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowQR(item)}
                              className="w-6 h-6 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              data-testid={`button-qr-modal-${item.id}`}
                              aria-label="Ampliar QR Code"
                            >
                              <i className="fa-solid fa-expand text-xs"></i>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ampliar QR Code</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {/* Informações do item - layout flex crescente */}
                  <div className="flex-1 space-y-2 mb-3">
                    {/* Categoria */}
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-tags text-purple-500 text-xs"></i>
                      <span className="text-xs text-gray-600 font-medium">Categoria:</span>
                      <Badge className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-200 font-medium text-xs ml-auto">
                        <i className={`${item.category?.icon || 'fa-solid fa-tag'} mr-1 text-xs`}></i>
                        {item.category?.name}
                      </Badge>
                    </div>
                    
                    {/* Estoque */}
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-warehouse text-green-500 text-xs"></i>
                      <span className="text-xs text-gray-600 font-medium">Estoque:</span>
                      <div className={`px-2 py-1 rounded font-bold text-xs ml-auto ${
                        item.currentStock <= item.minStock 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.currentStock} un
                      </div>
                    </div>
                    
                    {/* Localização */}
                    {item.location && (
                      <div className="flex items-start gap-2">
                        <i className="fa-solid fa-location-dot text-orange-500 text-xs mt-0.5"></i>
                        <span className="text-xs text-gray-600 font-medium">Local:</span>
                        <span className="font-medium text-gray-900 text-xs text-right ml-auto leading-tight">
                          {item.location}
                        </span>
                      </div>
                    )}
                    
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-info-circle text-blue-500 text-xs"></i>
                      <span className="text-xs text-gray-600 font-medium">Status:</span>
                      <Badge
                        className={`${getStatusColor(item.status)} font-medium border px-2 py-1 text-xs ml-auto`}
                        data-testid={`search-item-status-${item.id}`}
                      >
                        <i className={`${getStatusIcon(item.status)} mr-1 text-xs`}></i>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 pt-3 border-t border-gray-100 mt-auto">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => handleEdit(item)}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-sm text-sm"
                            data-testid={`button-edit-${item.id}`}
                            aria-label="Editar item"
                          >
                            <i className="fa-solid fa-edit mr-2 text-sm"></i>
                            <span className="hidden sm:inline">Editar</span>
                            <span className="sm:hidden">Editar Item</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar item</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => handleMovement(item)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-sm text-sm"
                            data-testid={`button-movement-${item.id}`}
                            aria-label="Registrar movimentação"
                          >
                            <i className="fa-solid fa-arrows-rotate mr-2 text-sm"></i>
                            <span className="hidden sm:inline">Mover</span>
                            <span className="sm:hidden">Movimentação</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Registrar movimentação</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowQR(item)}
                            className="sm:px-3 px-4 py-2 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 sm:flex-none flex-1"
                            data-testid={`button-view-${item.id}`}
                            aria-label="Ver detalhes"
                          >
                            <i className="fa-solid fa-eye text-gray-600 sm:mr-0 mr-2"></i>
                            <span className="sm:hidden">Ver Detalhes</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalhes</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
        onOpenChange={setShowMovementModal}
        item={selectedItem}
      />
    </MainLayout>
  );
}