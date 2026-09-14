import { readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260914110917_close_app_gaps_without_admin_bootstrap.sql",
  "src/routes/houses.$id.tsx",
  "src/routes/landlord.login.tsx",
  "src/routes/landlord.register.tsx",
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

console.log("Smoke checks passed.");
