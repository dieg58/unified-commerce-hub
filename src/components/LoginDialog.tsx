import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

const LoginDialog = ({ open, onOpenChange, redirectTo }: LoginDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email envoyé", description: "Consultez votre boîte mail pour réinitialiser votre mot de passe." });
        setIsForgot(false);
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Compte créé", description: "Vérifiez votre email pour confirmer votre compte." });
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        onOpenChange(false);
        navigate(redirectTo || "/dashboard");
      }
    }
    setLoading(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setIsSignUp(false);
        setIsForgot(false);
        setEmail("");
        setPassword("");
        setFullName("");
      }, 300);
    }
    onOpenChange(open);
  };

  const title = isForgot ? "Mot de passe oublié" : isSignUp ? "Créer un compte" : "Se connecter";
  const description = isForgot
    ? "Entrez votre email pour recevoir un lien de réinitialisation."
    : isSignUp
      ? "Remplissez les informations pour créer votre compte."
      : "Connectez-vous à votre espace Inkoo.";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isForgot && (
            <div className="space-y-2">
              <Label htmlFor="login-name">Nom complet</Label>
              <Input
                id="login-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                required={isSignUp}
                maxLength={100}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              required
              maxLength={255}
            />
          </div>
          {!isForgot && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Mot de passe</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}
          <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isForgot ? "Envoyer le lien" : isSignUp ? "Créer mon compte" : "Se connecter"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isForgot ? (
            <button onClick={() => setIsForgot(false)} className="text-primary font-medium hover:underline">
              Retour à la connexion
            </button>
          ) : (
            <>
              {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? "Se connecter" : "Créer un compte"}
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
