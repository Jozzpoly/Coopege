import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const failures = [];
const passes = [];
const warnings = [];
const pass = (message) => passes.push(message);
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const read = (path) => readFileSync(resolve(root, path), "utf8");

function walk(relativeRoot) {
  const absolute = resolve(root, relativeRoot);
  if (!existsSync(absolute)) return [];
  const result = [];
  for (const name of readdirSync(absolute)) {
    const path = join(absolute, name);
    const relativePath = relative(root, path).replaceAll("\\", "/");
    if (statSync(path).isDirectory()) result.push(...walk(relativePath));
    else result.push(relativePath);
  }
  return result;
}

const operationalFiles = [
  "package.json", "package-lock.json", ".npmrc", "tsconfig.json", "tsconfig.test.json",
  "PLAY_COOPEGE.bat", "START_COOPEGE.bat", "START_STUDIO.bat", "REBUILD_AND_PLAY.bat", "COLLECT_DIAGNOSTICS.bat",
  ...walk("apps"), ...walk("packages"), ...walk("tools"), ...walk("tests"),
].filter((path) => !["tools/verify/doctor.mjs", "tools/verify/portability.mjs"].includes(path))
  .filter((path) => [".json", ".js", ".mjs", ".ts", ".html", ".css", ".bat", ".npmrc"].includes(extname(path)) || path === ".npmrc");

const forbiddenPatterns = [
  [/packages\.applied-caas-gateway1\.internal\.api\.openai\.org/i, "wewnętrzny registry OpenAI"],
  [/\binternal\.api\.openai\.org\b/i, "wewnętrzna domena OpenAI"],
  [/\b10\.192\.71\.42\b/, "prywatny adres registry"],
  [/(?:[A-Z]:\\Users\\|[A-Z]:\\Pliki_Joza\\|\/mnt\/data\/|\/home\/oai\/)/i, "absolutna ścieżka środowiska autora"],
];
for (const path of operationalFiles) {
  const text = read(path);
  for (const [pattern, label] of forbiddenPatterns) {
    if (pattern.test(text)) fail(`${path}: ${label}`);
  }
}
if (!failures.some((message) => message.includes(":"))) pass(`zeskanowano ${operationalFiles.length} plików operacyjnych bez prywatnych URL-i i ścieżek`);

const lock = JSON.parse(read("package-lock.json"));
const lockText = JSON.stringify(lock);
const hosts = [...lockText.matchAll(/https:\/\/([^/"\\]+)/g)].map((match) => match[1]);
const packageHosts = [...new Set(hosts.filter((host) => host.includes("npm") || host.includes("artifactory")))];
if (packageHosts.every((host) => host === "registry.npmjs.org")) pass("lockfile używa wyłącznie publicznego hosta pakietów");
else fail(`lockfile zawiera niepubliczne hosty pakietów: ${packageHosts.join(", ")}`);

for (const path of ["PLAY_COOPEGE.bat", "START_COOPEGE.bat", "START_STUDIO.bat", "REBUILD_AND_PLAY.bat", "COLLECT_DIAGNOSTICS.bat"]) {
  const bytes = readFileSync(resolve(root, path));
  if ([...bytes].some((value) => value > 127)) fail(`${path}: zawiera znaki spoza ASCII, ryzyko Windows PowerShell/cmd`);
  else pass(`${path}: ASCII`);
  const text = bytes.toString("ascii");
  if (text.includes("\n") && !text.includes("\r\n")) fail(`${path}: nie używa CRLF`);
  else pass(`${path}: CRLF`);
}

const packageJson = JSON.parse(read("package.json"));
if (packageJson.scripts?.play === "node tools/dev-server.mjs --open=runtime") pass("play uruchamia gotowy build bez npm install/build");
else fail("npm run play powinno uruchamiać gotowy build bez przebudowania");
if (packageJson.scripts?.["play:rebuild"]?.includes("npm run build")) pass("osobny play:rebuild jawnie przebudowuje źródła");
else fail("brak osobnego play:rebuild");

for (const artifact of ["dist/Coopege_v0.01.html", "dist/Coopege_Studio_v0.1.html", "dist/Coopege_M7A_Asset_Vault.zip"]) {
  if (!existsSync(resolve(root, artifact))) fail(`brak artefaktu wydania ${artifact}`);
  else pass(`jest ${artifact}`);
}
for (const html of ["dist/Coopege_v0.01.html", "dist/Coopege_Studio_v0.1.html"]) {
  if (!existsSync(resolve(root, html))) continue;
  const text = read(html);
  if (/data-owner-accepted\s*=\s*["\']true["\']/i.test(text) || /status[^<\n]{0,40}(?<!NOT )OWNER ACCEPTED/i.test(text)) fail(`${html}: przedwcześnie deklaruje OWNER ACCEPTED`);
  else pass(`${html}: nie deklaruje OWNER ACCEPTED`);
  if (/M7 Final Playtest Candidate|M7 PLAYTEST CANDIDATE/i.test(text)) pass(`${html}: oznaczone jako kandydat M7`);
  else warn(`${html}: brak czytelnego statusu kandydata M7`);
}

console.log("\nCOOPEGE PORTABILITY GATE\n");
for (const message of passes) console.log(`PASS  ${message}`);
for (const message of warnings) console.log(`WARN  ${message}`);
for (const message of failures) console.log(`FAIL  ${message}`);
console.log(`\nPodsumowanie: ${passes.length} PASS / ${warnings.length} WARN / ${failures.length} FAIL`);
if (failures.length) process.exitCode = 1;
