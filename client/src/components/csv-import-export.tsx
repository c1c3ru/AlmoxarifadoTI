import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

const importSchema = z.object({
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  csvData: z.string().min(1, "Dados CSV são obrigatórios"),
});

type ImportFormData = z.infer<typeof importSchema>;

interface ImportResult {
  success: number;
  errors: string[];
}

export function CSVImportExport() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      categoryId: "",
      csvData: "",
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/inventory/export");
      if (!response.ok) {
        throw new Error("Erro ao exportar inventário");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventario-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Exportação realizada com sucesso",
        description: "O arquivo CSV foi baixado para o seu dispositivo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: ImportFormData) => {
      const response = await apiRequest("POST", "/api/inventory/import", data);
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      setImportResult(result);
      if (result.success > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/items"] });
        toast({
          title: "Importação realizada",
          description: `${result.success} itens importados com sucesso.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ImportFormData) => {
    setImportResult(null);
    importMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      form.setValue("csvData", csvContent);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleCloseModal = () => {
    setShowImportModal(false);
    setImportResult(null);
    form.reset();
  };

  const csvTemplate = `Nome,Descrição,Estoque Atual,Estoque Mínimo,Localização
Mouse Ótico USB,"Mouse óptico com fio USB",25,5,"Sala A - Prateleira 1"
Teclado ABNT2,"Teclado padrão brasileiro",15,3,"Sala A - Prateleira 2"
Monitor LED 19,"Monitor LED 19 polegadas",8,2,"Sala B - Mesa 1"`;

  return (
    <div className="flex items-center space-x-3">
      <Button
        onClick={() => exportMutation.mutate()}
        disabled={exportMutation.isPending}
        variant="outline"
        className="bg-success-50 border-success-200 text-success-700 hover:bg-success-100"
        data-testid="button-export-csv"
      >
        {exportMutation.isPending ? (
          <>
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Exportando...
          </>
        ) : (
          <>
            <i className="fas fa-download mr-2"></i>
            Exportar CSV
          </>
        )}
      </Button>

      <Dialog open={showImportModal} onOpenChange={handleCloseModal}>
        <DialogTrigger asChild>
          <Button
            className="bg-primary-600 hover:bg-primary-700"
            data-testid="button-import-csv"
          >
            <i className="fas fa-upload mr-2"></i>
            Importar CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Inventário via CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Template Example */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">Formato do arquivo CSV:</h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  {csvTemplate}
                </pre>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Importante:</strong> A primeira linha deve conter os cabeçalhos como mostrado acima.
                </p>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria para todos os itens</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-import-category">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                <i className={category.icon}></i>
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Arquivo CSV</FormLabel>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      data-testid="input-csv-file"
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="csvData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ou cole os dados CSV diretamente</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cole o conteúdo do arquivo CSV aqui..."
                          className="min-h-[120px] font-mono text-sm"
                          {...field}
                          data-testid="textarea-csv-data"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {importResult && (
                  <div className="space-y-2">
                    {importResult.success > 0 && (
                      <Alert className="border-success-200 bg-success-50">
                        <i className="fas fa-check-circle text-success-600"></i>
                        <AlertDescription className="text-success-800">
                          <strong>{importResult.success} itens</strong> importados com sucesso!
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {importResult.errors.length > 0 && (
                      <Alert className="border-error-200 bg-error-50">
                        <i className="fas fa-exclamation-triangle text-error-600"></i>
                        <AlertDescription className="text-error-800">
                          <strong>Erros encontrados:</strong>
                          <ul className="mt-2 space-y-1">
                            {importResult.errors.map((error, index) => (
                              <li key={index} className="text-xs">• {error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    data-testid="button-cancel-import"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={importMutation.isPending || !form.watch("categoryId")}
                    className="bg-primary-600 hover:bg-primary-700"
                    data-testid="button-submit-import"
                  >
                    {importMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Importando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2"></i>
                        Importar Itens
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}