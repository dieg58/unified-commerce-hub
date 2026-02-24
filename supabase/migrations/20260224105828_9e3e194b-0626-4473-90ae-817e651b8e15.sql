-- Fix: the "Users can view own roles" policy is RESTRICTIVE, 
-- which combined with the other RESTRICTIVE ALL policy means 
-- non-super-admins can never read their own roles.
-- Solution: drop it and recreate as PERMISSIVE.

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
