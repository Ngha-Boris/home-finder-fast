-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'landlord');
CREATE TYPE public.house_type AS ENUM ('studio_apartment', 'single_room');
CREATE TYPE public.availability_status AS ENUM ('available', 'unavailable');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- profiles policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- houses
CREATE TABLE public.houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL,
  house_type public.house_type NOT NULL,
  rent_price INTEGER NOT NULL CHECK (rent_price > 0),
  region TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  availability public.availability_status NOT NULL DEFAULT 'available',
  rooms INTEGER,
  bathrooms INTEGER,
  has_water BOOLEAN NOT NULL DEFAULT false,
  has_electricity BOOLEAN NOT NULL DEFAULT false,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  location_details TEXT,
  contact_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.houses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.houses TO authenticated;
GRANT ALL ON public.houses TO service_role;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_houses_region ON public.houses (region);
CREATE INDEX idx_houses_house_type ON public.houses (house_type);
CREATE INDEX idx_houses_rent_price ON public.houses (rent_price);
CREATE INDEX idx_houses_availability ON public.houses (availability);
CREATE INDEX idx_houses_created_at ON public.houses (created_at DESC);
CREATE INDEX idx_houses_landlord_id ON public.houses (landlord_id);

CREATE POLICY "Anyone can view available houses" ON public.houses
  FOR SELECT TO anon, authenticated USING (availability = 'available');
CREATE POLICY "Landlords can view own houses" ON public.houses
  FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Admins can view all houses" ON public.houses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can create own houses" ON public.houses
  FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "Landlords can update own houses" ON public.houses
  FOR UPDATE TO authenticated USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "Admins can update any house" ON public.houses
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can delete own houses" ON public.houses
  FOR DELETE TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Admins can delete any house" ON public.houses
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- house_images
CREATE TABLE public.house_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.house_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.house_images TO authenticated;
GRANT ALL ON public.house_images TO service_role;
ALTER TABLE public.house_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_house_images_house_id ON public.house_images (house_id);

CREATE OR REPLACE FUNCTION public.owns_house(_house_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.houses WHERE id = _house_id AND landlord_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.house_is_public(_house_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.houses WHERE id = _house_id AND availability = 'available')
$$;

CREATE POLICY "Anyone can view images of available houses" ON public.house_images
  FOR SELECT TO anon, authenticated USING (public.house_is_public(house_id));
CREATE POLICY "Owners and admins can view images" ON public.house_images
  FOR SELECT TO authenticated USING (public.owns_house(house_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can add images" ON public.house_images
  FOR INSERT TO authenticated WITH CHECK (public.owns_house(house_id));
CREATE POLICY "Owners can update images" ON public.house_images
  FOR UPDATE TO authenticated USING (public.owns_house(house_id)) WITH CHECK (public.owns_house(house_id));
CREATE POLICY "Owners and admins can delete images" ON public.house_images
  FOR DELETE TO authenticated USING (public.owns_house(house_id) OR public.has_role(auth.uid(), 'admin'));

-- Admin-only public stats helper (landlord list without exposing to anon)
CREATE OR REPLACE FUNCTION public.admin_landlords()
RETURNS TABLE (id UUID, phone_number TEXT, display_name TEXT, created_at TIMESTAMPTZ, listing_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.phone_number, p.display_name, p.created_at, COUNT(h.id) AS listing_count
  FROM public.profiles p
  LEFT JOIN public.houses h ON h.landlord_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY p.id
  ORDER BY p.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.admin_landlords() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_landlords() TO authenticated;
