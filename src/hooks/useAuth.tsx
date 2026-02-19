import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  roles: AppRole[];
  loading: boolean;
  isSuperAdmin: boolean;
  isShopManager: boolean;
  isDeptManager: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    roles: [],
    loading: true,
    isSuperAdmin: false,
    isShopManager: false,
    isDeptManager: false,
  });

  const fetchUserData = async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const profile = profileRes.data;
    const roles = (rolesRes.data?.map((r) => r.role) || []) as AppRole[];

    setState((prev) => ({
      ...prev,
      profile,
      roles,
      isSuperAdmin: roles.includes("super_admin"),
      isShopManager: roles.includes("shop_manager"),
      isDeptManager: roles.includes("dept_manager"),
      loading: false,
    }));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
        if (session?.user) {
          // Defer to avoid deadlock with Supabase auth
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setState((prev) => ({
            ...prev,
            profile: null,
            roles: [],
          isSuperAdmin: false,
          isShopManager: false,
          isDeptManager: false,
            loading: false,
          }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
