-- Add extended branding colors
ALTER TABLE public.tenant_branding
  ADD COLUMN background_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN text_color text NOT NULL DEFAULT '#1a1a1a',
  ADD COLUMN secondary_color text NOT NULL DEFAULT '#f5f5f4',
  ADD COLUMN button_text_color text NOT NULL DEFAULT '#ffffff';