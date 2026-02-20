import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
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

  const initialLoadDone = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
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
      }));
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }, []);

  const clearUserData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      profile: null,
      roles: [],
      isSuperAdmin: false,
      isShopManager: false,
      isDeptManager: false,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1) Set up listener for ONGOING auth changes ONLY (after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        // Always update session/user
        setState((prev) => ({ ...prev, session, user: session?.user ?? null }));

        // Only fetch roles on SUBSEQUENT changes (not initial load)
        if (!initialLoadDone.current) return;

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            if (isMounted) fetchUserData(session.user.id);
          }, 0);
        } else {
          clearUserData();
        }
      }
    );

    // 2) INITIAL load: get session, fetch roles, THEN set loading=false
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setState((prev) => ({ ...prev, session, user: session?.user ?? null }));

        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        if (isMounted) {
          initialLoadDone.current = true;
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, clearUserData]);

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
