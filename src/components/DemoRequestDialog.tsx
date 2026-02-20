import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DemoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DemoRequestDialog = ({ open, onOpenChange }: DemoRequestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.company.trim()) return;

    setLoading(true);
    try {
      // Save to DB
      const { error: dbError } = await supabase
        .from("demo_requests")
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          phone: form.phone.trim() || null,
          message: form.message.trim() || null,
        });

      if (dbError) console.error("DB save error:", dbError);

      // Send email
      const { error: fnError } = await supabase.functions.invoke("send-demo-request", {
        body: form,
      });

      if (fnError) console.error("Email send error:", fnError);

      setSuccess(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setSuccess(false);
        setForm({ full_name: "", email: "", company: "", phone: "", message: "" });
      }, 300);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Demander une démo</DialogTitle>
          <DialogDescription>
            Remplissez le formulaire et nous vous recontacterons rapidement.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="text-center text-lg font-medium">Merci ! Nous reviendrons vers vous très vite.</p>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel *</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Entreprise *</Label>
              <Input id="company" name="company" value={form.company} onChange={handleChange} required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" value={form.message} onChange={handleChange} rows={3} maxLength={1000} placeholder="Parlez-nous de vos besoins en merch…" />
            </div>
            <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Envoyer ma demande
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DemoRequestDialog;
