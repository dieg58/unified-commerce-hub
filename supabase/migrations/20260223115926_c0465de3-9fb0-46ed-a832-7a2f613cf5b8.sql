
-- Email templates managed by super admin
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "anyone_select" ON public.email_templates FOR SELECT
  USING (true);

-- Seed default templates
INSERT INTO public.email_templates (event_type, label, subject, body_html) VALUES
('order_confirmed', 'Commande confirmée', 'Votre commande {{order_ref}} a été confirmée',
 '<h2>Commande confirmée</h2><p>Bonjour {{customer_name}},</p><p>Votre commande <strong>#{{order_ref}}</strong> d''un montant de <strong>{{order_total}} €</strong> a été confirmée.</p><p>Vous serez notifié(e) lors de l''expédition.</p><p>Cordialement,<br/>{{tenant_name}}</p>'),

('order_shipped', 'Commande expédiée', 'Votre commande {{order_ref}} a été expédiée',
 '<h2>Commande expédiée</h2><p>Bonjour {{customer_name}},</p><p>Votre commande <strong>#{{order_ref}}</strong> a été expédiée via <strong>{{carrier}}</strong>.</p>{{#tracking_url}}<p><a href="{{tracking_url}}">Suivre votre colis</a> — {{tracking_number}}</p>{{/tracking_url}}<p>Cordialement,<br/>{{tenant_name}}</p>'),

('order_delivered', 'Commande livrée', 'Votre commande {{order_ref}} a été livrée',
 '<h2>Commande livrée</h2><p>Bonjour {{customer_name}},</p><p>Votre commande <strong>#{{order_ref}}</strong> a été livrée avec succès.</p><p>Cordialement,<br/>{{tenant_name}}</p>'),

('approval_required', 'Approbation requise', 'Commande {{order_ref}} en attente d''approbation',
 '<h2>Approbation requise</h2><p>Bonjour,</p><p>La commande <strong>#{{order_ref}}</strong> de <strong>{{customer_name}}</strong> ({{entity_name}}) d''un montant de <strong>{{order_total}} €</strong> nécessite votre approbation.</p><p>Connectez-vous à votre espace de gestion pour la valider.</p><p>Cordialement,<br/>{{tenant_name}}</p>'),

('order_rejected', 'Commande rejetée', 'Votre commande {{order_ref}} a été rejetée',
 '<h2>Commande rejetée</h2><p>Bonjour {{customer_name}},</p><p>Votre commande <strong>#{{order_ref}}</strong> a malheureusement été rejetée.</p><p>Contactez votre responsable pour plus d''informations.</p><p>Cordialement,<br/>{{tenant_name}}</p>');

-- Email send log
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  tenant_id uuid REFERENCES public.tenants(id),
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all" ON public.email_logs FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ta_select" ON public.email_logs FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
