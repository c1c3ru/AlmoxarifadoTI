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
  const { toggle, isMobile, isOpen, isCollapsed } = useSidebar();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md px-4 md:px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex flex-1 items-start gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            id="sidebar-toggle"
            aria-label={isMobile ? (isOpen ? "Fechar menu" : "Abrir menu") : (isCollapsed ? "Expandir menu" : "Recolher menu")}
            aria-controls="app-sidebar"
            aria-expanded={isMobile ? isOpen : !isCollapsed}
            className="shrink-0 p-2 hover:bg-accent hover:text-accent-foreground rounded-lg h-11 w-11"
            data-testid="button-toggle-sidebar"
          >
            <i aria-hidden="true" className="fas fa-bars text-lg"></i>
          </Button>
          <div className="min-w-0 flex flex-col break-words">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight" data-testid="page-title">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-0.5 text-sm md:text-base animate-fade-in" data-testid="page-subtitle">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {showAddButton && onAddItem && (
          <Button
            onClick={onAddItem}
            data-testid="button-add"
            className={cn(
              "shrink-0 ml-auto text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "rounded-lg px-4 py-2.5 min-h-11 h-auto",
              addButtonClassName
            )}
          >
            <i aria-hidden="true" className={cn(addButtonIconClass || "fas fa-plus", "mr-2 text-sm")}></i>
            <span>{addButtonLabel || "Adicionar"}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
