import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

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
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-60">
        <Topbar 
          title={title} 
          subtitle={subtitle} 
          onAddItem={onAddItem}
          showAddButton={showAddButton}
        />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
