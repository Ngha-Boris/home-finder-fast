import type { Database } from "@/integrations/supabase/types";

export type HouseRow = Database["public"]["Tables"]["houses"]["Row"];
export type HouseImageRow = Database["public"]["Tables"]["house_images"]["Row"];
export type HouseType = Database["public"]["Enums"]["house_type"];
export type Availability = Database["public"]["Enums"]["availability_status"];

export type House = HouseRow & { house_images: HouseImageRow[] };

export const HOUSE_TYPES: { value: HouseType; label: string }[] = [
  { value: "studio_apartment", label: "Studio Apartment" },
  { value: "single_room", label: "Single Room" },
];

export const REGIONS = [
  "Littoral",
  "Centre",
  "South-West",
  "North-West",
  "West",
  "South",
  "East",
  "Adamawa",
  "North",
  "Far North",
];

export const PRICE_PRESETS = [
  { label: "Under 25k", min: undefined, max: 25000 },
  { label: "25k – 50k", min: 25000, max: 50000 },
  { label: "50k – 75k", min: 50000, max: 75000 },
  { label: "75k+", min: 75000, max: undefined },
];

export function houseTypeLabel(type: HouseType) {
  return HOUSE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function formatPrice(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, ",")} FCFA`;
}

export function coverImage(house: Pick<House, "house_images">) {
  const imgs = [...house.house_images].sort((a, b) => a.sort_order - b.sort_order);
  return imgs.find((i) => i.is_cover) ?? imgs[0] ?? null;
}

export function sortedImages(house: Pick<House, "house_images">) {
  return [...house.house_images].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
