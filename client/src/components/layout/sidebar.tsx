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
        "bg-sidebar shadow-xl border-r border-sidebar-border fixed h-full z-50 transition-all duration-300 ease-in-out",
        // Desktop behavior
        !isMobile && isCollapsed && "w-20",
        !isMobile && !isCollapsed && "w-72",
        // Mobile behavior  
        isMobile && isOpen && "w-72 translate-x-0",
        isMobile && !isOpen && "w-72 -translate-x-full"
      )}>
        {/* Header */}
        <div className={cn(
          "h-20 flex items-center border-b border-sidebar-border transition-all duration-300",
          isCollapsed && !isMobile ? "justify-center px-2" : "px-6"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300 gap-3",
            isCollapsed && !isMobile ? "justify-center" : ""
          )}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <i className="fas fa-warehouse text-white text-lg"></i>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="transition-opacity duration-300 animate-fade-in">
                <div className="flex items-center gap-2">
                  <img src={ifceLogo} alt="IFCE" className="h-5 w-auto object-contain" />
                  <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">SGAT-TI</h1>
                </div>
                <p className="text-xs text-sidebar-foreground/60 font-medium">Almoxarifado T.I.</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.route} href={item.route}>
              <div
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200 cursor-pointer group relative",
                  isActiveRoute(item.route)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  isCollapsed && !isMobile ? "h-12 w-12 justify-center mx-auto" : "px-4 py-3 space-x-3 mb-1"
                )}
                data-testid={`nav-${item.route.replace("/", "") || "dashboard"}`}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                <i className={cn("text-lg transition-transform duration-200 group-hover:scale-110", item.icon)}></i>
                {(!isCollapsed || isMobile) && (
                  <span className="transition-opacity duration-300">{item.label}</span>
                )}
                {isCollapsed && !isMobile && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-border">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          ))}

          {/* Admin Section */}
          {isAdmin(user) && (
            <div className="pt-6 mt-6 border-t border-sidebar-border/50">
              {(!isCollapsed || isMobile) && (
                <p className="text-xs text-sidebar-foreground/40 uppercase tracking-wider font-bold px-4 mb-3 transition-opacity duration-300">
                  Administração
                </p>
              )}
              {adminItems.map((item) => (
                <Link key={item.route} href={item.route}>
                  <div
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 cursor-pointer group relative",
                      isActiveRoute(item.route)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      isCollapsed && !isMobile ? "h-12 w-12 justify-center mx-auto" : "px-4 py-3 space-x-3 mb-1"
                    )}
                    data-testid={`nav-${item.route.replace("/", "")}`}
                    title={isCollapsed && !isMobile ? item.label : undefined}
                  >
                    <i className={cn("text-lg transition-transform duration-200 group-hover:scale-110", item.icon)}></i>
                    {(!isCollapsed || isMobile) && (
                      <span className="transition-opacity duration-300">{item.label}</span>
                    )}
                    {isCollapsed && !isMobile && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-border">
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
          "border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm transition-all duration-300",
          isCollapsed && !isMobile ? "p-3" : "p-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed && !isMobile ? "justify-center flex-col gap-2" : "space-x-3"
          )}>
            <Avatar className={cn(
              "shrink-0 ring-2 ring-sidebar-border transition-all",
              isCollapsed && !isMobile ? "w-10 h-10" : "w-10 h-10"
            )}>
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || isMobile) && (
              <>
                <div className="flex-1 min-w-0 transition-opacity duration-300">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate" data-testid="user-name">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate" data-testid="user-role">
                    {user?.role === "admin" ? "Administrador" : "Técnico"}
                  </p>
                </div>
                <div className="flex items-center -mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChangePassword(true)}
                    className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    data-testid="button-change-password"
                    title="Alterar senha"
                  >
                    <i className="fas fa-key text-xs"></i>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="h-8 w-8 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
                    data-testid="button-logout"
                    title="Sair"
                  >
                    <i className="fas fa-sign-out-alt text-xs"></i>
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