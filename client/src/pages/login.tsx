import { useState } from "react";
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
import ifceLogo from "@publicAssets/ifce_logo.png";
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
    username: z.string().min(1, "Usuário é obrigatório"),
    code: z.string().min(4, "Código inválido"),
    newPassword: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a nova senha"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "As senhas não conferem",
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
    defaultValues: { username: "", code: "", newPassword: "", confirmPassword: "" },
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
    // Placeholder: aqui poderemos chamar POST /api/auth/forgot
    toast({
      title: "Solicitação enviada",
      description: `Se existir uma conta para "${data.usernameOrEmail}", enviaremos instruções de recuperação.`,
    });
    recoverForm.reset();
  };

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    // Placeholder: aqui poderemos chamar POST /api/auth/reset
    toast({
      title: "Senha redefinida",
      description: "Se o código for válido, a senha foi atualizada.",
    });
    resetForm.reset();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src={ifceLogo}
            alt="IFCE"
            className="h-16 w-auto mx-auto mb-4 select-none"
            draggable={false}
          />
          <CardTitle className="text-2xl font-bold text-gray-900">SGAT-TI</CardTitle>
          <p className="text-sm text-gray-500">Sistema de Gestão de Almoxarifado de T.I.</p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu nome de usuário"
                        {...field}
                        data-testid="input-username"
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-600 hover:bg-primary-700"
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Entrando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Entrar
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <div />
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-primary-600 hover:underline">
                      Esqueceu a senha?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Recuperar acesso</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="recover">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="recover">Recuperar</TabsTrigger>
                        <TabsTrigger value="reset">Redefinir</TabsTrigger>
                      </TabsList>

                      <TabsContent value="recover" className="mt-4">
                        <Form {...recoverForm}>
                          <form onSubmit={recoverForm.handleSubmit(onRecover)} className="space-y-3">
                            <FormField
                              control={recoverForm.control}
                              name="usernameOrEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Usuário ou Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="usuario ou email" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700">
                              Enviar instruções
                            </Button>
                            <p className="text-xs text-gray-500">
                              Você receberá um código para redefinir sua senha.
                            </p>
                          </form>
                        </Form>
                      </TabsContent>

                      <TabsContent value="reset" className="mt-4">
                        <Form {...resetForm}>
                          <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-3">
                            <FormField
                              control={resetForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Usuário</FormLabel>
                                  <FormControl>
                                    <Input placeholder="usuario" {...field} />
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
                                  <FormLabel>Código</FormLabel>
                                  <FormControl>
                                    <Input placeholder="código recebido" {...field} />
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
                                  <FormLabel>Nova senha</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="nova senha" {...field} />
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
                                  <FormLabel>Confirmar senha</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="confirme a nova senha" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700">
                              Redefinir senha
                            </Button>
                          </form>
                        </Form>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>

            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Usuário demo: admin / Senha: admin123</p>
            <p>Usuário demo: tech / Senha: tech123</p>
            <div className="mt-4">
              <span className="mr-1">Não tem conta?</span>
              <Link
                href="/register"
                className="text-primary-600 hover:underline"
                data-testid="link-register"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
