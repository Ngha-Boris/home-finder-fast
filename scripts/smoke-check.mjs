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

const serviceWorker = readFileSync("public/sw.js", "utf8");
if (!serviceWorker.includes("easy-rent-v2-20260915")) {
  throw new Error("Service worker cache version must be bumped for release cache invalidation.");
}

console.log("Smoke checks passed.");
