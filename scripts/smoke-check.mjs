import { readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260914110917_close_app_gaps_without_admin_bootstrap.sql",
  "supabase/migrations/20260915073456_harden_report_contact_rate_limits.sql",
  "src/routes/houses.$id.tsx",
  "src/routes/houses.index.tsx",
  "src/routes/_admin/admin.index.tsx",
  "src/routes/landlord.login.tsx",
  "src/routes/landlord.register.tsx",
  "src/routes/landlord.reset-password.tsx",
  "src/lib/idb-cache.ts",
  "src/routes/api/public/img/$.ts",
  ".github/workflows/ci-cd.yml",
  "public/sw.js",
  "scripts/set-sw-version.mjs",
];

for (const file of requiredFiles) {
  readFileSync(file, "utf8");
}

const migration = readFileSync(requiredFiles[0], "utf8");
const requiredSql = [
  "storage.buckets",
  "favorite_houses",
  "listing_reports",
  "contact_events",
  "Users can assign own landlord role",
];

for (const needle of requiredSql) {
  if (!migration.includes(needle)) {
    throw new Error(`Missing migration coverage: ${needle}`);
  }
}

const detailPage = readFileSync("src/routes/houses.$id.tsx", "utf8");
for (const needle of ["Save house", "Report listing", "logContactEvent"]) {
  if (!detailPage.includes(needle)) {
    throw new Error(`Missing detail-page feature: ${needle}`);
  }
}

const loginPage = readFileSync("src/routes/landlord.login.tsx", "utf8");
if (!loginPage.includes("phone: `+${normalizePhone(phone)!}`")) {
  throw new Error("Login must authenticate landlords with phone numbers.");
}

const registerPage = readFileSync("src/routes/landlord.register.tsx", "utf8");
if (
  !registerPage.includes("phone: `+${normalized}`") ||
  registerPage.includes("phoneToAuthEmail")
) {
  throw new Error("Registration must use phone auth without synthetic identities.");
}
if (!registerPage.includes("/api/landlord/register")) {
  throw new Error("Registration must create phone/password accounts through the server route.");
}

const registerApi = readFileSync("src/routes/api/landlord/register.ts", "utf8");
for (const needle of ["admin.auth.admin.createUser", "phone_confirm: true", "user_roles"]) {
  if (!registerApi.includes(needle)) {
    throw new Error(`Missing server registration behavior: ${needle}`);
  }
}

const cache = readFileSync("src/lib/idb-cache.ts", "utf8");
if (!cache.includes("feedSearch")) {
  throw new Error("Filtered house feeds need distinct offline cache keys.");
}

const imageProxy = readFileSync("src/routes/api/public/img/$.ts", "utf8");
if (!imageProxy.includes("Image service is not configured")) {
  throw new Error("Public image proxy should fail cleanly when server secrets are missing.");
}

const housesIndex = readFileSync("src/routes/houses.index.tsx", "utf8");
for (const needle of ["Search houses", "House type", "PRICE_PRESETS", "Clear filters"]) {
  if (!housesIndex.includes(needle)) {
    throw new Error(`Missing browse filter UI: ${needle}`);
  }
}

const adminIndex = readFileSync("src/routes/_admin/admin.index.tsx", "utf8");
for (const needle of ["Listing reports", "fetchListingReportsAdmin", "updateListingReportStatus"]) {
  if (!adminIndex.includes(needle)) {
    throw new Error(`Missing admin report workflow: ${needle}`);
  }
}

const hardeningMigration = readFileSync(
  "supabase/migrations/20260915073456_harden_report_contact_rate_limits.sql",
  "utf8",
);
for (const needle of ["prevent_listing_report_spam", "prevent_contact_event_spam"]) {
  if (!hardeningMigration.includes(needle)) {
    throw new Error(`Missing database spam hardening: ${needle}`);
  }
}

const workflow = readFileSync(".github/workflows/ci-cd.yml", "utf8");
if (!workflow.includes(".vercel/project.json") || workflow.includes("vercel link --yes")) {
  throw new Error(
    "CI should write Vercel project metadata directly instead of running vercel link.",
  );
}
if (
  !workflow.includes("SUPABASE_PROJECT_REF") ||
  !workflow.includes("supabase link --project-ref")
) {
  throw new Error("CI should link Supabase before checking linked migration status.");
}

const serviceWorker = readFileSync("public/sw.js", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const swVersionScript = readFileSync("scripts/set-sw-version.mjs", "utf8");
if (!packageJson.includes('"prebuild": "node scripts/set-sw-version.mjs"')) {
  throw new Error("Builds must refresh the service worker cache version automatically.");
}
if (!swVersionScript.includes("createHash") || !serviceWorker.includes("const VERSION =")) {
  throw new Error("Service worker cache version must be generated from release inputs.");
}

const houseForm = readFileSync("src/components/house-form.tsx", "utf8");
for (const needle of ["reorderHouseImages", "syncPhotoOrder", "disabled={saving || index === 0}"]) {
  if (!houseForm.includes(needle)) {
    throw new Error(`Missing photo reorder hardening: ${needle}`);
  }
}

const housesApi = readFileSync("src/lib/houses-api.ts", "utf8");
if (!housesApi.includes("reorder_house_images")) {
  throw new Error("Image reordering should use the atomic reorder_house_images RPC.");
}

const reorderMigration = readFileSync(
  "supabase/migrations/20260915103000_add_atomic_house_image_reorder.sql",
  "utf8",
);
for (const needle of ["reorder_house_images", "Image order must include every listing photo"]) {
  if (!reorderMigration.includes(needle)) {
    throw new Error(`Missing atomic reorder migration coverage: ${needle}`);
  }
}

const rateLimitMigration = readFileSync(
  "supabase/migrations/20260915104000_relax_public_event_rate_limits.sql",
  "utf8",
);
if (!rateLimitMigration.includes("interval '5 seconds'")) {
  throw new Error(
    "Contact analytics database throttle should avoid broad 30-second undercounting.",
  );
}

console.log("Smoke checks passed.");
