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

// Mapping function for FA6 compatibility
const mapIconClass = (iconClass: string) => {
  const iconMap: Record<string, string> = {
    "fas fa-desktop": "fa-solid fa-desktop",
    "fas fa-mouse": "fa-solid fa-computer-mouse",
    "fas fa-keyboard": "fa-solid fa-keyboard",
    "fas fa-monitor": "fa-solid fa-display",
    "fas fa-microchip": "fa-solid fa-microchip",
    "fas fa-memory": "fa-solid fa-memory",
    "fas fa-hdd": "fa-solid fa-hard-drive",
    "fas fa-cable-car": "fa-solid fa-cable-car",
    "fas fa-network-wired": "fa-solid fa-network-wired",
    "fas fa-print": "fa-solid fa-print",
    "fas fa-camera": "fa-solid fa-camera",
    "fas fa-headphones": "fa-solid fa-headphones",
    "fas fa-speaker": "fa-solid fa-volume-high",
    "fas fa-usb": "fa-solid fa-usb",
    "fas fa-screwdriver-wrench": "fa-solid fa-screwdriver-wrench",
    "fas fa-stethoscope": "fa-solid fa-stethoscope",
    "fas fa-boxes": "fa-solid fa-boxes-stacked",
    "fas fa-tags": "fa-solid fa-tags",
    "fas fa-plus": "fa-solid fa-plus",
    "fas fa-save": "fa-solid fa-floppy-disk",
    "fas fa-spinner": "fa-solid fa-spinner",
    "fas fa-edit": "fa-solid fa-pen-to-square",
    "fas fa-trash": "fa-solid fa-trash-can"
  };
  
  return iconMap[iconClass] || iconClass;
};

const iconOptions = [
  { value: "fas fa-desktop", label: "Computador" },
  { value: "fas fa-tablet", label: "Tablet" },
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
  { value: "fas fa-screwdriver-wrench", label: "Ferramentas e Equipamentos de Teste e Diagnósticos" },
  { value: "fas fa-stethoscope", label: "Diagnóstico" },
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
    console.log('✏️ Editando categoria:', category);
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon,
    });
    setShowAddModal(true);
  };

  const handleDelete = (category: Category) => {
    console.log('🗑️ Excluindo categoria:', category);
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
      title="Gerenciamento de Categorias"
      subtitle="Organize e gerencie as categorias de itens do almoxarifado"
      showAddButton={false}
    >
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Categorias Cadastradas</h3>
              <p className="text-sm text-gray-500">Visualize e gerencie todas as categorias do sistema</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl rounded-full px-4"
              data-testid="button-add-category"
              onClick={handleOpenModal}
            >
              <i className={mapIconClass("fas fa-tags")}></i>
              <span className="ml-2">Nova Categoria</span>
            </Button>

            {showAddModal && (
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white shadow-2xl border border-gray-200">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      {editingCategory ? "Editar Categoria" : "Adicionar Nova Categoria"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Nome da Categoria</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Periféricos"
                                {...field}
                                data-testid="input-category-name"
                                className="mt-1"
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
                            <FormLabel className="text-sm font-medium">Descrição (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descrição da categoria..."
                                {...field}
                                data-testid="textarea-category-description"
                                className="mt-1 min-h-[80px]"
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
                            <FormLabel className="text-sm font-medium">Ícone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category-icon" className="mt-1">
                                  <SelectValue placeholder="Selecione um ícone..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {iconOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center space-x-2">
                                      <i className={mapIconClass(option.value)}></i>
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
                      
                      <div className="flex items-center justify-end space-x-3 pt-5 border-t border-gray-200">
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
                              <i className={`${mapIconClass("fas fa-spinner")} fa-spin mr-2`}></i>
                              Salvando...
                            </>
                          ) : (
                            <>
                              <i className={mapIconClass("fas fa-save")}></i>
                              <span className="ml-2">{editingCategory ? "Atualizar" : "Salvar"} Categoria</span>
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
            <div className="text-center py-16">
              <i className={`${mapIconClass("fas fa-tags")} text-5xl text-gray-400 mb-4`}></i>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma categoria cadastrada</h4>
              <p className="text-gray-500 mb-6">Adicione a primeira categoria para organizar seu almoxarifado</p>
              <Button onClick={() => setShowAddModal(true)} className="bg-primary-600 hover:bg-primary-700">
                <i className={mapIconClass("fas fa-plus")}></i>
                <span className="ml-2">Nova Categoria</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white"
                  data-testid={`category-${category.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center border border-primary-200/50 shadow-sm">
                          <i className={`${mapIconClass(category.icon)} text-primary-600 text-xl`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg" data-testid={`category-name-${category.id}`}>
                            {category.name}
                          </h4>
                          {category.description && (
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-4 border-t border-gray-100 pt-3">
                      Criado em: {new Date(category.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-gray-600 hover:text-primary-600 hover:border-primary-300"
                        data-testid={`button-edit-${category.id}`}
                        title="Editar categoria"
                        aria-label={`Editar categoria ${category.name}`}
                      >
                        <i className={mapIconClass("fas fa-edit")}></i>
                        <span className="ml-1 hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        disabled={deleteCategoryMutation.isPending}
                        className="hover:bg-red-600"
                        data-testid={`button-delete-${category.id}`}
                        title="Excluir categoria"
                        aria-label={`Excluir categoria ${category.name}`}
                      >
                        <i className={mapIconClass("fas fa-trash")}></i>
                        <span className="ml-1 hidden sm:inline">Excluir</span>
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