import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { route: "/", label: "Dashboard", icon: "fas fa-chart-line" },
  { route: "/items", label: "Itens", icon: "fas fa-boxes" },
  { route: "/search", label: "Pesquisar", icon: "fas fa-search" },
  { route: "/movements", label: "Movimentações", icon: "fas fa-exchange-alt" },
  { route: "/scanner", label: "Scanner QR", icon: "fas fa-qrcode" },
  { route: "/history", label: "Histórico", icon: "fas fa-history" },
];

const adminItems = [
  { route: "/users", label: "Usuários", icon: "fas fa-users" },
  { route: "/categories", label: "Categorias", icon: "fas fa-tags" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActiveRoute = (route: string) => {
    if (route === "/") return location === "/";
    return location.startsWith(route);
  };

  return (
    <aside className="w-60 bg-white shadow-lg border-r border-gray-200 fixed h-full z-30">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-warehouse text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">SGAT-TI</h1>
            <p className="text-xs text-gray-500">Almoxarifado T.I.</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.route} href={item.route}>
            <div
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActiveRoute(item.route)
                  ? "bg-primary-50 text-primary-600 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              data-testid={`nav-${item.route.replace("/", "") || "dashboard"}`}
            >
              <i className={`${item.icon} w-5`}></i>
              <span>{item.label}</span>
            </div>
          </Link>
        ))}
        
        {isAdmin(user) && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium px-3 mb-2">
              Administração
            </p>
            {adminItems.map((item) => (
              <Link key={item.route} href={item.route}>
                <div
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActiveRoute(item.route)
                      ? "bg-primary-50 text-primary-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  data-testid={`nav-${item.route.replace("/", "")}`}
                >
                  <i className={`${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900" data-testid="user-name">
              {user?.name || "Usuário"}
            </p>
            <p className="text-xs text-gray-500" data-testid="user-role">
              {user?.role === "admin" ? "Administrador" : "Técnico"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </Button>
        </div>
      </div>
    </aside>
  );
}
