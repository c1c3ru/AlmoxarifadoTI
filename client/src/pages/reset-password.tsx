import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordPolicy } from "@shared/password-policy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const resetSchema = z
  .object({
    newPassword: passwordPolicy,
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

// Lê o token do link recebido por e-mail e o remove da barra de endereço,
// para que não fique no histórico do navegador nem seja compartilhado sem querer.
function takeTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  return token;
}

export default function ResetPassword() {
  const [token] = useState(takeTokenFromUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"form" | "done" | "invalid">(token ? "form" : "invalid");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    document.title = "Redefinir senha - SGAT-TI";
  }, []);

  const onSubmit = async (data: ResetFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      const result = await response.json().catch(() => ({ message: "Erro de comunicação com o servidor" }));

      if (response.ok) {
        setStatus("done");
        toast({ title: "Senha redefinida", description: result.message });
      } else if (response.status === 400 && /link/i.test(result.message ?? "")) {
        setStatus("invalid");
      } else {
        setErrorMessage(result.message || "Erro ao redefinir senha");
      }
    } catch {
      setErrorMessage("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />

      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-white/20 shadow-2xl relative z-10 animate-fade-in ring-1 ring-white/20">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <i className="fa-solid fa-key text-white text-xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Redefinir senha</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {status === "form" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Crie uma nova senha com pelo menos 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo.
                </p>
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Nova senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" placeholder="Nova senha" {...field} className="h-11" data-testid="input-new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Confirmar senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" placeholder="Repita a nova senha" {...field} className="h-11" data-testid="input-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {errorMessage && (
                  <p className="text-sm text-destructive text-center" role="alert">{errorMessage}</p>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  data-testid="button-reset-password"
                >
                  {isSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Salvando...</>
                  ) : (
                    <><i className="fa-solid fa-check mr-2"></i>Salvar nova senha</>
                  )}
                </Button>
              </form>
            </Form>
          )}

          {status === "done" && (
            <div className="text-center space-y-4">
              <i className="fa-solid fa-circle-check text-green-500 text-4xl"></i>
              <p className="text-sm text-muted-foreground">Sua senha foi redefinida. Entre com a nova senha.</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center space-y-4">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 text-4xl"></i>
              <p className="text-sm text-muted-foreground">
                Este link é inválido, expirou ou já foi usado. Na tela de login, use "Esqueceu a senha?" para receber um novo.
              </p>
            </div>
          )}

          <Link href="/login">
            <Button variant="outline" className="w-full" data-testid="link-back-to-login">
              <i className="fa-solid fa-arrow-left mr-2"></i>
              Voltar para o login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
