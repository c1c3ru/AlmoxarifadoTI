import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  subtitle: string;
  onAddItem?: () => void;
  showAddButton?: boolean;
}

export function Topbar({ title, subtitle, onAddItem, showAddButton = true }: TopbarProps) {
  const { toggle, isMobile } = useSidebar();
  
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            data-testid="button-toggle-sidebar"
          >
            <i className="fas fa-bars text-gray-600"></i>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900" data-testid="page-title">
              {title}
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base" data-testid="page-subtitle">
              {subtitle}
            </p>
          </div>
        </div>
        {showAddButton && onAddItem && (
          <Button onClick={onAddItem} data-testid="button-add" className="text-sm md:text-base">
            <i className="fas fa-plus mr-2"></i>
            <span className="hidden sm:inline">Adicionar</span>
            <span className="sm:hidden">+</span>
          </Button>
        )}
      </div>
    </header>
  );
}
