import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const userSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  role: z.enum(["admin", "tech"]),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "tech",
      isActive: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado com sucesso",
        description: "O usuário foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddModal(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso",
        description: "As informações do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      password: "",
      name: user.name,
      role: user.role as "admin" | "tech",
      isActive: user.isActive,
    });
    setShowAddModal(true);
  };

  const handleToggleStatus = (user: User) => {
    toggleUserStatusMutation.mutate({
      id: user.id,
      isActive: !user.isActive,
    });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingUser(null);
    form.reset();
  };

  const getRoleColor = (role: string) => {
    return role === "admin" 
      ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-200" 
      : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200";
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "Administrador" : "Técnico";
  };

  const getRoleIcon = (role: string) => {
    return role === "admin" ? "fa-solid fa-crown" : "fa-solid fa-user-gear";
  };

  return (
    <MainLayout
      title="Gerenciar Usuários"
      subtitle="Controle de acesso e permissões do sistema"
      showAddButton={false}
    >
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-blue-900">
                  {users.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-users text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Administradores</p>
                <p className="text-3xl font-bold text-purple-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-crown text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Usuários Ativos</p>
                <p className="text-3xl font-bold text-green-900">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-user-check text-white text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Management */}
      <Card className="bg-white border-0 shadow-xl">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-users text-white text-sm"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Lista de Usuários</h3>
            </div>
            <Dialog open={showAddModal} onOpenChange={handleCloseModal}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                  data-testid="button-add-user"
                >
                  <i className="fa-solid fa-plus mr-2"></i>
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white/95 backdrop-blur-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center">
                    {editingUser ? "Editar Usuário" : "Adicionar Novo Usuário"}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-700">Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome de usuário"
                              disabled={!!editingUser}
                              {...field}
                              data-testid="input-username"
                              className="h-11 bg-gray-50/50 focus:bg-white transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-700">
                            {editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Senha"
                              {...field}
                              data-testid="input-password"
                              className="h-11 bg-gray-50/50 focus:bg-white transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-700">Nome Completo</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome completo"
                              {...field}
                              data-testid="input-name"
                              className="h-11 bg-gray-50/50 focus:bg-white transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-700">Função</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role" className="h-11 bg-gray-50/50 focus:bg-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tech">
                                <div className="flex items-center space-x-2">
                                  <i className="fa-solid fa-user-gear text-gray-600"></i>
                                  <span>Técnico</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center space-x-2">
                                  <i className="fa-solid fa-crown text-purple-600"></i>
                                  <span>Administrador</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-gradient-to-r from-gray-50 to-blue-50">
                          <div className="space-y-0.5">
                            <FormLabel className="font-semibold text-gray-700">Usuário Ativo</FormLabel>
                            <div className="text-sm text-gray-500">
                              Permitir que o usuário acesse o sistema
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseModal}
                        data-testid="button-cancel"
                        className="border-2"
                      >
                        <i className="fa-solid fa-times mr-2"></i>
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending || updateUserMutation.isPending}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                        data-testid="button-save-user"
                      >
                        {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-save mr-2"></i>
                            {editingUser ? "Atualizar" : "Salvar"} Usuário
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 rounded-xl border border-gray-200">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-users text-gray-400 text-3xl"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Nenhum usuário cadastrado</h4>
              <p className="text-gray-500 mb-6">Adicione o primeiro usuário para começar a gerenciar o acesso ao sistema</p>
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Adicionar Primeiro Usuário
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:shadow-lg hover:border-blue-200 transition-all duration-300 group bg-gradient-to-r from-white to-gray-50"
                  data-testid={`user-${user.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                      user.role === 'admin' 
                        ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                        : 'bg-gradient-to-br from-blue-400 to-blue-600'
                    }`}>
                      <i className={`${getRoleIcon(user.role)} text-white text-xl`}></i>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors" data-testid={`user-name-${user.id}`}>
                          {user.name}
                        </p>
                        <Badge 
                          className={`${getRoleColor(user.role)} font-medium px-3 py-1 border`}
                          data-testid={`user-role-${user.id}`}
                        >
                          <i className={`${getRoleIcon(user.role)} mr-2 text-xs`}></i>
                          {getRoleLabel(user.role)}
                        </Badge>
                        {!user.isActive && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 font-medium">
                            <i className="fa-solid fa-user-slash mr-1 text-xs"></i>
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <i className="fa-solid fa-at mr-2 text-blue-500"></i>
                          {user.username}
                        </span>
                        <span className="flex items-center">
                          <i className="fa-solid fa-calendar mr-2 text-green-500"></i>
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleStatus(user)}
                        disabled={toggleUserStatusMutation.isPending}
                        data-testid={`switch-active-${user.id}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(user)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
                      data-testid={`button-edit-${user.id}`}
                    >
                      <i className="fa-solid fa-edit mr-2"></i>
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}