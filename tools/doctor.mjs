import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { npmInvocation } from "./npm-cli.mjs";

const root = resolve(import.meta.dirname, "..");
const forbiddenPatterns = [
  /applied-caas-gateway/i,
  /internal\.api\.openai\.org/i,
  /packages\.applied/i,
  /10\.192\./,
  /\/mnt\/data\/coopege_/i,
  /C:\\Pliki_Joza\\Gamo_devovo\\coopege\\\.build/i,
];
const ignoredDirs = new Set([".git", "node_modules", ".build", "dist"]);
const registrySensitiveFiles = new Set(["package-lock.json", "package.json", ".npmrc", "npmrc"]);
const required = [
  "package.json",
  "package-lock.json",
  ".npmrc",
  "tools/build/build.mjs",
  "tools/dev-server.mjs",
  "project/migration/legacy-v14.1/coopege.project.v2.json",
  "dist/Coopege_v0.01.html",
  "dist/Coopege_Studio_v0.1.html",
];

function walk(dir, output = []) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, output);
    else if (stat.isFile() && stat.size <= 12 * 1024 * 1024) output.push(path);
  }
  return output;
}

function result(ok, label, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok ? 0 : 1;
}

let failures = 0;
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
failures += result(nodeMajor >= 20, "Node >= 20", process.versions.node);
const npmCommand = npmInvocation(["--version"]);
const npm = spawnSync(npmCommand.command, npmCommand.args, { cwd: root, encoding: "utf8" });
failures += result(npm.status === 0, "npm dostępny", npm.stdout.trim() || npm.stderr.trim());

for (const file of required) failures += result(existsSync(join(root, file)), `wymagany plik ${file}`);

const npmrc = existsSync(join(root, ".npmrc")) ? readFileSync(join(root, ".npmrc"), "utf8") : "";
failures += result(/registry=https:\/\/registry\.npmjs\.org\//.test(npmrc), ".npmrc używa publicznego npm registry");

const lock = existsSync(join(root, "package-lock.json")) ? JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) : null;
failures += result(lock?.lockfileVersion >= 3, "package-lock.json lockfileVersion >= 3", lock ? String(lock.lockfileVersion) : "brak");

const offenders = [];
for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const basename = rel.split("/").at(-1) ?? rel;
  const isSensitive = registrySensitiveFiles.has(basename) || rel.startsWith("apps/") || rel.startsWith("packages/") || rel.startsWith("tools/build/") || rel.startsWith("tools/dev-server");
  if (!isSensitive) continue;
  const text = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      offenders.push(`${rel} :: ${pattern}`);
      break;
    }
  }
}
failures += result(offenders.length === 0, "brak wewnętrznych URL-i i absolutnych ścieżek roboczych", offenders.slice(0, 8).join("; "));

for (const html of ["dist/Coopege_v0.01.html", "dist/Coopege_Studio_v0.1.html"]) {
  const path = join(root, html);
  if (!existsSync(path)) continue;
  const bytes = readFileSync(path);
  failures += result(bytes.length > 100_000, `${html} wygląda na zbudowany`, `${bytes.length} B`);
}

if (existsSync(join(root, "dist/Coopege_M7A_Asset_Vault.zip"))) {
  const zip = readFileSync(join(root, "dist/Coopege_M7A_Asset_Vault.zip"));
  console.log(`INFO Asset Vault SHA-256 ${createHash("sha256").update(zip).digest("hex")}`);
}

if (failures > 0) {
  console.error(`Coopege doctor: ${failures} problemów. Nie traktuj paczki jako release-ready.`);
  process.exitCode = 1;
} else {
  console.log("Coopege doctor: PASS — paczka wygląda przenośnie i gotowo do lokalnego playtestu.");
}
