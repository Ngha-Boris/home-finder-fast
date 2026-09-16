-- Consolidated fix for the cicpdglmwdsdlgnoywsm database.
-- Applies the missing migrations (5-8) plus schema hardening.
-- Fully idempotent: safe to run multiple times.

-- =====================================================================
-- 1. Hardening indexes (from 20260914113013 + 20260915073456)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_listing_reports_user_house_reason
ON public.listing_reports (reporter_user_id, house_id, reason)
WHERE reporter_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_reports_created_at
ON public.listing_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_events_created_at
ON public.contact_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reports_anon_house_reason_created_at
ON public.listing_reports (house_id, reason, created_at DESC)
WHERE reporter_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_events_house_method_created_at
ON public.contact_events (house_id, contact_method, created_at DESC);

-- =====================================================================
-- 2. Final relaxed spam-prevention functions + triggers
--    (supersedes 20260914113013 and 20260915073456 versions)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.prevent_listing_report_spam()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reporter_user_id IS NULL AND COALESCE(NEW.details, '') = '' AND EXISTS (
    SELECT 1
    FROM public.listing_reports
    WHERE house_id = NEW.house_id
      AND reason = NEW.reason
      AND reporter_user_id IS NULL
      AND COALESCE(details, '') = ''
      AND created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'This listing was already reported recently';
  END IF;

  IF NEW.reporter_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.listing_reports
    WHERE house_id = NEW.house_id
      AND reporter_user_id = NEW.reporter_user_id
      AND reason = NEW.reason
  ) THEN
    RAISE EXCEPTION 'Listing has already been reported for this reason';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_listing_report_spam() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_duplicate_listing_report ON public.listing_reports;
DROP TRIGGER IF EXISTS prevent_listing_report_spam ON public.listing_reports;
CREATE TRIGGER prevent_listing_report_spam
BEFORE INSERT ON public.listing_reports
FOR EACH ROW
EXECUTE FUNCTION public.prevent_listing_report_spam();

CREATE OR REPLACE FUNCTION public.prevent_contact_event_spam()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contact_events
    WHERE house_id = NEW.house_id
      AND contact_method = NEW.contact_method
      AND created_at > now() - interval '5 seconds'
  ) THEN
    RAISE EXCEPTION 'Contact event already recorded recently';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_contact_event_spam() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_contact_event_spam ON public.contact_events;
CREATE TRIGGER prevent_contact_event_spam
BEFORE INSERT ON public.contact_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_contact_event_spam();

-- =====================================================================
-- 3. Atomic image reorder RPC (from 20260915103000)
--    Fixes: "Could not find the function public.reorder_house_images
--    in the schema cache" when uploading / reordering listing photos.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reorder_house_images(
  p_house_id uuid,
  p_image_ids uuid[]
)
RETURNS SETOF public.house_images
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  expected_count integer;
BEGIN
  SELECT count(*)
    INTO expected_count
  FROM public.house_images
  WHERE house_id = p_house_id;

  IF expected_count <> cardinality(p_image_ids) THEN
    RAISE EXCEPTION 'Image order must include every listing photo';
  END IF;

  IF (
    SELECT count(DISTINCT image_id)
    FROM unnest(p_image_ids) AS image_id
  ) <> cardinality(p_image_ids) THEN
    RAISE EXCEPTION 'Image order contains duplicates';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_image_ids) AS requested(image_id)
    LEFT JOIN public.house_images image
      ON image.id = requested.image_id
     AND image.house_id = p_house_id
    WHERE image.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Image order contains photos outside this listing';
  END IF;

  UPDATE public.house_images image
  SET
    sort_order = ordered.sort_order,
    is_cover = ordered.sort_order = 0
  FROM (
    SELECT image_id, ordinality::integer - 1 AS sort_order
    FROM unnest(p_image_ids) WITH ORDINALITY AS image_order(image_id, ordinality)
  ) AS ordered
  WHERE image.id = ordered.image_id
    AND image.house_id = p_house_id;

  RETURN QUERY
  SELECT *
  FROM public.house_images
  WHERE house_id = p_house_id
  ORDER BY sort_order ASC, created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_house_images(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_house_images(uuid, uuid[]) TO authenticated;

-- =====================================================================
-- 4. Fix: user_roles upsert fails on conflict (no UPDATE policy).
--    assignLandlordRole() uses INSERT ... ON CONFLICT DO NOTHING, which
--    still requires an UPDATE policy when the row already exists.
-- =====================================================================
CREATE POLICY "Users can update own landlord role" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role = 'landlord');

-- =====================================================================
-- 5. Schema hardening: FK constraints to auth.users.
--    Orphaned rows are removed first so the constraints can be added.
-- =====================================================================
DELETE FROM public.user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);

DELETE FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

DELETE FROM public.favorite_houses f
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = f.user_id);

DELETE FROM public.listing_reports lr
WHERE lr.reporter_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = lr.reporter_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorite_houses_user_id_fkey'
  ) THEN
    ALTER TABLE public.favorite_houses
      ADD CONSTRAINT favorite_houses_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_reports_reporter_user_id_fkey'
  ) THEN
    ALTER TABLE public.listing_reports
      ADD CONSTRAINT listing_reports_reporter_user_id_fkey
      FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- houses.landlord_id FK is only added when every house has a valid landlord.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'houses_landlord_id_fkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.houses h
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = h.landlord_id)
  ) THEN
    ALTER TABLE public.houses
      ADD CONSTRAINT houses_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;