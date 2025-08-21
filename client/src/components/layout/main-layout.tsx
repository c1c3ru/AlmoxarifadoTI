import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onAddItem?: () => void;
  showAddButton?: boolean;
}

export function MainLayout({ 
  title, 
  subtitle, 
  children, 
  onAddItem, 
  showAddButton = true 
}: MainLayoutProps) {
  const { isCollapsed, isMobile } = useSidebar();
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        // Desktop margins
        !isMobile && isCollapsed && "ml-16",
        !isMobile && !isCollapsed && "ml-60",
        // Mobile - no margin when sidebar is overlay
        isMobile && "ml-0"
      )}>
        <Topbar 
          title={title} 
          subtitle={subtitle} 
          onAddItem={onAddItem}
          showAddButton={showAddButton}
        />
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
