import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Política de senha robusta seguindo práticas de segurança
const passwordPolicy = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres")
  .regex(/(?=.*[a-z])/, "Inclua pelo menos uma letra minúscula")
  .regex(/(?=.*[A-Z])/, "Inclua pelo menos uma letra maiúscula")
  .regex(/(?=.*\d)/, "Inclua pelo menos um número")
  .regex(/(?=.*[^\w\s])/, "Inclua pelo menos um símbolo especial");

const registerSchema = z
  .object({
    role: z.enum(["admin", "tech"], {
      required_error: "Perfil é obrigatório",
    }),
    name: z.string()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100, "Nome deve ter no máximo 100 caracteres")
      .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
    email: z.string()
      .email("Email inválido")
      .max(255, "Email deve ter no máximo 255 caracteres")
      .toLowerCase(),
    matricula: z.string()
      .min(1, "Matrícula é obrigatória")
      .regex(/^\d+$/, "Matrícula deve conter apenas números"),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .superRefine((val, ctx) => {
    // Validação de matrícula baseada no perfil
    const techLen = 15; // Técnico: 202523310400001 -> 15 caracteres
    const adminLen = 7;  // Administrador: 1678389 -> 7 caracteres
    
    if (val.role === "tech" && val.matricula.length !== techLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrícula de técnico deve ter exatamente ${techLen} dígitos`,
        path: ["matricula"],
      });
    }
    
    if (val.role === "admin" && val.matricula.length !== adminLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrícula de administrador deve ter exatamente ${adminLen} dígitos`,
        path: ["matricula"],
      });
    }

    // Validações de segurança para senha
    if (val.password === val.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A senha não pode ser igual ao email",
        path: ["password"],
      });
    }
    
    if (val.password === val.matricula) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A senha não pode ser igual à matrícula",
        path: ["password"],
      });
    }
    
    if (val.password.toLowerCase().includes(val.name.toLowerCase().split(' ')[0])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A senha não pode conter seu nome",
        path: ["password"],
      });
    }
    
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "As senhas não conferem",
        path: ["confirmPassword"],
      });
    }
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterUserPage() {
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "tech",
      name: "",
      email: "",
      matricula: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // Observa o valor do perfil para mostrar placeholder dinâmico
  const selectedRole = form.watch("role");
  
  const matriculaConfig = useMemo(() => {
    if (selectedRole === "admin") {
      return {
        placeholder: "Ex: 1678389 (7 dígitos)",
        maxLength: 7,
        description: "Matrícula do servidor administrativo"
      };
    }
    return {
      placeholder: "Ex: 202523310400001 (15 dígitos)",
      maxLength: 15,
      description: "Matrícula do técnico em informática"
    };
  }, [selectedRole]);

  const disabled = useMemo(() => 
    !form.formState.isValid || form.formState.isSubmitting, 
    [form.formState]
  );

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Payload seguro para criação de usuário
      const payload = {
        username: data.email.toLowerCase().trim(),
        email: data.email.toLowerCase().trim(),
        matricula: data.matricula.trim(),
        password: data.password,
        name: data.name.trim(),
        role: data.role,
        isActive: true,
      };

      const res = await apiRequest("POST", "/api/users", payload);

      if (!res.ok) {
        const status = res.status;
        const errBody = await res.json().catch(() => ({} as any));
        const rawMsg = (errBody?.message ?? "").toString();
        const msg = rawMsg.toLowerCase();

        // 1) Mapear erros de validação do backend (Zod)
        const issues = Array.isArray(errBody?.errors) ? errBody.errors : [];
        if (issues.length > 0) {
          for (const issue of issues) {
            const path = (issue?.path?.[0] ?? "") as keyof RegisterFormData;
            const message = (issue?.message ?? "Campo inválido").toString();
            if (path && form.getFieldState(path)) {
              form.setError(path, { type: "server", message });
            }
          }
        }

        // 2) Duplicidade: matrícula / username / email
        const looksLikeDuplicate =
          status === 409 || /duplicate|unique constraint|violates unique/.test(msg);

        if (looksLikeDuplicate || /matr[íi]cula/.test(msg)) {
          form.setError("matricula", { type: "manual", message: "Matrícula já cadastrada" });
          throw new Error("Matrícula já cadastrada");
        }

        if (/username|usuário/.test(msg)) {
          form.setError("email", { type: "manual", message: "Usuário já existe" });
          // Também pode marcar username se existir no form, mas aqui username = email
          throw new Error("Usuário já existe");
        }

        if (/email/.test(msg)) {
          form.setError("email", { type: "manual", message: "Email já cadastrado" });
          throw new Error("Email já cadastrado");
        }

        throw new Error(rawMsg || "Erro ao cadastrar usuário");
      }

      toast({
        title: "Usuário cadastrado com sucesso",
        description: `${data.role === 'admin' ? 'Administrador' : 'Técnico'} ${data.name} foi adicionado ao sistema.`,
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Falha no cadastro",
        description: error?.message || "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-gray-200 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 shadow-lg">
              <i className="fa-solid fa-user-plus text-white text-xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastrar Usuário</h1>
            <p className="text-sm text-gray-600">Adicione um novo usuário ao sistema</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Perfil/Role vem primeiro para definir tipo de matrícula */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Perfil do Usuário *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role" className="h-11">
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tech">
                          <div className="flex items-center">
                            <i className="fa-solid fa-screwdriver-wrench mr-2 text-blue-600"></i>
                            Técnico em Informática
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center">
                            <i className="fa-solid fa-user-tie mr-2 text-purple-600"></i>
                            Administrador
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Nome Completo *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o nome completo" 
                        {...field} 
                        data-testid="input-name"
                        className="h-11"
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Email Institucional *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="usuario@instituicao.edu.br" 
                        {...field} 
                        data-testid="input-email"
                        className="h-11"
                        maxLength={255}
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="matricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Matrícula {selectedRole === 'admin' ? 'Administrativa' : 'de Técnico'} *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={matriculaConfig.placeholder}
                        {...field} 
                        data-testid="input-matricula"
                        className="h-11"
                        maxLength={matriculaConfig.maxLength}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">{matriculaConfig.description}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Senha de Acesso *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Crie uma senha segura"
                        {...field} 
                        data-testid="input-password"
                        className="h-11"
                        maxLength={128}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">
                      Mín. 8 caracteres, com maiúscula, minúscula, número e símbolo
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Confirmar Senha *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Digite a senha novamente"
                        {...field} 
                        data-testid="input-confirm-password"
                        className="h-11"
                        maxLength={128}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold shadow-lg transition disabled:from-sky-300 disabled:to-blue-300 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" 
                disabled={disabled} 
                data-testid="button-submit"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Cadastrando usuário...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-check mr-2 text-white/90"></i>
                    Cadastrar Usuário
                  </>
                )}
              </Button>

              {disabled && (
                <p className="text-xs text-gray-500 text-center -mt-1">
                  Preencha os campos obrigatórios corretamente para habilitar o botão.
                </p>
              )}

              <div className="text-center pt-4 border-t border-gray-200">
                <Link href="/login">
                  <Button variant="ghost" className="text-sm text-gray-600 hover:text-primary-600">
                    <i className="fa-solid fa-arrow-left mr-2"></i>
                    Voltar para o Login
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}