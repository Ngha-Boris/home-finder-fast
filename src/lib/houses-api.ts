import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { House, HouseImageRow, HouseRow, HouseType } from "./houses-types";

const HOUSE_SELECT = "*, house_images(*)";
const PAGE_LIMIT = 60;

export type HouseSearchFilters = {
  q?: string;
  type?: HouseType;
  region?: string;
  min?: number;
  max?: number;
  limit?: number;
};

const CONTACT_EVENT_WINDOW_MS = 60_000;
const LISTING_REPORT_WINDOW_MS = 10 * 60_000;

function clientWindowAllows(key: string, windowMs: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    const now = Date.now();
    const previous = Number(window.localStorage.getItem(key) ?? 0);
    if (Number.isFinite(previous) && now - previous < windowMs) return false;
    window.localStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}

/** Public feed: all available houses, newest first. Cached offline. */
export async function fetchAvailableHouses(filters: HouseSearchFilters = {}): Promise<House[]> {
  let query = supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("availability", "available")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? PAGE_LIMIT);

  if (filters.type) query = query.eq("house_type", filters.type);
  if (filters.region) query = query.eq("region", filters.region);
  if (filters.min !== undefined) query = query.gte("rent_price", filters.min);
  if (filters.max !== undefined) query = query.lte("rent_price", filters.max);
  if (filters.q?.trim()) {
    const term = filters.q.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
    query = query.or(
      `location.ilike.%${term}%,region.ilike.%${term}%,description.ilike.%${term}%,location_details.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as House[];
}

export async function fetchHouse(id: string): Promise<House | null> {
  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as House | null) ?? null;
}

/** Landlord: own listings (RLS scopes to the signed-in user). */
export async function fetchMyHouses(): Promise<House[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("landlord_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as House[];
}

export async function fetchMyHouse(id: string): Promise<House | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("id", id)
    .eq("landlord_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as House | null) ?? null;
}

export type HouseInsert = Database["public"]["Tables"]["houses"]["Insert"];
export type HouseUpdate = Database["public"]["Tables"]["houses"]["Update"];

export async function createHouse(values: HouseInsert): Promise<House> {
  const { data, error } = await supabase
    .from("houses")
    .insert(values)
    .select(HOUSE_SELECT)
    .single();
  if (error) throw error;
  return data as House;
}

export async function updateHouse(id: string, values: HouseUpdate): Promise<void> {
  const { error } = await supabase.from("houses").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteHouse(house: House): Promise<void> {
  const paths = house.house_images.map((i) => i.storage_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("house-images").remove(paths);
  const { error } = await supabase.from("houses").delete().eq("id", house.id);
  if (error) throw error;
}

export async function insertImages(
  rows: Database["public"]["Tables"]["house_images"]["Insert"][],
): Promise<HouseImageRow[]> {
  if (!rows.length) return [];
  const { data, error } = await supabase.from("house_images").insert(rows).select("*");
  if (error) throw error;
  return data as HouseImageRow[];
}

export async function deleteImage(image: HouseImageRow) {
  if (image.storage_path) {
    await supabase.storage.from("house-images").remove([image.storage_path]);
  }
  const { error } = await supabase.from("house_images").delete().eq("id", image.id);
  if (error) throw error;
}

export async function setCoverImage(houseId: string, imageId: string) {
  const { error: e1 } = await supabase
    .from("house_images")
    .update({ is_cover: false })
    .eq("house_id", houseId);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("house_images")
    .update({ is_cover: true })
    .eq("id", imageId);
  if (e2) throw e2;
}

export async function reorderHouseImages(
  houseId: string,
  imageIds: string[],
): Promise<HouseImageRow[]> {
  const { data, error } = await supabase.rpc("reorder_house_images", {
    p_house_id: houseId,
    p_image_ids: imageIds,
  });
  if (error) throw error;
  return data as HouseImageRow[];
}

export async function assignLandlordRole(userId: string) {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "landlord" }, { onConflict: "user_id,role" });
  if (error) throw error;
}

function isRoleAssignmentBlocked(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("row-level security") || error.message.includes("user_roles"))
  );
}

export async function ensureLandlordAccount(user: {
  id: string;
  phone?: string | null;
  user_metadata?: { phone_number?: unknown; display_name?: unknown };
}) {
  const phone =
    typeof user.user_metadata?.phone_number === "string"
      ? user.user_metadata.phone_number
      : (user.phone?.replace(/^\+/, "") ?? user.id);
  const displayName =
    typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null;

  try {
    await assignLandlordRole(user.id);
  } catch (error) {
    if (!isRoleAssignmentBlocked(error)) throw error;
    console.warn("[auth] Landlord role assignment is not available in this environment", error);
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      phone_number: phone,
      display_name: displayName,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorite_houses")
    .select("house_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.house_id);
}

export async function fetchFavoriteHouses(userId: string): Promise<House[]> {
  const ids = await fetchFavoriteIds(userId);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .in("id", ids)
    .eq("availability", "available")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as House[];
}

export async function setFavoriteHouse(userId: string, houseId: string, favorite: boolean) {
  if (favorite) {
    const { error } = await supabase
      .from("favorite_houses")
      .upsert({ user_id: userId, house_id: houseId }, { onConflict: "user_id,house_id" });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("favorite_houses")
    .delete()
    .eq("user_id", userId)
    .eq("house_id", houseId);
  if (error) throw error;
}

export type ListingReportReason =
  | "spam"
  | "wrong_information"
  | "unreachable_landlord"
  | "fraud_or_scam"
  | "already_rented"
  | "other";

export async function reportListing(input: {
  houseId: string;
  reporterUserId?: string | null;
  reason: ListingReportReason;
  details?: string | null;
}) {
  const throttleKey = `easy-rent:report:${input.houseId}:${input.reporterUserId ?? "anon"}`;
  if (!clientWindowAllows(throttleKey, LISTING_REPORT_WINDOW_MS)) {
    throw new Error("You already reported this listing recently. Thank you.");
  }

  const { error } = await supabase.from("listing_reports").insert({
    house_id: input.houseId,
    reporter_user_id: input.reporterUserId ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error) throw error;
}

export async function logContactEvent(houseId: string, contactMethod: "call" | "whatsapp") {
  const throttleKey = `easy-rent:contact:${houseId}:${contactMethod}`;
  if (!clientWindowAllows(throttleKey, CONTACT_EVENT_WINDOW_MS)) return;

  const { error } = await supabase
    .from("contact_events")
    .insert({ house_id: houseId, contact_method: contactMethod });
  if (error) {
    console.warn("[analytics] Failed to record contact event", error);
  }
}

/** Upload a compressed image to the landlord's private folder; returns storage path + public URL. */
export async function uploadHouseImage(userId: string, file: Blob, ext = "jpg") {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("house-images")
    .upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return { storage_path: path, image_url: `/api/public/img/${encodeURIComponent(path)}` };
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

export type ListingReport = Database["public"]["Tables"]["listing_reports"]["Row"] & {
  houses?: Pick<HouseRow, "id" | "house_type" | "location" | "region" | "availability"> | null;
};

export async function fetchListingReportsAdmin(status?: "open" | "reviewed" | "dismissed") {
  let query = supabase
    .from("listing_reports")
    .select("*, houses(id, house_type, location, region, availability)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as ListingReport[];
}

export async function updateListingReportStatus(
  id: string,
  status: "open" | "reviewed" | "dismissed",
) {
  const { error } = await supabase.from("listing_reports").update({ status }).eq("id", id);
  if (error) throw error;
}
