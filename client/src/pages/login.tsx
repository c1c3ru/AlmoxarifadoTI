import { useState } from "react";
import ifceLogo from "@publicAssets/ifce_logo.png";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const recoverSchema = z.object({
  usernameOrEmail: z.string().min(1, "Informe seu usuário ou email"),
});

const resetSchema = z
  .object({
    usernameOrEmail: z.string().min(1, "Usuário ou email é obrigatório"),
    code: z.string().min(4, "Código inválido"),
    newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirmação obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const recoverForm = useForm<z.infer<typeof recoverSchema>>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { usernameOrEmail: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { usernameOrEmail: "", code: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const success = await login(data.username, data.password);
      if (!success) {
        toast({
          title: "Erro no login",
          description: "Credenciais inválidas. Verifique seu usuário e senha.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRecover = async (data: z.infer<typeof recoverSchema>) => {
    try {
      const response = await fetch('/api/password-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail: data.usernameOrEmail }),
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { message: "Erro de comunicação com o servidor" };
      }

      if (response.ok) {
        toast({
          title: "Solicitação enviada",
          description: result.message,
        });
        recoverForm.reset();
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao processar solicitação",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    try {
      const response = await fetch('/api/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernameOrEmail: data.usernameOrEmail,
          code: data.code,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Senha redefinida",
          description: result.message,
        });
        resetForm.reset();
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao redefinir senha",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/40 via-background to-background pointer-events-none" />

      {/* Decorative blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" style={{ animationDelay: "1s" }} />

      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-white/20 shadow-2xl relative z-10 animate-fade-in ring-1 ring-white/20">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-2">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <img
                src={ifceLogo}
                alt="IFCE"
                className="h-12 w-auto object-contain brightness-0 invert opacity-90"
                loading="eager"
                decoding="async"
              />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground tracking-tight">
              SGAT<span className="text-primary">-TI</span>
            </CardTitle>
          </div>
          <p className="text-muted-foreground font-medium text-sm max-w-[280px] mx-auto">
            Sistema de Gestão de Almoxarifado de T.I.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-gray-700">Nome de Usuário</FormLabel>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fa-solid fa-user text-gray-400 text-sm"></i>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Digite seu nome de usuário"
                          {...field}
                          data-testid="input-username"
                          className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-gray-700">Senha</FormLabel>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fa-solid fa-lock text-gray-400 text-sm"></i>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Digite sua senha"
                          {...field}
                          data-testid="input-password"
                          className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-3"></i>
                    Entrando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-sign-in-alt mr-3"></i>
                    Acessar Sistema
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between pt-2">
                <div className="w-full text-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline transition-colors">
                        <i className="fa-solid fa-key mr-2"></i>
                        Esqueceu a senha?
                      </button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={undefined} className="sm:max-w-md bg-white shadow-2xl border border-gray-200">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-center">Recuperar Acesso</DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="recover">
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="recover" className="font-medium">Recuperar</TabsTrigger>
                          <TabsTrigger value="reset" className="font-medium">Redefinir</TabsTrigger>
                        </TabsList>

                        <TabsContent value="recover" className="mt-6">
                          <Form {...recoverForm}>
                            <form onSubmit={recoverForm.handleSubmit(onRecover)} className="space-y-4">
                              <FormField
                                control={recoverForm.control}
                                name="usernameOrEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-semibold">Usuário ou Email</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Digite seu usuário ou email"
                                        {...field}
                                        className="h-11"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-11">
                                <i className="fa-solid fa-envelope mr-2"></i>
                                Enviar Instruções
                              </Button>
                              <p className="text-xs text-gray-500 text-center">
                                Você receberá um código para redefinir sua senha.
                              </p>
                            </form>
                          </Form>
                        </TabsContent>

                        <TabsContent value="reset" className="mt-6">
                          <Form {...resetForm}>
                            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                              <FormField
                                control={resetForm.control}
                                name="usernameOrEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-semibold">Usuário ou Email</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Seu usuário ou email" {...field} className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={resetForm.control}
                                name="code"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-semibold">Código</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Código recebido" {...field} className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={resetForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-semibold">Nova Senha</FormLabel>
                                    <FormControl>
                                      <Input type="password" placeholder="Nova senha" {...field} className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={resetForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-semibold">Confirmar Senha</FormLabel>
                                    <FormControl>
                                      <Input type="password" placeholder="Confirme a nova senha" {...field} className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 h-11">
                                <i className="fa-solid fa-check mr-2"></i>
                                Redefinir Senha
                              </Button>
                            </form>
                          </Form>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </form>
          </Form>

          {/* Register link with modern styling */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-gray-600 text-sm mb-3">Não possui uma conta?</p>
            <Link href="/register">
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-300"
                data-testid="link-register"
              >
                <i className="fa-solid fa-user-plus mr-2"></i>
                Criar Nova Conta
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}