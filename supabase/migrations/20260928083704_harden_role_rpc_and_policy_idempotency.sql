-- Harden role checks and repair a non-idempotent policy from the consolidated DB fix.

DROP POLICY IF EXISTS "Users can update own landlord role" ON public.user_roles;
CREATE POLICY "Users can update own landlord role" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role = 'landlord');

-- Prevent authenticated clients from probing another user's roles through the RPC.
-- RLS policies and app code only need to check roles for auth.uid().
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
