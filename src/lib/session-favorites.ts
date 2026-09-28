const SESSION_FAVORITES_KEY = "easy-rent:session-favorite-houses";
export const SESSION_FAVORITES_EVENT = "easy-rent:session-favorites-changed";

function readIds() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_FAVORITES_KEY, JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(new Event(SESSION_FAVORITES_EVENT));
}

export function getSessionFavoriteIds() {
  return readIds();
}

export function setSessionFavoriteHouse(houseId: string, favorite: boolean) {
  const ids = readIds();
  if (favorite) {
    writeIds([houseId, ...ids.filter((id) => id !== houseId)]);
    return;
  }
  writeIds(ids.filter((id) => id !== houseId));
}
