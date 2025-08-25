import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  // Ordem personalizada do menu de categorias
  const CATEGORY_ORDER = [
    "MEMÓRIA RAM",
    "CONSUMÍVEIS E PEQUENOS ITENS",
    "ARMAZENAMENTO",
    "COMPONENTES E ACESSÓRIOS",
    "CADEADOS",
    "CABOS",
    "FONTES DE ENERGIA",
    "PROCESSADORES",
    "REDES E CONECTIVIDADE",
    "PERIFÉRICOS"
  ];

  const { data: categories = [], refetch: refetchCategories, isFetching: isFetchingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 0,
    refetchOnMount: "always",
    select: (data) => {
      const orderMap = new Map(CATEGORY_ORDER.map((n, i) => [n, i] as const));
      const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

      // 1) Filtra categorias inválidas (sem id ou com id vazio)
      const valid = data.filter((c) => !!c && typeof c.id === 'string' && c.id.trim().length > 0);

      // 2) Deduplica por nome normalizado, preferindo o que aparece em CATEGORY_ORDER
      const byName = new Map<string, Category>();
      for (const c of valid) {
        const key = normalize(c.name);
        if (!byName.has(key)) {
          byName.set(key, c);
        } else {
          const current = byName.get(key)!;
          const currentOrder = orderMap.get(current.name);
          const incomingOrder = orderMap.get(c.name);
          const preferIncoming = (incomingOrder ?? Infinity) < (currentOrder ?? Infinity);
          if (preferIncoming) byName.set(key, c);
          // Loga colisão para diagnóstico
          try {
            console.warn('[categories] duplicate by normalized name:', current.name, 'vs', c.name);
          } catch {}
        }
      }
      const unique = Array.from(byName.values());

      // 3) Ordena: conhecidas pela ordem fixa primeiro; demais em ordem alfabética
      return unique.sort((a, b) => {
        const ai = orderMap.has(a.name) ? (orderMap.get(a.name) as number) : Number.POSITIVE_INFINITY;
        const bi = orderMap.has(b.name) ? (orderMap.get(b.name) as number) : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    },
  });

  // Debug: log categorias ao abrir o modal e quando mudarem durante o modal aberto
  useEffect(() => {
    if (showImportModal) {
      try {
        console.log("[CSVImportExport] modal aberto - categorias (cache)", categories.length, categories.map(c => c.name));
      } catch {}
      // Raw fetch (fora do React Query) para comparar
      fetch('/api/categories', { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then((raw: Category[]) => {
          try {
            console.log('[CSVImportExport] RAW /api/categories', raw.length, raw.map(c => c.name));
          } catch {}
        })
        .catch(() => {});
      refetchCategories().then((res) => {
        try {
          const data = res.data || [];
          console.log("[CSVImportExport] após refetch - categorias", data.length, data.map(c => c.name));
        } catch {}
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImportModal]);

  useEffect(() => {
    if (showImportModal) {
      try {
        console.log("[CSVImportExport] categorias atualizadas durante modal", categories.length, categories.map(c => c.name));
      } catch {}
    }
  }, [categories, showImportModal]);

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
      const hasSuccess = result.success > 0;
      const errorCount = result.errors?.length ?? 0;
      if (hasSuccess) {
        queryClient.invalidateQueries({ queryKey: ["/api/items"] });
        toast({
          title: "Importação concluída",
          description: `${result.success} itens importados. ${errorCount > 0 ? errorCount + " erros." : "Sem erros."}`,
        });
        // Fecha o modal automaticamente em caso de sucesso sem erros
        if (errorCount === 0) {
          handleCloseModal();
        }
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

  // Helpers para UX de erros
  const csvLines = (form.watch("csvData") || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const parsedErrors = (importResult?.errors || []).map((e) => {
    const m = e.match(/Linha\s+(\d+):\s*(.*)/i);
    return m ? { line: Number(m[1]), message: m[2] } : { line: NaN, message: e };
  });
  const errorMap = new Map<number, string[]>();
  for (const err of parsedErrors) {
    if (!Number.isFinite(err.line)) continue;
    if (!errorMap.has(err.line)) errorMap.set(err.line, []);
    errorMap.get(err.line)!.push(err.message);
  }
  const errorReportText = () => {
    const parts = [
      `Erros de importação: ${importResult?.errors.length || 0}`,
      ...parsedErrors.map((e) => `Linha ${e.line || '?'}: ${e.message}`),
    ];
    return parts.join("\n");
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
      const lines = csvContent.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim());
      const dataLines = Math.max(0, lines.length - 1);
      toast({
        title: "Arquivo carregado",
        description: `${file.name} • ${dataLines} linha(s) de dados detectadas`,
      });
      // dispara validação para remover mensagens pendentes
      form.trigger("csvData");
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

      <Dialog open={showImportModal} onOpenChange={(open) => { 
        setShowImportModal(open); 
        if (open) {
          // Garante que novas categorias criadas fora do app apareçam no dropdown
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
          refetchCategories();
        } else {
          handleCloseModal();
        }
      }}>
        <DialogTrigger asChild>
          <Button
            className="bg-primary-600 hover:bg-primary-700"
            data-testid="button-import-csv"
            onClick={() => setShowImportModal(true)}
          >
            <i className="fas fa-upload mr-2"></i>
            Importar CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle>Importar Inventário via CSV</DialogTitle>
            <DialogDescription>
              Selecione uma categoria e forneça um arquivo CSV no formato indicado abaixo.
            </DialogDescription>
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
                          {isFetchingCategories && (
                            <div className="px-3 py-2 text-sm text-gray-500">Atualizando categorias...</div>
                          )}
                          {(!isFetchingCategories && categories.length === 0) ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Nenhuma categoria encontrada. Crie uma categoria antes de importar.
                            </div>
                          ) : (
                            categories
                              .filter((category) => typeof category.id === 'string' && category.id.trim().length > 0)
                              .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center space-x-2">
                                  <i className={category.icon}></i>
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
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
                      <div className="space-y-3">
                        <Alert className="border-error-200 bg-error-50">
                          <i className="fas fa-exclamation-triangle text-error-600"></i>
                          <AlertDescription className="text-error-800">
                            <div className="flex items-center justify-between">
                              <strong>Erros encontrados ({importResult.errors.length})</strong>
                              <div className="space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(errorReportText())}
                                >
                                  <i className="fas fa-copy mr-2" /> Copiar relatório
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const blob = new Blob([errorReportText()], { type: 'text/plain;charset=utf-8' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `erros-importacao-${new Date().toISOString().slice(0,10)}.txt`;
                                    document.body.appendChild(a);
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  }}
                                >
                                  <i className="fas fa-file-arrow-down mr-2" /> Baixar relatório
                                </Button>
                              </div>
                            </div>
                            <ul className="mt-2 space-y-1">
                              {parsedErrors.map((e, idx) => (
                                <li key={idx} className="text-xs">• Linha {e.line || '?'}: {e.message}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>

                        {/* Preview com destaque das linhas com erro */}
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Pré-visualização do CSV com destaques de erro</div>
                          <div className="max-h-48 overflow-auto border rounded">
                            <pre className="text-xs leading-5 m-0 p-2">
{csvLines.map((ln, idx) => {
  const lineNumber = idx + 1;
  const isHeader = idx === 0;
  const errs = errorMap.get(lineNumber) || [];
  const hasError = errs.length > 0;
  const bg = isHeader ? 'bg-gray-50' : hasError ? 'bg-red-50' : '';
  const prefix = `${String(lineNumber).padStart(4, ' ')}│ `;
  return (
    <div key={idx} className={`${bg} whitespace-pre-wrap break-words pr-2`}> 
      <span className="text-gray-400 select-none">{prefix}</span>
      <span className="font-mono">{ln}</span>
      {hasError && (
        <div className="text-red-700 text-[10px] mt-1 ml-10">{errs.join(' | ')}</div>
      )}
    </div>
  );
})}
                            </pre>
                          </div>
                        </div>
                      </div>
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
                  {(() => {
                    const isDisabled = (
                      importMutation.isPending ||
                      !form.watch("categoryId") ||
                      !(form.watch("csvData")?.trim())
                    );
                    const reasons: string[] = [];
                    if (!form.watch("categoryId")) reasons.push("Selecione uma categoria");
                    if (!(form.watch("csvData")?.trim())) reasons.push("Forneça um CSV (arquivo ou texto)");
                    return (
                      <>
                        <Button
                          type="submit"
                          disabled={isDisabled}
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
                        {isDisabled && reasons.length > 0 && (
                          <div className="text-xs text-gray-500 ml-2">
                            {reasons.join(" • ")}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}