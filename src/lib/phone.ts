/** Cameroon country code used for normalisation. */
export const COUNTRY_CODE = "237";
export const AUTH_EMAIL_DOMAIN = "landlord.nyumba.app";

/** Strip everything except digits. */
export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Extract the 9-digit local number from any user-typed variation. */
export function toLocal9(value: string): string | null {
  let d = digitsOnly(value);
  if (d.startsWith("00" + COUNTRY_CODE)) d = d.slice(2 + COUNTRY_CODE.length);
  else if (d.startsWith(COUNTRY_CODE) && d.length === 12) d = d.slice(COUNTRY_CODE.length);
  return /^\d{9}$/.test(d) ? d : null;
}

export function isValidLocalPhone(value: string) {
  return toLocal9(value) !== null;
}

/** Normalised international form without "+". */
export function normalizePhone(value: string): string | null {
  const local = toLocal9(value);
  return local ? COUNTRY_CODE + local : null;
}

export function formatPhoneDisplay(normalized: string) {
  const local = normalized.startsWith(COUNTRY_CODE)
    ? normalized.slice(COUNTRY_CODE.length)
    : normalized;
  const groups = local.match(/^(\d{3})(\d{2})(\d{2})(\d{2})$/);
  return groups
    ? `+${COUNTRY_CODE} ${groups[1]} ${groups[2]} ${groups[3]} ${groups[4]}`
    : `+${normalized}`;
}

export function telLink(normalized: string) {
  return `tel:+${normalized}`;
}

export function whatsappLink(normalized: string, message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${text}`;
}

/** Auth identity derived from the landlord's phone number. */
export function phoneToAuthEmail(normalized: string) {
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
}
