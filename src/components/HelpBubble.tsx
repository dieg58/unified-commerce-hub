import { useState } from "react";
import { MessageCircleQuestion, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const HelpBubble = () => {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { profile, isShopManager, isDeptManager } = useAuth();
  const { t } = useTranslation();

  if (!isShopManager && !isDeptManager) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-help-request", {
        body: {
          subject: subject.trim().slice(0, 200),
          message: message.trim().slice(0, 2000),
          user_email: profile?.email || "",
          user_name: profile?.full_name || "",
          tenant_id: profile?.tenant_id || "",
        },
      });
      if (error) throw error;
      toast.success(t("help.sent"));
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error(t("help.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-20 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 left-0 w-80 rounded-xl border bg-popover text-popover-foreground shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">{t("help.title")}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("help.subject")}</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("help.subjectPlaceholder")}
                  maxLength={200}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("help.message")}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("help.messagePlaceholder")}
                  maxLength={2000}
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={sending || !subject.trim() || !message.trim()}
                className="inline-flex items-center justify-center gap-2 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t("help.send")}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors",
          open
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircleQuestion className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default HelpBubble;
