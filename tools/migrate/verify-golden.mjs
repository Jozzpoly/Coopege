import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const manifestPath = resolve(root, process.argv[2] ?? "project/migration/legacy-v14.1/golden-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
let failed = 0;
for (const artifact of manifest.artifacts) {
  const path = resolve(root, artifact.path);
  if (!existsSync(path)) {
    console.error(`FAIL brak ${artifact.path}`);
    failed++;
    continue;
  }
  const bytes = readFileSync(path);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const ok = bytes.length === artifact.bytes && digest === artifact.sha256;
  console.log(`${ok ? "PASS" : "FAIL"} ${artifact.path}`);
  if (!ok) failed++;
}
if (failed) process.exitCode = 1;
else console.log(`Golden fixture poprawny: ${manifest.artifacts.length} artefaktów.`);
