-- Reinforce newer house types for databases that have not received the previous hardening migration.
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'apartment';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'room_and_parlor';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'duplex';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'shared_room';
ALTER TYPE public.house_type ADD VALUE IF NOT EXISTS 'commercial_space';

-- Harden repeated signed-in reports without changing the excluded admin bootstrap path.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_listing_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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

REVOKE ALL ON FUNCTION public.prevent_duplicate_listing_report() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_duplicate_listing_report ON public.listing_reports;
CREATE TRIGGER prevent_duplicate_listing_report
BEFORE INSERT ON public.listing_reports
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_listing_report();

CREATE INDEX IF NOT EXISTS idx_listing_reports_user_house_reason
ON public.listing_reports (reporter_user_id, house_id, reason)
WHERE reporter_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_reports_created_at
ON public.listing_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_events_created_at
ON public.contact_events (created_at DESC);
