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

-- Seed: demo landlords (auth accounts created with matching IDs)
INSERT INTO public.profiles (id, phone_number, display_name) VALUES
  ('11111111-1111-4111-8111-111111111111', '237677123456', 'Ngwa Emmanuel'),
  ('22222222-2222-4222-8222-222222222222', '237699234567', 'Fotso Marie'),
  ('33333333-3333-4333-8333-333333333333', '237655345678', 'Tabi Joseph');

-- Seed: houses
INSERT INTO public.houses (id, landlord_id, house_type, rent_price, region, location, description, availability, rooms, bathrooms, has_water, has_electricity, amenities, location_details, contact_phone, created_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'studio_apartment', 50000, 'Littoral', 'Bonamoussadi, Douala', 'Bright modern studio with a tiled kitchenette and private bathroom. Quiet compound with a gate and parking space, five minutes walk from Carrefour Bonamoussadi.', 'available', 1, 1, true, true, '{"Parking","Tiled floors","Gated compound"}', 'Behind Santa Lucia supermarket, second street on the left.', '237677123456', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'single_room', 25000, 'Littoral', 'Ndokoti, Douala', 'Spacious single room with its own toilet and shower. Constant water supply from a borehole and prepaid electricity meter.', 'available', 1, 1, true, true, '{"Borehole water","Prepaid meter"}', 'Near Ndokoti roundabout, opposite the pharmacy.', '237677123456', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'studio_apartment', 65000, 'Littoral', 'Akwa, Douala', 'Furnished studio in the heart of Akwa. Ideal for young professionals, close to banks, restaurants and public transport.', 'available', 1, 1, true, true, '{"Furnished","Balcony","Security guard"}', 'Rue Joffre, above the bakery.', '237677123456', now() - interval '3 days'),
  ('a0000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'single_room', 20000, 'Littoral', 'Logbessou, Douala', 'Affordable single room in a calm neighbourhood. Shared bathroom, individual electricity meter. Ideal for students.', 'unavailable', 1, 0, true, true, '{"Shared bathroom"}', NULL, '237677123456', now() - interval '20 days'),
  ('a0000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'studio_apartment', 75000, 'Centre', 'Bastos, Yaounde', 'Elegant studio in the diplomatic quarter. Fitted wardrobe, modern bathroom, backup water tank and generator for the compound.', 'available', 1, 1, true, true, '{"Generator","Water tank","Fitted wardrobe","Parking"}', 'Off the Bastos main road, near the Chinese embassy.', '237699234567', now() - interval '12 hours'),
  ('a0000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'single_room', 30000, 'Centre', 'Ngoa-Ekelle, Yaounde', 'Single room ten minutes from the University of Yaounde I. Private toilet, ceiling fan, secure compound with night guard.', 'available', 1, 1, true, true, '{"Ceiling fan","Night guard"}', 'Close to the Mini Prix, first gate after the bar.', '237699234567', now() - interval '4 days'),
  ('a0000000-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'studio_apartment', 45000, 'Centre', 'Mendong, Yaounde', 'New self-contained studio with separate kitchen area, tiled throughout. Water flows daily and the road is tarred up to the gate.', 'available', 1, 1, true, true, '{"Tarred road","Separate kitchen"}', 'Mendong Chapelle, behind the football field.', '237699234567', now() - interval '5 days'),
  ('a0000000-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'single_room', 18000, 'Centre', 'Nkolbisson, Yaounde', 'Simple single room with shared facilities, close to the market and taxi stop. Rent includes water.', 'available', 1, 0, true, false, '{"Water included"}', NULL, '237699234567', now() - interval '8 days'),
  ('a0000000-0000-4000-8000-000000000009', '33333333-3333-4333-8333-333333333333', 'studio_apartment', 55000, 'South-West', 'Molyko, Buea', 'Cool mountain-view studio in Molyko, walking distance to the University of Buea. Private bathroom, kitchen corner and a small veranda.', 'available', 1, 1, true, true, '{"Veranda","Mountain view","Wardrobe"}', 'Untarred road junction, third compound on the right.', '237655345678', now() - interval '6 hours'),
  ('a0000000-0000-4000-8000-000000000010', '33333333-3333-4333-8333-333333333333', 'single_room', 22000, 'South-West', 'Bonduma, Buea', 'Clean single room with private toilet and a shared kitchen. Reliable CAMWATER supply, quiet street.', 'available', 1, 1, true, true, '{"Shared kitchen"}', 'Bonduma junction, behind the primary school.', '237655345678', now() - interval '6 days'),
  ('a0000000-0000-4000-8000-000000000011', '33333333-3333-4333-8333-333333333333', 'studio_apartment', 40000, 'South-West', 'Mile 17, Buea', 'Studio apartment near Mile 17 motor park. Convenient for commuters to Douala. Includes a fitted kitchen sink and water heater.', 'available', 1, 1, true, true, '{"Water heater","Fitted kitchen"}', NULL, '237655345678', now() - interval '9 days'),
  ('a0000000-0000-4000-8000-000000000012', '33333333-3333-4333-8333-333333333333', 'single_room', 15000, 'North-West', 'Nkwen, Bamenda', 'Budget-friendly single room in Nkwen. Shared bathroom and kitchen, electricity available, water from a compound tap.', 'available', 1, 0, true, true, '{"Compound tap"}', 'Near Nkwen market, off the main road.', '237655345678', now() - interval '11 days'),
  ('a0000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'studio_apartment', 60000, 'West', 'Tamdja, Bafoussam', 'Comfortable studio in a new building with tiled bathroom and kitchen. Secure parking and 24h water from the compound tank.', 'available', 1, 1, true, true, '{"Parking","Water tank","New building"}', 'Tamdja, after the Total filling station.', '237677123456', now() - interval '14 days'),
  ('a0000000-0000-4000-8000-000000000014', '22222222-2222-4222-8222-222222222222', 'single_room', 28000, 'Littoral', 'Kotto, Douala', 'Single room with private bathroom in a family compound. Calm environment, close to Carrefour Kotto and public transport.', 'available', 1, 1, true, true, '{"Private bathroom","Family compound"}', NULL, '237699234567', now() - interval '16 days');

-- Seed: images (hosted in the house-images storage bucket)
INSERT INTO public.house_images (house_id, image_url, storage_path, is_cover, sort_order) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-1.jpg', 'seed/studio-1.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000001', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/bathroom-1.jpg', 'seed/bathroom-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000001', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/kitchen-1.jpg', 'seed/kitchen-1.jpg', false, 2),
  ('a0000000-0000-4000-8000-000000000002', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-1.jpg', 'seed/room-1.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000002', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/bathroom-1.jpg', 'seed/bathroom-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000003', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-2.jpg', 'seed/studio-2.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000003', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/exterior-1.jpg', 'seed/exterior-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000004', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-2.jpg', 'seed/room-2.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000005', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-3.jpg', 'seed/studio-3.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000005', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/kitchen-1.jpg', 'seed/kitchen-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000005', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/exterior-2.jpg', 'seed/exterior-2.jpg', false, 2),
  ('a0000000-0000-4000-8000-000000000006', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-2.jpg', 'seed/room-2.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000006', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/exterior-1.jpg', 'seed/exterior-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000007', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-1.jpg', 'seed/studio-1.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000007', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/kitchen-1.jpg', 'seed/kitchen-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000008', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-1.jpg', 'seed/room-1.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000009', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-2.jpg', 'seed/studio-2.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000009', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/exterior-2.jpg', 'seed/exterior-2.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000009', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/bathroom-1.jpg', 'seed/bathroom-1.jpg', false, 2),
  ('a0000000-0000-4000-8000-000000000010', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-2.jpg', 'seed/room-2.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000011', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-3.jpg', 'seed/studio-3.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000011', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/bathroom-1.jpg', 'seed/bathroom-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000012', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-1.jpg', 'seed/room-1.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000013', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/studio-1.jpg', 'seed/studio-1.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000013', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/exterior-1.jpg', 'seed/exterior-1.jpg', false, 1),
  ('a0000000-0000-4000-8000-000000000014', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/room-2.jpg', 'seed/room-2.jpg', true, 0),
  ('a0000000-0000-4000-8000-000000000014', 'https://gkhoyqapdomvlxbxlcll.supabase.co/storage/v1/object/public/house-images/seed/exterior-2.jpg', 'seed/exterior-2.jpg', false, 1);