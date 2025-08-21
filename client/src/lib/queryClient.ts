import { QueryClient, QueryFunction } from "@tanstack/react-query";

let isRedirecting401 = false;
function handleUnauthorizedRedirect() {
  if (typeof window === 'undefined') return;
  if (isRedirecting401) return;
  isRedirecting401 = true;
  try {
    localStorage.removeItem('sgat-user');
    localStorage.removeItem('sgat-token');
  } catch {}
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (!current.startsWith('/login')) {
    window.location.assign('/login');
  } else {
    // já está no login, apenas força atualização do estado
    window.location.reload();
  }
}

function buildUrl(input: string): string {
  const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '';
  const path = input.startsWith('/') ? input : `/${input}`;
  // Se base vier com trailing slash, evita duplicar
  if (!base) return path;
  return base.endsWith('/') ? `${base.slice(0, -1)}${path}` : `${base}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorizedRedirect();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const finalUrl = buildUrl(url);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sgat-token') : null;
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const finalUrl = buildUrl(queryKey.join("/") as string);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sgat-token') : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(finalUrl, {
      credentials: "include",
      headers,
    });

    if (res.status === 401) {
      handleUnauthorizedRedirect();
      if (unauthorizedBehavior === "returnNull") {
        return null as any;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
