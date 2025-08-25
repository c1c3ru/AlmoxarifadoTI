import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

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
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;
    const sendHeartbeat = async () => {
      try {
        await apiRequest("POST", "/api/heartbeat");
      } catch {}
    };
    const start = () => {
      if (stopped) return;
      // Envia imediatamente e agenda a cada 60s enquanto a aba estiver visível
      sendHeartbeat();
      heartbeatRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') sendHeartbeat();
      }, 60000);
    };
    const stop = () => {
      stopped = true;
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !heartbeatRef.current) start();
      if (document.visibilityState !== 'visible' && heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);
  
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
