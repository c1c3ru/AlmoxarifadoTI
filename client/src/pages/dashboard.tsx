import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemWithCategory, MovementWithDetails } from "@shared/schema";

interface DashboardStats {
  totalItems: number;
  lowStock: number;
  todayMovements: number;
  activeUsers: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const { data: recentMovements = [], isLoading: movementsLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/dashboard/recent-movements"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Há menos de 1 hora";
    if (diffInHours === 1) return "Há 1 hora";
    return `Há ${diffInHours} horas`;
  };

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Visão geral do almoxarifado"
      showAddButton={false}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Itens</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-900" data-testid="stat-total-items">
                    {stats?.totalItems || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-boxes text-primary-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estoque Baixo</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-warning-600" data-testid="stat-low-stock">
                    {stats?.lowStock || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-warning-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Movimentações Hoje</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-success-600" data-testid="stat-today-movements">
                    {stats?.todayMovements || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-exchange-alt text-success-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Usuários Ativos</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-gray-900" data-testid="stat-active-users">
                    {stats?.activeUsers || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-gray-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {lowStockItems.length > 0 && (
        <Card className="border border-gray-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <i className="fas fa-exclamation-triangle text-warning-600"></i>
              <h3 className="text-lg font-semibold text-gray-900">Alertas de Estoque</h3>
            </div>
            <div className="space-y-3">
              {lowStockLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-warning-50 rounded-lg border border-warning-200"
                    data-testid={`alert-item-${item.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                        <i className={`${item.category?.icon || 'fas fa-box'} text-warning-600`}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">Código: {item.internalCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Estoque atual</p>
                      <p className="font-semibold text-warning-600">
                        {item.currentStock} unidades
                      </p>
                      <p className="text-xs text-gray-500">
                        Mínimo: {item.minStock}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Últimas Movimentações</h3>
            <div className="space-y-4">
              {movementsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : recentMovements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-inbox text-4xl mb-4"></i>
                  <p>Nenhuma movimentação recente</p>
                </div>
              ) : (
                recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`movement-${movement.id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      movement.type === "entrada" 
                        ? "bg-success-100" 
                        : "bg-error-100"
                    }`}>
                      <i className={`fas ${
                        movement.type === "entrada" 
                          ? "fa-arrow-down text-success-600" 
                          : "fa-arrow-up text-error-600"
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{movement.item?.name}</p>
                      <p className="text-sm text-gray-500">
                        {movement.type === "entrada" ? "Entrada" : "Saída"}: {movement.quantity} unidades
                        {movement.destination && ` para ${movement.destination}`}
                        {movement.user && ` por ${movement.user.name}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(movement.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories Overview */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Categorias</h3>
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-tags text-4xl mb-4"></i>
                  <p>Nenhuma categoria cadastrada</p>
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <i className={`${category.icon} text-primary-600 text-sm`}></i>
                      </div>
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {/* This would be calculated from items count in real implementation */}
                      0
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
