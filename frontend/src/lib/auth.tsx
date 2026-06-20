import React from "react";
import { apiMe, apiLogin, apiLogout, type User } from "./queries";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (usr: string, pwd: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = React.createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiMe()
      .then((u) => setUser(u && u.email !== "Guest" ? u : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (usr: string, pwd: string) => {
    const u = await apiLogin(usr, pwd);
    setUser(u);
    return u;
  };
  const logout = async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  };
  const refresh = async () => {
    const u = await apiMe().catch(() => null);
    setUser(u && u.email !== "Guest" ? u : null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => React.useContext(Ctx);
