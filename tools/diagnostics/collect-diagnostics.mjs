import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { arch, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const npmProgram = process.platform === "win32" ? "npm.cmd" : "npm";
function command(args) {
  try { return execFileSync(npmProgram, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { return `ERROR: ${error instanceof Error ? error.message : String(error)}`; }
}
function packageVersion() {
  try { return JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version; }
  catch { return "unknown"; }
}

let projectRegistry = "unknown";
try {
  const npmrc = readFileSync(resolve(root, ".npmrc"), "utf8");
  projectRegistry = npmrc.match(/^\s*registry\s*=\s*(\S+)\s*$/mi)?.[1] ?? "not configured";
} catch {}

const report = {
  generatedAt: new Date().toISOString(),
  privacy: "Raport nie zawiera kluczy API, zmiennych środowiskowych ani treści plików użytkownika.",
  project: { version: packageVersion(), root: root.replace(/^([A-Za-z]):\\Users\\[^\\]+/i, "$1:\\Users\\<user>") },
  system: { platform: platform(), release: release(), arch: arch(), memoryGiB: Math.round(totalmem() / 1024 ** 3 * 10) / 10 },
  runtime: { node: process.versions.node, npm: command(["--version"]) },
  npm: {
    projectRegistry,
    effectiveRegistry: command(["config", "get", "registry"]),
    proxyConfigured: command(["config", "get", "proxy"]) !== "null",
    httpsProxyConfigured: command(["config", "get", "https-proxy"]) !== "null",
  },
  files: Object.fromEntries([
    "package-lock.json", ".npmrc", "node_modules/typescript/bin/tsc",
    "dist/Coopege_v0.01.html", "dist/Coopege_Studio_v0.1.html",
  ].map((relative) => [relative, existsSync(resolve(root, relative))])),
};
const output = resolve(root, "coopege-diagnostics.json");
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Zapisano raport diagnostyczny: ${output}`);
