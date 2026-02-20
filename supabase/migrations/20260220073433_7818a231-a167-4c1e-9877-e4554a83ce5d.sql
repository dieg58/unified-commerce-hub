
-- Table to store demo requests / leads
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form, no auth required)
CREATE POLICY "Anyone can submit a demo request"
ON public.demo_requests
FOR INSERT
WITH CHECK (true);

-- Only super admins can read
CREATE POLICY "Super admins can view demo requests"
ON public.demo_requests
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));
