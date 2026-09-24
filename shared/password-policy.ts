import { z } from "zod";

// Política de senha usada na redefinição de senha (mesmas regras do cadastro
// em client/src/pages/register.tsx). Compartilhada entre cliente e servidor
// para que a validação do backend não dependa da interface.
export const passwordPolicy = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres")
  .regex(/(?=.*[a-z])/, "Inclua pelo menos uma letra minúscula")
  .regex(/(?=.*[A-Z])/, "Inclua pelo menos uma letra maiúscula")
  .regex(/(?=.*\d)/, "Inclua pelo menos um número")
  .regex(/(?=.*[^\w\s])/, "Inclua pelo menos um símbolo especial");
