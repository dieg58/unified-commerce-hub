import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubdomain } from "@/components/SubdomainRouter";
import { useTranslation } from "react-i18next";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSubdomain, tenantSlug } = useSubdomain();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("auth.emailSent"), description: t("auth.emailSentDesc") });
        setIsForgot(false);
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, ...(isSubdomain && tenantSlug ? { tenant_slug: tenantSlug } : {}) } },
      });
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        toast({
          title: t("auth.accountCreated"),
          description: isSubdomain ? t("auth.accountCreatedSubdomain") : t("auth.accountCreatedDesc"),
        });
        setIsSignUp(false);
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else if (data.user) {
        // Fetch roles to determine correct redirect
        const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        const roles = rolesData?.map(r => r.role) || [];
        if (roles.includes("super_admin")) {
          navigate("/dashboard");
        } else if (roles.includes("shop_manager") || roles.includes("dept_manager")) {
          navigate("/tenant");
        } else {
          navigate(isSubdomain ? "/shop" : "/shop");
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isForgot ? t("auth.forgotPassword") : "INKOO B2B"}</h1>
          <p className="text-sm text-muted-foreground">
            {isForgot
              ? t("auth.forgotPasswordDesc")
              : isSignUp
                ? t("auth.createAccountDesc")
                : t("auth.loginDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isForgot && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">{t("auth.fullName")}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required={isSignUp} className="h-10" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">{t("auth.emailAddress")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="h-10" />
          </div>
          {!isForgot && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">{t("auth.password")}</Label>
                {!isSignUp && (
                  <button type="button" onClick={() => setIsForgot(true)} className="text-xs text-primary hover:underline">
                    {t("auth.forgotPasswordLink")}
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-10" />
            </div>
          )}
          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? t("common.loading") : isForgot ? t("auth.sendLink") : isSignUp ? t("auth.createMyAccount") : t("common.login")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isForgot ? (
            <button onClick={() => setIsForgot(false)} className="text-primary font-medium hover:underline">
              {t("auth.backToLogin")}
            </button>
          ) : (
            <>
              {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.noAccountYet")}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
                {isSignUp ? t("common.login") : t("common.signUp")}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
