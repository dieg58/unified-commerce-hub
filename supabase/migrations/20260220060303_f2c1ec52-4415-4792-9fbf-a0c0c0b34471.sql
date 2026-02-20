-- Add FK from user_roles.user_id to profiles.id for PostgREST join support
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
