-- Database-side abuse limits for public trust and analytics events.
-- Client localStorage throttles are helpful UX, but they are not security controls.

CREATE INDEX IF NOT EXISTS idx_listing_reports_anon_house_reason_created_at
ON public.listing_reports (house_id, reason, created_at DESC)
WHERE reporter_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_events_house_method_created_at
ON public.contact_events (house_id, contact_method, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_listing_report_spam()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reporter_user_id IS NULL AND EXISTS (
    SELECT 1
    FROM public.listing_reports
    WHERE house_id = NEW.house_id
      AND reason = NEW.reason
      AND reporter_user_id IS NULL
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
      AND created_at > now() - interval '30 seconds'
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
