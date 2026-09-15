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
