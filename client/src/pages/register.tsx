import { useMemo } from "react";
import ifceLogo from "@publicAssets/ifce_logo.png";
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
    const techLen = 14;  // Aluno/técnico: 20261193010007 -> 14 dígitos
    const adminLen = 7;  // Servidor/administrador (SIAPE): 1678389 -> 7 dígitos

    if (val.role === "tech" && val.matricula.length !== techLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrícula de aluno/técnico deve ter exatamente ${techLen} dígitos`,
        path: ["matricula"],
      });
    }

    if (val.role === "admin" && val.matricula.length !== adminLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrícula de servidor deve ter exatamente ${adminLen} dígitos`,
        path: ["matricula"],
      });
    }

    // Se a matrícula de servidor está na lista autorizada é checado só pelo
    // servidor (server/allowed-admins.ts), nunca no bundle público do cliente.
    // A conta de servidor é criada inativa e precisa ser ativada por um admin.

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
    if (selectedRole === "tech") {
      return {
        placeholder: "Ex: 20261193010007 (14 dígitos)",
        maxLength: 14,
        description: "Matrícula acadêmica do aluno/técnico (14 dígitos)"
      };
    }

    // Admin default
    return {
      placeholder: "Ex: 1678389 (7 dígitos)",
      maxLength: 7,
      description: "Matrícula SIAPE do servidor (7 dígitos). A conta precisa ser ativada por um administrador."
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

      // Usar rota pública de registro (não requer autenticação).
      // apiRequest lança Error("<status>: <corpo>") quando a resposta não é 2xx;
      // o corpo JSON é lido aqui para mostrar só a mensagem, não o JSON cru.
      try {
        await apiRequest("POST", "/api/register", payload);
      } catch (requestError) {
        const raw = requestError instanceof Error ? requestError.message : "";
        const match = /^(\d{3}): ([\s\S]*)$/.exec(raw);
        if (!match) throw requestError;

        const status = Number(match[1]);
        let errBody: { message?: unknown; errors?: unknown } = {};
        try {
          errBody = JSON.parse(match[2]);
        } catch {
          errBody = { message: match[2] };
        }
        const rawMsg = (errBody.message ?? "").toString();
        const msg = rawMsg.toLowerCase();

        // 1) Erros de validação do backend (Zod) vão para o campo correspondente
        const issues = Array.isArray(errBody.errors) ? errBody.errors : [];
        let firstIssueMessage = "";
        for (const issue of issues) {
          const path = (issue?.path?.[0] ?? "") as keyof RegisterFormData;
          const message = (issue?.message ?? "Campo inválido").toString();
          firstIssueMessage ||= message;
          if (path && form.getFieldState(path)) {
            form.setError(path, { type: "server", message });
          }
        }

        // 2) Duplicidade: matrícula / username / email (409)
        if (status === 409) {
          if (/matr[íi]cula/.test(msg)) {
            form.setError("matricula", { type: "manual", message: "Matrícula já cadastrada" });
            throw new Error("Matrícula já cadastrada", { cause: requestError });
          }
          if (/email|usu[áa]rio/.test(msg)) {
            form.setError("email", { type: "manual", message: rawMsg || "Email já cadastrado" });
            throw new Error(rawMsg || "Email já cadastrado", { cause: requestError });
          }
        }

        if (status === 429) {
          throw new Error(rawMsg || "Muitas tentativas. Aguarde alguns minutos e tente novamente.", { cause: requestError });
        }

        throw new Error(firstIssueMessage || rawMsg || "Erro ao cadastrar usuário", { cause: requestError });
      }

      if (data.role === "admin") {
        toast({
          title: "Cadastro enviado",
          description: `${data.name}, sua conta de servidor foi criada e aguarda a ativação por um administrador.`,
        });
      } else {
        toast({
          title: "Usuário cadastrado com sucesso",
          description: `Aluno/técnico ${data.name} foi adicionado ao sistema.`,
        });
      }

      form.reset();
    } catch (error: unknown) {
      toast({
        title: "Falha no cadastro",
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-gray-200 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center mb-4 shadow-lg">
              <img
                src={ifceLogo}
                alt="IFCE"
                className="h-10 w-auto object-contain brightness-0 invert opacity-90"
                loading="eager"
                decoding="async"
              />
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
                render={({ field, fieldState }) => {
                  const hasError = fieldState.error;
                  const isEmpty = !field.value;
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm font-medium flex items-center ${hasError ? 'text-red-600' : isEmpty ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                        <i className={`fa-solid fa-user-tag mr-2 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : 'text-blue-500'
                          }`}></i>
                        Perfil do Usuário *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role" className={`h-11 transition-colors ${hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                            isEmpty ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200' :
                              'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200'
                            }`}>
                            <SelectValue placeholder="Selecione o perfil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tech">
                            <div className="flex items-center">
                              <i className="fa-solid fa-screwdriver-wrench mr-2 text-blue-600"></i>
                              Aluno / Técnico
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <i className="fa-solid fa-user-tie mr-2 text-purple-600"></i>
                              Servidor / Administrador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-600 font-medium flex items-center mt-2">
                        {hasError && <i className="fa-solid fa-exclamation-triangle mr-2"></i>}
                      </FormMessage>
                      {isEmpty && !hasError && (
                        <p className="text-orange-600 text-sm flex items-center mt-2">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Campo obrigatório
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => {
                  const hasError = fieldState.error;
                  const isEmpty = !field.value?.trim();
                  const isValid = field.value?.trim() && !hasError;
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm font-medium flex items-center ${hasError ? 'text-red-600' : isEmpty ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                        <i className={`fa-solid fa-user mr-2 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : isValid ? 'text-green-500' : 'text-blue-500'
                          }`}></i>
                        Nome Completo *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Digite o nome completo"
                            {...field}
                            data-testid="input-name"
                            className={`h-11 placeholder:text-gray-400 pr-10 transition-colors ${hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                              isEmpty ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200' :
                                isValid ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200' :
                                  'border-gray-300'
                              }`}
                            maxLength={100}
                          />
                          {isValid && (
                            <i className="fa-solid fa-check absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500"></i>
                          )}
                          {hasError && (
                            <i className="fa-solid fa-exclamation-triangle absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500"></i>
                          )}
                          {isEmpty && !hasError && (
                            <i className="fa-solid fa-info-circle absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500"></i>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600 font-medium flex items-center mt-2">
                        {hasError && <i className="fa-solid fa-exclamation-triangle mr-2"></i>}
                      </FormMessage>
                      {isEmpty && !hasError && (
                        <p className="text-orange-600 text-sm flex items-center mt-2">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Campo obrigatório
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => {
                  const hasError = fieldState.error;
                  const isEmpty = !field.value?.trim();
                  const isValid = field.value?.trim() && !hasError;
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm font-medium flex items-center ${hasError ? 'text-red-600' : isEmpty ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                        <i className={`fa-solid fa-envelope mr-2 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : isValid ? 'text-green-500' : 'text-blue-500'
                          }`}></i>
                        Email Institucional *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="usuario@instituicao.edu.br"
                            {...field}
                            data-testid="input-email"
                            className={`h-11 placeholder:text-gray-400 pr-10 transition-colors ${hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                              isEmpty ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200' :
                                isValid ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200' :
                                  'border-gray-300'
                              }`}
                            maxLength={255}
                            autoComplete="email"
                          />
                          {isValid && (
                            <i className="fa-solid fa-check absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500"></i>
                          )}
                          {hasError && (
                            <i className="fa-solid fa-exclamation-triangle absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500"></i>
                          )}
                          {isEmpty && !hasError && (
                            <i className="fa-solid fa-info-circle absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500"></i>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600 font-medium flex items-center mt-2">
                        {hasError && <i className="fa-solid fa-exclamation-triangle mr-2"></i>}
                      </FormMessage>
                      {isEmpty && !hasError && (
                        <p className="text-orange-600 text-sm flex items-center mt-2">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Campo obrigatório
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="matricula"
                render={({ field, fieldState }) => {
                  const hasError = fieldState.error;
                  const isEmpty = !field.value?.trim();
                  const isValid = field.value?.trim() && !hasError;
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm font-medium flex items-center ${hasError ? 'text-red-600' : isEmpty ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                        <i className={`fa-solid fa-id-card mr-2 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : isValid ? 'text-green-500' : 'text-blue-500'
                          }`}></i>
                        Matrícula {selectedRole === 'admin' ? 'Administrativa' : 'de Técnico'} *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={matriculaConfig.placeholder}
                            {...field}
                            data-testid="input-matricula"
                            className={`h-11 placeholder:text-gray-400 pr-10 transition-colors ${hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                              isEmpty ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200' :
                                isValid ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200' :
                                  'border-gray-300'
                              }`}
                            maxLength={matriculaConfig.maxLength}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            autoComplete="off"
                          />
                          {isValid && (
                            <i className="fa-solid fa-check absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500"></i>
                          )}
                          {hasError && (
                            <i className="fa-solid fa-exclamation-triangle absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500"></i>
                          )}
                          {isEmpty && !hasError && (
                            <i className="fa-solid fa-info-circle absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500"></i>
                          )}
                        </div>
                      </FormControl>
                      <p className={`text-xs mt-1 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : 'text-gray-500'
                        }`}>{matriculaConfig.description}</p>
                      <FormMessage className="text-red-600 font-medium flex items-center mt-2">
                        {hasError && <i className="fa-solid fa-exclamation-triangle mr-2"></i>}
                      </FormMessage>
                      {isEmpty && !hasError && (
                        <p className="text-orange-600 text-sm flex items-center mt-2">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Campo obrigatório
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => {
                  const hasError = fieldState.error;
                  const isEmpty = !field.value?.trim();
                  const isValid = field.value?.trim() && !hasError;
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm font-medium flex items-center ${hasError ? 'text-red-600' : isEmpty ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                        <i className={`fa-solid fa-lock mr-2 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : isValid ? 'text-green-500' : 'text-blue-500'
                          }`}></i>
                        Senha de Acesso *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Crie uma senha segura"
                            {...field}
                            data-testid="input-password"
                            className={`h-11 placeholder:text-gray-400 pr-10 transition-colors ${hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                              isEmpty ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200' :
                                isValid ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200' :
                                  'border-gray-300'
                              }`}
                            maxLength={128}
                            autoComplete="new-password"
                          />
                          {isValid && (
                            <i className="fa-solid fa-check absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500"></i>
                          )}
                          {hasError && (
                            <i className="fa-solid fa-exclamation-triangle absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500"></i>
                          )}
                          {isEmpty && !hasError && (
                            <i className="fa-solid fa-info-circle absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500"></i>
                          )}
                        </div>
                      </FormControl>
                      <p className={`text-xs mt-1 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : 'text-gray-500'
                        }`}>
                        Mín. 8 caracteres, com maiúscula, minúscula, número e símbolo
                      </p>
                      <FormMessage className="text-red-600 font-medium flex items-center mt-2">
                        {hasError && <i className="fa-solid fa-exclamation-triangle mr-2"></i>}
                      </FormMessage>
                      {isEmpty && !hasError && (
                        <p className="text-orange-600 text-sm flex items-center mt-2">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Campo obrigatório
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => {
                  const hasError = fieldState.error;
                  const isEmpty = !field.value?.trim();
                  const isValid = field.value?.trim() && !hasError;
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm font-medium flex items-center ${hasError ? 'text-red-600' : isEmpty ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                        <i className={`fa-solid fa-lock-open mr-2 ${hasError ? 'text-red-500' : isEmpty ? 'text-orange-500' : isValid ? 'text-green-500' : 'text-blue-500'
                          }`}></i>
                        Confirmar Senha *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Digite a senha novamente"
                            {...field}
                            data-testid="input-confirm-password"
                            className={`h-11 placeholder:text-gray-400 pr-10 transition-colors ${hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                              isEmpty ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200' :
                                isValid ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200' :
                                  'border-gray-300'
                              }`}
                            maxLength={128}
                            autoComplete="new-password"
                          />
                          {isValid && (
                            <i className="fa-solid fa-check absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500"></i>
                          )}
                          {hasError && (
                            <i className="fa-solid fa-exclamation-triangle absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500"></i>
                          )}
                          {isEmpty && !hasError && (
                            <i className="fa-solid fa-info-circle absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500"></i>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600 font-medium flex items-center mt-2">
                        {hasError && <i className="fa-solid fa-exclamation-triangle mr-2"></i>}
                      </FormMessage>
                      {isEmpty && !hasError && (
                        <p className="text-orange-600 text-sm flex items-center mt-2">
                          <i className="fa-solid fa-info-circle mr-2"></i>
                          Campo obrigatório
                        </p>
                      )}
                    </FormItem>
                  );
                }}
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 -mt-1">
                  <p className="text-sm text-orange-700 text-center flex items-center justify-center">
                    <i className="fa-solid fa-info-circle mr-2"></i>
                    Preencha todos os campos obrigatórios corretamente para habilitar o cadastro.
                  </p>
                </div>
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
