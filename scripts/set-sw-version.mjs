import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const swPath = "public/sw.js";
const source = readFileSync(swPath, "utf8");
const releaseInputs = [
  readFileSync("package-lock.json", "utf8"),
  readFileSync(".github/workflows/ci-cd.yml", "utf8"),
  readFileSync("src/routes/__root.tsx", "utf8"),
].join("\n");
const digest = createHash("sha256").update(releaseInputs).digest("hex").slice(0, 12);
const version = `easy-rent-v2-${digest}`;
const next = source.replace(
  /const VERSION = "easy-rent-v2-[^"]+";/,
  `const VERSION = "${version}";`,
);

if (next === source) {
  console.log(`Service worker cache version already ${version}.`);
} else {
  writeFileSync(swPath, next);
  console.log(`Service worker cache version set to ${version}.`);
}
