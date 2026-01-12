import { useState } from "react";
import { Link, useLocation } from "wouter";
import ifceLogo from "@publicAssets/ifce_logo.png";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

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
  const { isCollapsed, isMobile, isOpen, close } = useSidebar();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { toast } = useToast();

  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onChangePassword = async (data: ChangePasswordFormData) => {
    try {
      const response = await apiRequest("PUT", "/api/users/me/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.ok) {
        toast({
          title: "Senha alterada com sucesso",
          description: "Sua senha foi atualizada.",
        });
        changePasswordForm.reset();
        setShowChangePassword(false);
      } else {
        const result = await response.json();
        toast({
          title: "Erro ao alterar senha",
          description: result.message || "Não foi possível alterar a senha",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isActiveRoute = (route: string) => {
    if (route === "/") return location === "/";
    return location.startsWith(route);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={close}
          data-testid="sidebar-overlay"
        />
      )}
      
      <aside className={cn(
        "bg-white shadow-lg border-r border-gray-200 fixed h-full z-50 transition-all duration-300 ease-in-out",
        // Desktop behavior
        !isMobile && isCollapsed && "w-16",
        !isMobile && !isCollapsed && "w-60",
        // Mobile behavior  
        isMobile && isOpen && "w-60 translate-x-0",
        isMobile && !isOpen && "w-60 -translate-x-full"
      )}>
        {/* Header */}
        <div className={cn(
          "border-b border-gray-200 transition-all duration-300",
          isCollapsed && !isMobile ? "p-4" : "p-6"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed && !isMobile ? "justify-center" : "space-x-3"
          )}>
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
              <i className="fas fa-warehouse text-white text-lg"></i>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="transition-opacity duration-300">
                <div className="flex items-center gap-2">
                  <img src={ifceLogo} alt="IFCE" className="h-5 w-5 object-contain" />
                  <h1 className="text-lg font-semibold text-gray-900">SGAT-TI</h1>
                </div>
                <p className="text-xs text-gray-500">Almoxarifado T.I.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className={cn(
          "space-y-2 transition-all duration-300",
          isCollapsed && !isMobile ? "p-2" : "p-4"
        )}>
          {menuItems.map((item) => (
            <Link key={item.route} href={item.route}>
              <div
                className={cn(
                  "flex items-center rounded-lg transition-all duration-200 cursor-pointer group relative",
                  isActiveRoute(item.route)
                    ? "bg-primary-50 text-primary-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100",
                  isCollapsed && !isMobile ? "px-2 py-2 justify-center" : "px-3 py-2 space-x-3"
                )}
                data-testid={`nav-${item.route.replace("/", "") || "dashboard"}`}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                <i className={cn("text-sm transition-all duration-200", item.icon, isCollapsed && !isMobile ? "" : "w-5")}></i>
                {(!isCollapsed || isMobile) && (
                  <span className="transition-opacity duration-300">{item.label}</span>
                )}
                {isCollapsed && !isMobile && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          ))}
          
          {/* Admin Section */}
          {isAdmin(user) && (
            <div className="pt-4 border-t border-gray-200 mt-4">
              {(!isCollapsed || isMobile) && (
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium px-3 mb-2 transition-opacity duration-300">
                  Administração
                </p>
              )}
              {adminItems.map((item) => (
                <Link key={item.route} href={item.route}>
                  <div
                    className={cn(
                      "flex items-center rounded-lg transition-all duration-200 cursor-pointer group relative",
                      isActiveRoute(item.route)
                        ? "bg-primary-50 text-primary-600 font-medium"
                        : "text-gray-700 hover:bg-gray-100",
                      isCollapsed && !isMobile ? "px-2 py-2 justify-center" : "px-3 py-2 space-x-3"
                    )}
                    data-testid={`nav-${item.route.replace("/", "")}`}
                    title={isCollapsed && !isMobile ? item.label : undefined}
                  >
                    <i className={cn("text-sm transition-all duration-200", item.icon, isCollapsed && !isMobile ? "" : "w-5")}></i>
                    {(!isCollapsed || isMobile) && (
                      <span className="transition-opacity duration-300">{item.label}</span>
                    )}
                    {isCollapsed && !isMobile && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </nav>
        
        {/* User Section */}
        <div className={cn(
          "absolute bottom-0 w-full border-t border-gray-200 bg-white transition-all duration-300",
          isCollapsed && !isMobile ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed && !isMobile ? "justify-center" : "space-x-3"
          )}>
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || isMobile) && (
              <>
                <div className="flex-1 transition-opacity duration-300">
                  <p className="text-sm font-medium text-gray-900" data-testid="user-name">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="text-xs text-gray-500" data-testid="user-role">
                    {user?.role === "admin" ? "Administrador" : "Técnico"}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangePassword(true)}
                    className="text-gray-400 hover:text-gray-600 transition-opacity duration-300"
                    data-testid="button-change-password"
                    title="Alterar senha"
                  >
                    <i className="fas fa-key"></i>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-400 hover:text-gray-600 transition-opacity duration-300"
                    data-testid="button-logout"
                    title="Sair"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <FormField
                control={changePasswordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua senha atual"
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite a nova senha (mín. 6 caracteres)"
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirme a nova senha"
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    changePasswordForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <i className="fa-solid fa-key mr-2"></i>
                  Alterar Senha
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}