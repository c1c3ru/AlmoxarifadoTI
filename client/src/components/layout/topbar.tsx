import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  subtitle: string;
  onAddItem?: () => void;
  showAddButton?: boolean;
  addButtonLabel?: string;
  addButtonIconClass?: string;
  addButtonClassName?: string;
}

export function Topbar({ title, subtitle, onAddItem, showAddButton = true, addButtonLabel, addButtonIconClass, addButtonClassName }: TopbarProps) {
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
          <Button
            onClick={onAddItem}
            data-testid="button-add"
            className={cn(
              "text-sm md:text-base",
              // Estilo padrão suave e moderno; pode ser sobrescrito via addButtonClassName
              "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-md hover:shadow-lg",
              "hover:from-black hover:to-gray-900 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900",
              "rounded-full px-4 py-2 transition-all",
              addButtonClassName
            )}
          >
            <i className={cn(addButtonIconClass || "fas fa-plus", "mr-2")}></i>
            <span className="hidden sm:inline">{addButtonLabel || "Adicionar"}</span>
            <span className="sm:hidden">+</span>
          </Button>
        )}
      </div>
    </header>
  );
}
