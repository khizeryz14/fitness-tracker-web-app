import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken, setUnauthorizedHandler, type RegisterPayload } from "./lib/api";

interface AuthValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(getToken());

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    queryClient.clear(); // never show one user's cached data to the next
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t } = await api.login(email, password);
    setToken(t);
    setTokenState(t);
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await api.register(payload);
      await login(payload.email, payload.password);
    },
    [login],
  );

  // If the API ever answers 401 for a logged-in user (expired token), sign out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(() => ({ token, login, register, logout }), [token, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
