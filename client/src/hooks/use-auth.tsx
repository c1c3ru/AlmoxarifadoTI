import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem("sgat-user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    // 🔒 SECURITY: o JWT passou a ser entregue só via cookie httpOnly.
    // Remove qualquer token residente de sessões antigas (pré-migração)
    // que ainda esteja acessível a JavaScript no navegador do usuário.
    localStorage.removeItem("sgat-token");
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("sgat-user", JSON.stringify(data.user));
      // O JWT chega em cookie httpOnly (Set-Cookie), nunca no corpo da
      // resposta — nada a armazenar aqui.
      return true;
    } catch (error) {
      // 403 = senha correta, mas conta ainda não liberada por um admin:
      // repassa a mensagem do servidor para a tela de login mostrar.
      const raw = error instanceof Error ? error.message : "";
      const pending = /^403: ([\s\S]*)$/.exec(raw);
      if (pending) {
        let message = "Sua conta ainda não foi liberada por um administrador.";
        try {
          message = JSON.parse(pending[1]).message || message;
        } catch {
          // corpo não-JSON: mantém a mensagem padrão
        }
        throw new Error(message, { cause: error });
      }
      console.error("[auth] Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sgat-user");
    // Cookie httpOnly não pode ser apagado via JavaScript: pede ao servidor
    // para limpá-lo. Best-effort — o estado local já foi limpo acima.
    apiRequest("POST", "/api/auth/logout").catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
