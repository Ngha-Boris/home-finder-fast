-- Tighten function privileges
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Replace SECURITY DEFINER helpers with invoker versions (RLS on houses already permits the needed reads)
CREATE OR REPLACE FUNCTION public.owns_house(_house_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.houses WHERE id = _house_id AND landlord_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.owns_house(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owns_house(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.house_is_public(_house_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.houses WHERE id = _house_id AND availability = 'available')
$$;

REVOKE EXECUTE ON FUNCTION public.admin_landlords() FROM public, anon;

-- Storage policies for the house-images bucket (private; served via app proxy)
CREATE POLICY "Landlords upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'house-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Landlords read own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'house-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Landlords update own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'house-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Landlords delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'house-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- Seed image URLs served through the app image endpoint
UPDATE public.house_images SET image_url = '/api/public/img/' || storage_path WHERE storage_path IS NOT NULL;