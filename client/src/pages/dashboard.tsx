import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import type { ItemWithCategory, MovementWithDetails } from "@shared/schema";

interface DashboardStats {
  totalItems: number;
  lowStock: number;
  todayMovements: number;
  activeUsers: number;
}

interface OnlineUser {
  id: string;
  username: string;
  role: string;
  lastSeenAt: string | Date;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    // Atualiza periodicamente para refletir usuários online
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery<ItemWithCategory[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const { data: recentMovements = [], isLoading: movementsLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ["/api/dashboard/recent-movements"],
    enabled: isAdmin, // Only load movements for admins
  });

  const { data: categories = [] } = useQuery<(any & { itemCount: number })[]>({
    queryKey: ["/api/categories/with-counts"],
  });

  const { data: onlineUsers = [], isLoading: onlineLoading } = useQuery<OnlineUser[]>({
    queryKey: ["/api/users/online"],
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
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
      subtitle="Visão geral completa do almoxarifado"
      showAddButton={false}
    >
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total de Itens</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-blue-900" data-testid="stat-total-items">
                    {stats?.totalItems || 0}
                  </p>
                )}
              </div>
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-boxes-stacked text-white text-xl"></i>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -mb-10 -mr-10"></div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 mb-1">Estoque Baixo</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-amber-900" data-testid="stat-low-stock">
                    {stats?.lowStock || 0}
                  </p>
                )}
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                  <span className="text-xs text-amber-600">Requer atenção</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-triangle-exclamation text-white text-xl"></i>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -mb-10 -mr-10"></div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 mb-1">Movimentações Hoje</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-emerald-900" data-testid="stat-today-movements">
                    {stats?.todayMovements || 0}
                  </p>
                )}
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs text-emerald-600">Ativo</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-arrows-rotate text-white text-xl"></i>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-emerald-200/30 rounded-full -mb-10 -mr-10"></div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600 mb-1">Usuários Ativos</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-violet-900" data-testid="stat-active-users">
                    {stats?.activeUsers || 0}
                  </p>
                )}
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-violet-600">Online</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-users text-white text-xl"></i>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-violet-200/30 rounded-full -mb-10 -mr-10"></div>
          </CardContent>
        </Card>

        {/* Online Users */}
        <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-signal text-white text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Usuários Online</h3>
            </div>
            <div className="space-y-3">
              {onlineLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 rounded-xl">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              ) : onlineUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum usuário online no momento
                </div>
              ) : (
                onlineUsers.slice(0, 8).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold flex-shrink-0">
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{u.username}</p>
                        <p className="text-xs text-gray-500">{u.role}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex-shrink-0 max-w-xs">
                      <p className="truncate">{formatTimestamp(u.lastSeenAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Critical Alerts Section */}
      {lowStockItems.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-l-4 border-red-400 shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <i className="fa-solid fa-bell text-white text-lg"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-800">Alertas Críticos de Estoque</h3>
                <p className="text-red-600">Itens com estoque abaixo do mínimo recomendado</p>
              </div>
            </div>
            <div className="grid gap-4">
              {lowStockLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-200 hover:border-red-300 transition-all duration-200 hover:shadow-md"
                    data-testid={`alert-item-${item.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                        <i className={`${item.category?.icon || 'fa-solid fa-box'} text-red-600 text-lg`}></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">Código: {item.internalCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="destructive" className="font-medium">
                          {item.currentStock} unidades
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">Mínimo: {item.minStock}</p>
                      <Progress 
                        value={(item.currentStock / item.minStock) * 100} 
                        className="w-20 h-2 mt-1"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Activities - Only for Admins */}
        {isAdmin && (
          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-clock-rotate-left text-white text-sm"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Atividades Recentes - Todos os Usuários</h3>
              </div>
              
              <div className="space-y-4">
                {movementsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 rounded-xl">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : recentMovements.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fa-solid fa-inbox text-gray-400 text-xl"></i>
                    </div>
                    <p className="text-gray-500 font-medium">Nenhuma movimentação recente</p>
                    <p className="text-sm text-gray-400">As atividades aparecerão aqui</p>
                  </div>
                ) : (
                  recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                      data-testid={`movement-${movement.id}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                        movement.type === "entrada" 
                          ? "bg-gradient-to-br from-emerald-400 to-emerald-500" 
                          : "bg-gradient-to-br from-red-400 to-red-500"
                      }`}>
                        <i className={`fa-solid ${
                          movement.type === "entrada" 
                            ? "fa-arrow-down text-white" 
                            : "fa-arrow-up text-white"
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{movement.item?.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span className="font-medium">
                            {movement.type === "entrada" ? "+" : "-"}{movement.quantity}
                          </span>
                          {movement.destination && (
                            <>
                              <span>•</span>
                              <span className="truncate">{movement.destination}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(movement.createdAt)} • {movement.user?.name || movement.user?.username}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories Overview */}
        <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-tags text-white text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Categorias</h3>
            </div>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-tags text-gray-400 text-xl"></i>
                  </div>
                  <p className="text-gray-500 font-medium">Nenhuma categoria cadastrada</p>
                  <p className="text-sm text-gray-400">Organize seus itens em categorias</p>
                </div>
              ) : (
                categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group border border-gray-100 hover:border-gray-200"
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                        ['bg-gradient-to-br from-blue-400 to-blue-500',
                         'bg-gradient-to-br from-green-400 to-green-500', 
                         'bg-gradient-to-br from-purple-400 to-purple-500',
                         'bg-gradient-to-br from-orange-400 to-orange-500',
                         'bg-gradient-to-br from-pink-400 to-pink-500'][index % 5]
                      }`}>
                        <i className={`${category.icon} text-white text-sm`}></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-gray-500 truncate max-w-48">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-medium">
                        {category.itemCount || 0} {category.itemCount === 1 ? 'item' : 'itens'}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        Criado em {new Date(category.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
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