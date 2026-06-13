import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { npmInvocation } from "../npm-cli.mjs";

const root = resolve(import.meta.dirname, "../..");
const failures = [];
const warnings = [];
const passes = [];

function pass(message) { passes.push(message); }
function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function text(relative) { return readFileSync(resolve(root, relative), "utf8"); }
function command(program, args) {
  try { return execFileSync(program, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { return `ERROR: ${error instanceof Error ? error.message : String(error)}`; }
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 20) pass(`Node ${process.versions.node}`); else fail(`Node ${process.versions.node}; wymagany >=20.11.`);

const npmVersionInvocation = npmInvocation(["--version"]);
const npmVersion = command(npmVersionInvocation.command, npmVersionInvocation.args);
if (!npmVersion.startsWith("ERROR:")) pass(`npm ${npmVersion}`); else fail(`Nie można uruchomić npm: ${npmVersion}`);

const required = [
  "package.json", "package-lock.json", ".npmrc", "tsconfig.json",
  "apps/runtime/src/main.ts", "apps/studio/src/main.ts",
  "packages/gameplay/src/game-world.ts",
  "project/migration/legacy-v14.1/coopege.project.v2.json",
  "node_modules/typescript/bin/tsc",
];
for (const relative of required) {
  if (existsSync(resolve(root, relative))) pass(`jest ${relative}`); else fail(`brak ${relative}`);
}

let lock;
try { lock = JSON.parse(text("package-lock.json")); pass("package-lock.json jest poprawnym JSON-em"); }
catch (error) { fail(`package-lock.json jest uszkodzony: ${error instanceof Error ? error.message : String(error)}`); }

const sensitiveConfigFiles = ["package.json", "package-lock.json", ".npmrc", "tools/build/build.mjs"];
const forbidden = [
  "packages.applied-caas-gateway1.internal.api.openai.org",
  "internal.api.openai.org",
  "10.192.71.42",
];
for (const relative of sensitiveConfigFiles) {
  if (!existsSync(resolve(root, relative))) continue;
  const value = text(relative);
  for (const token of forbidden) if (value.includes(token)) fail(`${relative} zawiera niedostępny adres wewnętrzny: ${token}`);
}

const projectNpmrc = existsSync(resolve(root, ".npmrc")) ? text(".npmrc") : "";
const projectRegistryMatch = projectNpmrc.match(/^\s*registry\s*=\s*(\S+)\s*$/mi);
const projectRegistry = projectRegistryMatch?.[1] ?? "";
if (/^https:\/\/registry\.npmjs\.org\/?$/.test(projectRegistry)) pass(`projektowy registry npm: ${projectRegistry}`);
else fail(`.npmrc nie wskazuje publicznego registry npm: ${projectRegistry || "brak wpisu"}`);

const registryInvocation = npmInvocation(["config", "get", "registry"]);
const registry = command(registryInvocation.command, registryInvocation.args);
if (/^https:\/\/registry\.npmjs\.org\/?$/.test(registry)) pass(`efektywny registry npm: ${registry}`);
else if (registry.startsWith("ERROR:") && /^https:\/\/registry\.npmjs\.org\/?$/.test(projectRegistry)) {
  warn("npm nie pozwolił odczytać efektywnego registry, ale projektowy .npmrc jest poprawny.");
} else if (registry.startsWith("ERROR:")) {
  warn(`Nie można odczytać efektywnego registry npm: ${registry.split("\n")[0]}`);
} else {
  warn(`efektywny registry npm to ${registry}; projekt wymusza https://registry.npmjs.org/`);
}

const lockText = existsSync(resolve(root, "package-lock.json")) ? text("package-lock.json") : "";
const resolvedHosts = [...lockText.matchAll(/"resolved"\s*:\s*"https:\/\/([^/]+)/g)].map((match) => match[1]);
const nonPublicHosts = [...new Set(resolvedHosts.filter((host) => host !== "registry.npmjs.org"))];
if (nonPublicHosts.length === 0) pass("lockfile używa wyłącznie publicznego registry npm");
else fail(`lockfile zawiera inne hosty pakietów: ${nonPublicHosts.join(", ")}`);

const packageJson = JSON.parse(text("package.json"));
if (packageJson.scripts?.build && packageJson.scripts?.test && packageJson.scripts?.doctor) pass(`skrypty projektu ${packageJson.version}`);
else fail("package.json nie zawiera wymaganych skryptów build/test/doctor.");

for (const artifact of ["dist/Coopege_v0.01.html", "dist/Coopege_Studio_v0.1.html"]) {
  if (existsSync(resolve(root, artifact))) pass(`gotowy artefakt ${artifact}`); else warn(`brak ${artifact}; uruchom npm run build.`);
}

console.log("\nCOOPEGE DOCTOR\n");
for (const message of passes) console.log(`PASS  ${message}`);
for (const message of warnings) console.log(`WARN  ${message}`);
for (const message of failures) console.log(`FAIL  ${message}`);
console.log(`\nPodsumowanie: ${passes.length} PASS / ${warnings.length} WARN / ${failures.length} FAIL`);
if (failures.length > 0) process.exitCode = 1;
