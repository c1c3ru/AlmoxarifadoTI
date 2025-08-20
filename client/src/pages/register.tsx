import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const passwordPolicy = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/(?=.*[a-z])/, "Inclua pelo menos uma letra minúscula")
  .regex(/(?=.*[A-Z])/, "Inclua pelo menos uma letra maiúscula")
  .regex(/(?=.*\d)/, "Inclua pelo menos um número")
  .regex(/(?=.*[^\w\s])/, "Inclua pelo menos um símbolo");

const registerSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("Email inválido"),
    matricula: z.string().min(1, "Matrícula é obrigatória"),
    role: z.enum(["admin", "tech"], {
      required_error: "Perfil é obrigatório",
    }),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .superRefine((val, ctx) => {
    const techLen = 15; // 202523310400001 -> 15 caracteres
    const adminLen = 7; // 1678389 -> 7 caracteres
    if (val.role === "tech" && val.matricula.length !== techLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Para perfil Técnico a matrícula deve ter exatamente ${techLen} caracteres`,
        path: ["matricula"],
      });
    }
    if (val.role === "admin" && val.matricula.length !== adminLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Para perfil Administrador a matrícula deve ter exatamente ${adminLen} caracteres`,
        path: ["matricula"],
      });
    }
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
      name: "",
      email: "",
      matricula: "",
      role: "tech",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const disabled = useMemo(() => !form.formState.isValid || form.formState.isSubmitting, [form.formState]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Mapeia para o endpoint existente /api/users
      // Definimos username = email e password = informado pelo usuário com validação
      const payload = {
        username: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        isActive: true,
      };
      const res = await apiRequest("POST", "/api/users", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Erro ao cadastrar usuário");
      }
      toast({
        title: "Usuário cadastrado",
        description: "Cadastro realizado com sucesso.",
      });
      form.reset();
    } catch (error: any) {
      toast({
        title: "Falha no cadastro",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-lg bg-primary-600 flex items-center justify-center mb-3">
              <i className="fas fa-user-plus text-white"></i>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Cadastrar Usuário</h1>
            <p className="text-sm text-gray-500">Preencha os dados obrigatórios abaixo</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} data-testid="input-name" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-email" />
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
                    <FormLabel>Matrícula</FormLabel>
                    <FormControl>
                      <Input placeholder="Informe a matrícula" {...field} data-testid="input-matricula" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tech">Técnico</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700" disabled={disabled} data-testid="button-submit">
                {form.formState.isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Cadastrar
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Observação: o login será realizado com o email e a senha inicial será a própria matrícula.
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
