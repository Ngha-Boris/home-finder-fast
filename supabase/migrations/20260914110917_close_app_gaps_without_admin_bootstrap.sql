-- Repeatable operational setup and product-support tables.
-- Intentionally does not bootstrap an admin user.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'house-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'house-images',
      'house-images',
      false,
      8388608,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    );
  ELSE
    UPDATE storage.buckets
    SET
      public = false,
      file_size_limit = 8388608,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
    WHERE id = 'house-images';
  END IF;
END $$;

ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'apartment';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'room_and_parlor';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'duplex';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'shared_room';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'commercial_space';

CREATE POLICY "Users can assign own landlord role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'landlord');

CREATE TABLE public.favorite_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, house_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorite_houses TO authenticated;
GRANT ALL ON public.favorite_houses TO service_role;
ALTER TABLE public.favorite_houses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_favorite_houses_user_id ON public.favorite_houses (user_id);
CREATE INDEX idx_favorite_houses_house_id ON public.favorite_houses (house_id);
CREATE POLICY "Users can read own favorites" ON public.favorite_houses
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can add own favorites" ON public.favorite_houses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own favorites" ON public.favorite_houses
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  reporter_user_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.listing_reports TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_listing_reports_house_id ON public.listing_reports (house_id);
CREATE INDEX idx_listing_reports_status ON public.listing_reports (status);
CREATE POLICY "Anyone can report a listing" ON public.listing_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    reason IN ('spam', 'wrong_information', 'unreachable_landlord', 'fraud_or_scam', 'already_rented', 'other')
    AND (reporter_user_id IS NULL OR reporter_user_id = auth.uid())
  );
CREATE POLICY "Admins can manage listing reports" ON public.listing_reports
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  contact_method TEXT NOT NULL CHECK (contact_method IN ('call', 'whatsapp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_events TO anon, authenticated;
GRANT SELECT ON public.contact_events TO authenticated;
GRANT ALL ON public.contact_events TO service_role;
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contact_events_house_id_created_at ON public.contact_events (house_id, created_at DESC);
CREATE POLICY "Anyone can log listing contact events" ON public.contact_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read contact events" ON public.contact_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
