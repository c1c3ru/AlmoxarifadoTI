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
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-card hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 to-transparent opacity-50" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total de Itens</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground" data-testid="stat-total-items">
                    {stats?.totalItems || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-chart-1/20 text-chart-1 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-boxes-stacked text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-card hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-2/10 to-transparent opacity-50" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Estoque Baixo</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground" data-testid="stat-low-stock">
                    {stats?.lowStock || 0}
                  </p>
                )}
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-chart-2 rounded-full mr-2"></div>
                  <span className="text-xs text-muted-foreground">Requer atenção</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-chart-2/20 text-chart-2 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-triangle-exclamation text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-card hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-3/10 to-transparent opacity-50" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Movimentações Hoje</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground" data-testid="stat-today-movements">
                    {stats?.todayMovements || 0}
                  </p>
                )}
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-chart-3 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Ativo</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-chart-3/20 text-chart-3 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-arrows-rotate text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-card hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-4/10 to-transparent opacity-50" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Usuários Ativos</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground" data-testid="stat-active-users">
                    {stats?.activeUsers || 0}
                  </p>
                )}
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-success-600 rounded-full mr-2"></div>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-chart-4/20 text-chart-4 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-users text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Online Users */}
        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-signal text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-foreground">Usuários Online</h3>
            </div>
            <div className="space-y-3">
              {onlineLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-2 rounded-xl">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              ) : onlineUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário online no momento
                </div>
              ) : (
                onlineUsers.slice(0, 8).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-all duration-200 gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.role}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex-shrink-0 max-w-xs">
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
        <Card className="bg-destructive/5 border-l-4 border-destructive shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center animate-pulse">
                <i className="fa-solid fa-bell text-lg"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Alertas Críticos de Estoque</h3>
                <p className="text-destructive font-medium">Itens com estoque abaixo do mínimo recomendado</p>
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
                    className="flex items-center justify-between p-4 bg-card rounded-xl border border-destructive/20 hover:border-destructive/40 transition-all duration-200 hover:shadow-md"
                    data-testid={`alert-item-${item.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                        <i className={`${item.category?.icon || 'fa-solid fa-box'} text-destructive text-lg`}></i>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Código: {item.internalCode}</p>
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
          <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                </div>
                <h3 className="text-xl font-bold text-foreground">Atividades Recentes - Todos os Usuários</h3>
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
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fa-solid fa-inbox text-muted-foreground text-xl"></i>
                    </div>
                    <p className="text-muted-foreground font-medium">Nenhuma movimentação recente</p>
                    <p className="text-sm text-muted-foreground/60">As atividades aparecerão aqui</p>
                  </div>
                ) : (
                  recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center space-x-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group"
                      data-testid={`movement-${movement.id}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${movement.type === "entrada"
                          ? "bg-success-100 text-success-700"
                          : "bg-error-100 text-error-700"
                        }`}>
                        <i className={`fa-solid ${movement.type === "entrada"
                            ? "fa-arrow-down"
                            : "fa-arrow-up"
                          }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{movement.item?.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className={movement.type === "entrada" ? "text-success-700 font-bold" : "text-error-700 font-bold"}>
                            {movement.type === "entrada" ? "+" : "-"}{movement.quantity}
                          </span>
                          {movement.destination && (
                            <>
                              <span>•</span>
                              <span className="truncate">{movement.destination}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/80 mt-1">
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
        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-tags text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-foreground">Categorias</h3>
            </div>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-tags text-muted-foreground text-xl"></i>
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhuma categoria cadastrada</p>
                  <p className="text-sm text-muted-foreground/60">Organize seus itens em categorias</p>
                </div>
              ) : (
                categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-all duration-200 group border border-dashed border-border hover:border-solid hover:border-primary/20"
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm text-white ${['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'][index % 5]
                        }`}>
                        <i className={`${category.icon} text-sm`}></i>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-48">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-medium">
                        {category.itemCount || 0} {category.itemCount === 1 ? 'item' : 'itens'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
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