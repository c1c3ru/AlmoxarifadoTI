// Helpers de log que nunca gravam o objeto de erro bruto (evita vazar
// detalhes de infraestrutura — query/tabela/constraint do driver do banco —
// nos logs do servidor). Sempre extraem apenas message/code.

function safeErrorInfo(error: unknown): unknown {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    return code ? `${error.message} (code: ${code})` : error.message;
  }
  return error;
}

export function logError(label: string, error: unknown) {
  console.error(label, safeErrorInfo(error));
}

export function logWarn(label: string, error: unknown) {
  console.warn(label, safeErrorInfo(error));
}
