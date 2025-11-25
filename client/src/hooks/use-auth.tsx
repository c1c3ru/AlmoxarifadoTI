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
      // Se o servidor estiver com JWT habilitado, virá um token
      if (data.token) {
        localStorage.setItem("sgat-token", data.token as string);
        console.log("[auth] Token salvo no localStorage:", data.token.substring(0, 20) + "...");
      } else {
        // Garante limpeza caso tenha token antigo
        localStorage.removeItem("sgat-token");
        console.log("[auth] Nenhum token recebido do servidor");
      }
      console.log("[auth] Login bem-sucedido para:", username);
      return true;
    } catch (error) {
      console.error("[auth] Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sgat-user");
    localStorage.removeItem("sgat-token");
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
