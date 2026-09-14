import { readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260914110917_close_app_gaps_without_admin_bootstrap.sql",
  "src/routes/houses.$id.tsx",
  "src/routes/landlord.login.tsx",
  "src/routes/landlord.register.tsx",
  "src/routes/landlord.reset-password.tsx",
  "src/lib/idb-cache.ts",
  "src/routes/api/public/img/$.ts",
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
if (!registerPage.includes("phone: `+${normalized}`") || registerPage.includes("phoneToAuthEmail")) {
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

console.log("Smoke checks passed.");
