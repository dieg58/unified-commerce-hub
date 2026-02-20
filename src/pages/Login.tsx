import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubdomain } from "@/components/SubdomainRouter";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSubdomain } = useSubdomain();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created", description: "You can now sign in." });
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        navigate(isSubdomain ? "/shop" : "/dashboard");
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
          <h1 className="text-2xl font-bold text-foreground">INKOO B2B</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? "Créez votre compte pour accéder à votre boutique entreprise."
              : "Connectez-vous pour gérer vos commandes et accéder à votre catalogue personnalisé."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">Nom complet</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required={isSignUp}
                className="h-10"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Adresse email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="h-10"
            />
          </div>
          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? "Chargement…" : isSignUp ? "Créer mon compte" : "Se connecter"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
