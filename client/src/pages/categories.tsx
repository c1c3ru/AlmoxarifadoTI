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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  icon: z.string().min(1, "Ícone é obrigatório"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const iconOptions = [
  { value: "fas fa-desktop", label: "Computador" },
  { value: "fas fa-mouse", label: "Mouse" },
  { value: "fas fa-keyboard", label: "Teclado" },
  { value: "fas fa-monitor", label: "Monitor" },
  { value: "fas fa-microchip", label: "Processador" },
  { value: "fas fa-memory", label: "Memória" },
  { value: "fas fa-hdd", label: "HD/SSD" },
  { value: "fas fa-cable-car", label: "Cabos" },
  { value: "fas fa-network-wired", label: "Rede" },
  { value: "fas fa-print", label: "Impressora" },
  { value: "fas fa-camera", label: "Câmera" },
  { value: "fas fa-headphones", label: "Fones" },
  { value: "fas fa-speaker", label: "Alto-falantes" },
  { value: "fas fa-usb", label: "USB" },
  { value: "fas fa-boxes", label: "Geral" },
];

export default function Categories() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "fas fa-boxes",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Categoria criada com sucesso",
        description: "A categoria foi adicionada ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAddModal(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const response = await apiRequest("PUT", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Categoria atualizada com sucesso",
        description: "As informações da categoria foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      setShowAddModal(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Categoria excluída com sucesso",
        description: "A categoria foi removida do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon,
    });
    setShowAddModal(true);
  };

  const handleDelete = (category: Category) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleOpenModal = () => {
    setShowAddModal(true);
    setEditingCategory(null);
    form.reset();
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    form.reset();
  };

  return (
    <MainLayout
      title="Categorias"
      subtitle="Gerenciar categorias de itens"
      showAddButton={false}
    >
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Categorias</h3>
            <Button 
              className="bg-primary-600 hover:bg-primary-700"
              data-testid="button-add-category"
              onClick={handleOpenModal}
            >
              <i className="fas fa-plus mr-2"></i>
              Nova Categoria
            </Button>

            {showAddModal && (
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Editar Categoria" : "Adicionar Nova Categoria"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Categoria</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Periféricos"
                                {...field}
                                data-testid="input-category-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descrição da categoria..."
                                {...field}
                                data-testid="textarea-category-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ícone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category-icon">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {iconOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center space-x-2">
                                    <i className={option.value}></i>
                                    <span>{option.label}</span>
                                  </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCloseModal}
                          data-testid="button-cancel"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                          className="bg-primary-600 hover:bg-primary-700"
                          data-testid="button-save-category"
                        >
                          {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Salvando...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              {editingCategory ? "Atualizar" : "Salvar"} Categoria
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border border-gray-200">
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-tags text-4xl text-gray-400 mb-4"></i>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma categoria cadastrada</h4>
              <p className="text-gray-500 mb-4">Adicione a primeira categoria ao sistema</p>
              <Button onClick={() => setShowAddModal(true)}>
                Nova Categoria
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="border border-gray-200 hover:shadow-md transition-shadow"
                  data-testid={`category-${category.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <i className={`${category.icon} text-primary-600 text-xl`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900" data-testid={`category-name-${category.id}`}>
                            {category.name}
                          </h4>
                          {category.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-4">
                      Criado em: {new Date(category.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-gray-600 hover:text-primary-600"
                        data-testid={`button-edit-${category.id}`}
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        disabled={deleteCategoryMutation.isPending}
                        className="text-gray-600 hover:text-error-600"
                        data-testid={`button-delete-${category.id}`}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
