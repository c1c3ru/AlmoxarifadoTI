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
    toast({
      title: "Solicitação enviada",
      description: `Se existir uma conta para "${data.usernameOrEmail}", enviaremos instruções de recuperação.`,
    });
    recoverForm.reset();
  };

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    toast({
      title: "Senha redefinida",
      description: "Se o código for válido, a senha foi atualizada.",
    });
    resetForm.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmNGY2ZjgiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiPjwvY2lyY2xlPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
      
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-20"></div>
            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner">
                IFCE
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SGAT-TI
          </CardTitle>
          <p className="text-gray-600 font-medium">Sistema de Gestão de Almoxarifado de T.I.</p>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto mt-2"></div>
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
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg">
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
                                name="username"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-semibold">Usuário</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Seu usuário" {...field} className="h-10" />
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

          {/* Demo credentials with modern styling */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                <i className="fa-solid fa-info-circle mr-1 text-blue-500"></i>
                Contas de Demonstração
              </p>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="bg-white rounded-lg p-2 border">
                  <span className="font-semibold text-blue-700">Admin:</span> admin / admin123
                </div>
                <div className="bg-white rounded-lg p-2 border">
                  <span className="font-semibold text-green-700">Técnico:</span> tech / tech123
                </div>
              </div>
            </div>
          </div>

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