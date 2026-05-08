import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true on first mount
  const queryClient = useQueryClient();

  // On mount: if tokens exist, fetch current user
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/v1/users/me/")
      .then((res) => setUser(res.data))
      .catch(() => {
        // Token invalid or expired past refresh — clear storage
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    // Drop any cached queries from the previous session before fetching the
    // new user's data — otherwise components briefly render the old user's
    // projects/stats/todos from cache until the refetch resolves.
    queryClient.clear();
    const { data } = await api.post("/v1/auth/token/", { email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    // Fetch user profile
    const me = await api.get("/v1/users/me/");
    setUser(me.data);
    return me.data;
  }, [queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const register = useCallback(async (payload) => {
    await api.post("/v1/users/register/", payload);
    // Auto-login after registration
    return login(payload.email, payload.password);
  }, [login]);

  // Re-fetch the current user. Call this after mutations that change team
  // membership or the active team so the auth context reflects the latest
  // server state — components that read `user.active_team` will re-render.
  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/v1/users/me/");
    setUser(data);
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
