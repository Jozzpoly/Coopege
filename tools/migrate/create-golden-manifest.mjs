import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const migrationDir = resolve(root, process.argv[2] ?? "project/migration/legacy-v14.1");
const manifestPath = resolve(migrationDir, "golden-manifest.json");

function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    if (child === manifestPath) return [];
    return entry.isDirectory() ? walk(child) : [child];
  });
}

const artifacts = walk(migrationDir)
  .sort()
  .map((path) => {
    const bytes = readFileSync(path);
    return {
      path: relative(root, path).replaceAll("\\", "/"),
      bytes: statSync(path).size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
const manifest = {
  format: "coopege-golden-fixture-manifest",
  formatVersion: 1,
  sourceRuntimeSha256: "cd7d0d7527847ebd3f4ddb2c5a8c18d292517815c4989b8f4bd40b0fc5ce900c",
  artifacts,
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Zapisano golden manifest: ${artifacts.length} artefaktów.`);
