import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (relative) => readFileSync(resolve(root, relative), "utf8");
const failures = [];
const passes = [];
const pass = (message) => passes.push(message);
const fail = (message) => failures.push(message);

const required = [
  "PROJECT_STATE.json",
  "AI_PROJECT_MEMORY.md",
  "START_HERE.md",
  "docs/process/AGENT_HANDOFF_PROTOCOL_V2.md",
  "docs/process/CURRENT_MILESTONE.md",
  "docs/process/LAST_HANDOFF.md",
  "docs/process/INHERITANCE_REVIEW_TEMPLATE.md",
  "docs/process/PLAYTEST_LOG.md",
  "docs/reviews/README.md",
];
for (const relative of required) {
  if (existsSync(resolve(root, relative))) pass(`jest ${relative}`);
  else fail(`brak ${relative}`);
}

let state;
let pkg;
try { state = JSON.parse(read("PROJECT_STATE.json")); pass("PROJECT_STATE.json jest poprawnym JSON-em"); }
catch (error) { fail(`PROJECT_STATE.json jest uszkodzony: ${error instanceof Error ? error.message : String(error)}`); }
try { pkg = JSON.parse(read("package.json")); pass("package.json jest poprawnym JSON-em"); }
catch (error) { fail(`package.json jest uszkodzony: ${error instanceof Error ? error.message : String(error)}`); }

if (state && pkg) {
  if (state.format === "coopege-project-state" && state.schemaVersion === 1) pass("format PROJECT_STATE v1");
  else fail("nieznany format PROJECT_STATE");
  if (state.projectVersion === pkg.version) pass(`wersja stanu zgadza się z package.json: ${pkg.version}`);
  else fail(`wersja stanu ${state.projectVersion} != package ${pkg.version}`);
  if (state.activeMilestone?.includes("M7")) pass(`aktywny milestone: ${state.activeMilestone}`);
  else fail("aktywny milestone nie wskazuje M7 Finalization");
  if (state.status?.implemented === true) pass("IMPLEMENTED=true"); else fail("IMPLEMENTED powinno być true dla kandydata");
  if (state.status?.successorReviewed === false) pass("SUCCESSOR_REVIEWED pozostaje false"); else fail("agent wydający paczkę nie może ustawić SUCCESSOR_REVIEWED");
  if (state.status?.ownerAccepted === false) pass("OWNER_ACCEPTED pozostaje false"); else fail("OWNER_ACCEPTED może nadać tylko Przemek");
  if (String(state.releaseHashAuthority).includes("External") && !JSON.stringify(state).match(/[a-f0-9]{64}.*\.zip/i)) pass("hash końcowego ZIP-a pozostaje zewnętrznym sidecarem");
  else fail("PROJECT_STATE nie może przechowywać samoreferencyjnego hash-u końcowego ZIP-a");
  if (Number.isInteger(state.expectedBaseline?.nodeTests) && state.expectedBaseline.nodeTests > 0) pass(`oczekiwane testy Node: ${state.expectedBaseline.nodeTests}`);
  else fail("brak oczekiwanej liczby testów Node");
  if (Array.isArray(state.mustFixBeforeNext) && state.mustFixBeforeNext.some((item) => /owner|Przemek/i.test(item)) && state.mustFixBeforeNext.some((item) => /successor|L2/i.test(item))) pass("M8 ma dwie jawne blokady: owner gate i successor review");
  else fail("brak pełnej blokady M8");
}

if (existsSync(resolve(root, "docs/process/NEXT_AGENT_BRIEF.md"))) {
  const pointer = read("docs/process/NEXT_AGENT_BRIEF.md");
  if (pointer.includes("CURRENT_MILESTONE.md") && pointer.length < 800) pass("NEXT_AGENT_BRIEF jest tylko krótkim wskaźnikiem kompatybilności");
  else fail("NEXT_AGENT_BRIEF dubluje aktywny brief");
}

const current = existsSync(resolve(root, "docs/process/CURRENT_MILESTONE.md")) ? read("docs/process/CURRENT_MILESTONE.md") : "";
const handoff = existsSync(resolve(root, "docs/process/LAST_HANDOFF.md")) ? read("docs/process/LAST_HANDOFF.md") : "";
for (const [name, content] of [["CURRENT_MILESTONE", current], ["LAST_HANDOFF", handoff]]) {
  if (/NOT OWNER ACCEPTED|OWNER_ACCEPTED.{0,20}(?:NIE|false)/is.test(content)) pass(`${name} nie deklaruje owner acceptance`);
  else fail(`${name} musi jawnie pozostawić OWNER_ACCEPTED=false`);
}

const docsManifestPath = "docs/process/HANDOFF_DOCS_MANIFEST.json";
if (existsSync(resolve(root, docsManifestPath))) {
  try {
    const manifest = JSON.parse(read(docsManifestPath));
    let verified = 0;
    for (const entry of manifest.files ?? []) {
      const absolute = resolve(root, entry.path);
      if (!existsSync(absolute)) { fail(`manifest handoff wskazuje brakujący plik ${entry.path}`); continue; }
      const bytes = readFileSync(absolute);
      const actual = createHash("sha256").update(bytes).digest("hex");
      if (actual !== entry.sha256 || bytes.length !== entry.bytes) fail(`manifest handoff nie zgadza się dla ${entry.path}`);
      else verified += 1;
    }
    if (verified === (manifest.files?.length ?? 0) && verified > 0) pass(`manifest handoff: ${verified}/${verified} plików`);
  } catch (error) { fail(`manifest handoff jest uszkodzony: ${error instanceof Error ? error.message : String(error)}`); }
} else fail(`brak ${docsManifestPath}`);

const digest = createHash("sha256").update(read("PROJECT_STATE.json")).digest("hex");
pass(`PROJECT_STATE sha256 ${digest.slice(0, 12)}…`);

console.log("\nCOOPEGE HANDOFF GATE\n");
for (const message of passes) console.log(`PASS  ${message}`);
for (const message of failures) console.log(`FAIL  ${message}`);
console.log(`\nPodsumowanie: ${passes.length} PASS / ${failures.length} FAIL`);
if (failures.length) process.exitCode = 1;
