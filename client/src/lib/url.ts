export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Constrói uma URL de API com query params corretamente encodados.
 * Mantém o path exatamente como fornecido (presumindo que já começa com "/api/").
 */
export function buildApiUrl(path: string, params?: QueryParams): string {
  const finalPath = path.startsWith("/") ? path : `/${path}`;
  if (!params) return finalPath;

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    // Evita adicionar strings vazias
    if (typeof value === "string" && value.trim() === "") continue;
    qs.set(key, String(value));
  }

  const query = qs.toString();
  return query ? `${finalPath}?${query}` : finalPath;
}
