import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { House, HouseImageRow } from "./houses-types";

const HOUSE_SELECT = "*, house_images(*)";

/** Public feed: all available houses, newest first. Cached offline. */
export async function fetchAvailableHouses(): Promise<House[]> {
  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("availability", "available")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as House[];
}

export async function fetchHouse(id: string): Promise<House | null> {
  const { data, error } = await supabase.from("houses").select(HOUSE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as House | null) ?? null;
}

/** Landlord: own listings (RLS scopes to the signed-in user). */
export async function fetchMyHouses(): Promise<House[]> {
  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as House[];
}

export type HouseInsert = Database["public"]["Tables"]["houses"]["Insert"];
export type HouseUpdate = Database["public"]["Tables"]["houses"]["Update"];

export async function createHouse(values: HouseInsert): Promise<House> {
  const { data, error } = await supabase.from("houses").insert(values).select(HOUSE_SELECT).single();
  if (error) throw error;
  return data as House;
}

export async function updateHouse(id: string, values: HouseUpdate): Promise<void> {
  const { error } = await supabase.from("houses").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteHouse(house: House): Promise<void> {
  const paths = house.house_images.map((i) => i.storage_path).filter((p): p is string => !!p && !p.startsWith("seed/"));
  if (paths.length) await supabase.storage.from("house-images").remove(paths);
  const { error } = await supabase.from("houses").delete().eq("id", house.id);
  if (error) throw error;
}

export async function insertImages(rows: Database["public"]["Tables"]["house_images"]["Insert"][]) {
  if (!rows.length) return;
  const { error } = await supabase.from("house_images").insert(rows);
  if (error) throw error;
}

export async function deleteImage(image: HouseImageRow) {
  if (image.storage_path && !image.storage_path.startsWith("seed/")) {
    await supabase.storage.from("house-images").remove([image.storage_path]);
  }
  const { error } = await supabase.from("house_images").delete().eq("id", image.id);
  if (error) throw error;
}

export async function setCoverImage(houseId: string, imageId: string) {
  const { error: e1 } = await supabase.from("house_images").update({ is_cover: false }).eq("house_id", houseId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("house_images").update({ is_cover: true }).eq("id", imageId);
  if (e2) throw e2;
}

/** Upload a compressed image to the landlord's private folder; returns storage path + public URL. */
export async function uploadHouseImage(userId: string, file: Blob, ext = "jpg") {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("house-images")
    .upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return { storage_path: path, image_url: `/api/public/img/${path}` };
}

/** Admin: every house regardless of availability. */
export async function fetchAllHousesAdmin(): Promise<House[]> {
  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as House[];
}

export async function fetchLandlordsAdmin() {
  const { data, error } = await supabase.rpc("admin_landlords");
  if (error) throw error;
  return data;
}
