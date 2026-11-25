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
  addButtonLabel?: string;
  addButtonIconClass?: string;
  addButtonClassName?: string;
}

export function MainLayout({
  title,
  subtitle,
  children,
  onAddItem,
  showAddButton = true,
  addButtonLabel,
  addButtonIconClass,
  addButtonClassName
}: MainLayoutProps) {
  const { isCollapsed, isMobile } = useSidebar();
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;
    const sendHeartbeat = async () => {
      try {
        await apiRequest("POST", "/api/heartbeat");
      } catch { }
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
    <div className="flex min-h-screen min-h-dvh bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-100/30 via-background to-background pointer-events-none" />
      <Sidebar />
      <main className={cn(
        "min-w-0 flex-1 transition-[margin] duration-300 ease-in-out relative z-10 flex flex-col",
        // Desktop margins
        !isMobile && isCollapsed && "ml-20",
        !isMobile && !isCollapsed && "ml-72",
        // Mobile - no margin when sidebar is overlay
        isMobile && "ml-0"
      )}>
        <Topbar
          title={title}
          subtitle={subtitle}
          onAddItem={onAddItem}
          showAddButton={showAddButton}
          addButtonLabel={addButtonLabel}
          addButtonIconClass={addButtonIconClass}
          addButtonClassName={addButtonClassName}
        />
        <div className="p-4 md:p-6 lg:p-8 motion-safe:animate-fade-in flex-1 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
