import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ItemWithCategory } from "@shared/schema";

const movementSchema = z.object({
  type: z.enum(["entrada", "saida"]),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  destination: z.string().optional(),
  observation: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

interface MovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithCategory | null;
}

export function MovementModal({ open, onOpenChange, item }: MovementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: "saida",
      quantity: 1,
      destination: "",
      observation: "",
    },
  });

  const movementType = form.watch("type");
  const quantity = form.watch("quantity");

  const createMovementMutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      if (!item || !user) throw new Error("Item ou usuário não encontrado");
      
      const movementData = {
        itemId: item.id,
        userId: user.id,
        type: data.type,
        quantity: data.quantity,
        previousStock: item.currentStock,
        newStock: data.type === "entrada" 
          ? item.currentStock + data.quantity 
          : item.currentStock - data.quantity,
        destination: data.destination,
        observation: data.observation,
      };

      const response = await apiRequest("POST", "/api/movements", movementData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Movimentação registrada",
        description: `${movementType === "entrada" ? "Entrada" : "Saída"} de ${quantity} unidade(s) registrada com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar movimentação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MovementFormData) => {
    // Validate stock for withdrawal
    if (data.type === "saida" && item && data.quantity > item.currentStock) {
      toast({
        title: "Estoque insuficiente",
        description: `Disponível: ${item.currentStock} unidades. Solicitado: ${data.quantity} unidades.`,
        variant: "destructive",
      });
      return;
    }

    createMovementMutation.mutate(data);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimentar Item</DialogTitle>
        </DialogHeader>
        
        <div className="mb-6">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <i className={`${item.category?.icon || 'fas fa-box'} text-primary-600`}></i>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900" data-testid="movement-item-name">
                {item.name}
              </h4>
              <p className="text-sm text-gray-500">
                Código: <span data-testid="movement-item-code">{item.internalCode}</span>
              </p>
              <p className="text-sm text-gray-500">
                Estoque Atual: <span data-testid="movement-current-stock">{item.currentStock}</span> unidades
              </p>
            </div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimentação</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-movement-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={movementType === "saida" ? item.currentStock : undefined}
                      {...field}
                      data-testid="input-movement-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                  {movementType === "saida" && (
                    <p className="text-xs text-gray-500">
                      Máximo disponível: {item.currentStock} unidades
                    </p>
                  )}
                </FormItem>
              )}
            />
            
            {movementType === "saida" && (
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino/Responsável</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: João Silva - Depto. Financeiro"
                        {...field}
                        data-testid="input-movement-destination"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="observation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      {...field}
                      data-testid="textarea-movement-observation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-movement"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMovementMutation.isPending}
                className={movementType === "entrada" ? "bg-success-600 hover:bg-success-700" : "bg-error-600 hover:bg-error-700"}
                data-testid="button-confirm-movement"
              >
                {createMovementMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Processando...
                  </>
                ) : (
                  <>
                    <i className={`fas ${movementType === "entrada" ? "fa-arrow-down" : "fa-arrow-up"} mr-2`}></i>
                    Confirmar {movementType === "entrada" ? "Entrada" : "Saída"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
