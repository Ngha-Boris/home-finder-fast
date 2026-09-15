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
