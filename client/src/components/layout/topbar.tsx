import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface TopbarProps {
  title: string;
  subtitle: string;
  onAddItem?: () => void;
  showAddButton?: boolean;
}

export function Topbar({ title, subtitle, onAddItem, showAddButton = true }: TopbarProps) {
  const { user, logout } = useAuth();
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900" data-testid="page-title">
            {title}
          </h2>
          <p className="text-sm text-gray-500" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Olá, <span className="font-medium text-gray-900">{user.username}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-600 hover:text-error-600 transition-colors"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Sair
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="button-notifications"
          >
            <i className="fas fa-bell text-lg"></i>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-error-600 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          {showAddButton && onAddItem && (
            <Button
              onClick={onAddItem}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              data-testid="button-add-item"
            >
              <i className="fas fa-plus mr-2"></i>
              Novo Item
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
