import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export type Role = "operator" | "supervisor" | "programmer" | "superuser";

interface AuthContextValue {
  role: Role | null;
  testingMode: boolean;
  isLoading: boolean;
  login: (role: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTestingMode: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

const ROLE_DEFAULTS: Record<Role, string> = {
  operator: "/upload",
  supervisor: "/",
  programmer: "/prompts",
  superuser: "/",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [testingMode, setTestingModeState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) {
          setRole(data.role as Role);
          setTestingModeState(data.testingMode ?? false);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (roleArg: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: roleArg, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Invalid credentials");
    }
    const data = await res.json();
    setRole(data.role as Role);
    setTestingModeState(data.testingMode ?? false);
    setLocation(ROLE_DEFAULTS[data.role as Role] ?? "/");
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setRole(null);
    setTestingModeState(false);
    queryClient.clear();
    // Clear session upload history
    sessionStorage.removeItem("wv_session_uploads");
    setLocation("/upload");
  };

  const setTestingMode = async (enabled: boolean) => {
    const res = await fetch("/api/auth/testing-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setTestingModeState(enabled);
    }
  };

  return (
    <AuthContext.Provider value={{ role, testingMode, isLoading, login, logout, setTestingMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
