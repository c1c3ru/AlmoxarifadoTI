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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 py-4 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors flex items-center justify-center h-10 w-10"
            data-testid="button-toggle-sidebar"
          >
            <i className="fas fa-bars text-lg"></i>
          </Button>
          <div className="flex flex-col">
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
              "text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "rounded-full px-6 py-2.5 h-auto",
              addButtonClassName
            )}
          >
            <i className={cn(addButtonIconClass || "fas fa-plus", "mr-2 text-sm")}></i>
            <span className="hidden sm:inline">{addButtonLabel || "Adicionar"}</span>
            <span className="sm:hidden text-lg leading-none">+</span>
          </Button>
        )}
      </div>
    </header>
  );
}
