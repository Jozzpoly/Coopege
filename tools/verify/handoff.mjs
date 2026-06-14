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
  "docs/process/OWNER_FEEDBACK.md",
  "docs/process/AGENT_WORKFLOW.md",
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
  if (state.completedMilestone?.includes("M7") && state.activeMilestone?.includes("M8 LAN")) pass(`zamknięte ${state.completedMilestone}; aktywne ${state.activeMilestone}`);
  else fail("stan powinien zamykać M7 i wskazywać M8 LAN jako aktywny etap wejściowy");
  if (state.status?.implemented === true) pass("IMPLEMENTED=true dla zamkniętego M7"); else fail("IMPLEMENTED powinno być true dla zamkniętego M7");
  const inheritanceReview = state.documents?.inheritanceReview;
  if (state.status?.successorReviewed === true && typeof inheritanceReview === "string" && existsSync(resolve(root, inheritanceReview)) && /`PASS`|Decyzja[\s\S]{0,80}PASS/i.test(read(inheritanceReview))) {
    pass(`SUCCESSOR_REVIEWED potwierdzone raportem ${inheritanceReview}`);
  } else fail("SUCCESSOR_REVIEWED wymaga istniejącego raportu L2 z decyzją PASS");
  if (state.status?.ownerAccepted === true && state.status?.acceptance === "ACCEPT_WITH_DEBT") pass("OWNER_ACCEPTED_WITH_DEBT potwierdzone decyzją Przemka");
  else fail("M7 powinno mieć OWNER_ACCEPTED=true i ACCEPT_WITH_DEBT");
  if (String(state.releaseHashAuthority).includes("External") && !JSON.stringify(state).match(/[a-f0-9]{64}.*\.zip/i)) pass("hash końcowego ZIP-a pozostaje zewnętrznym sidecarem");
  else fail("PROJECT_STATE nie może przechowywać samoreferencyjnego hash-u końcowego ZIP-a");
  if (Number.isInteger(state.expectedBaseline?.nodeTests) && state.expectedBaseline.nodeTests > 0) pass(`oczekiwane testy Node: ${state.expectedBaseline.nodeTests}`);
  else fail("brak oczekiwanej liczby testów Node");
  if (state.nextMilestone?.phase === "IN_PROGRESS" && state.nextMilestone?.implementationStarted === true
    && state.nextMilestone?.completedSlice === "VS-3" && state.nextMilestone?.nextSlice === "VS-4"
    && existsSync(resolve(root, "packages/lan-protocol/src/index.ts"))
    && existsSync(resolve(root, "apps/lan-host/src/server.ts"))
    && existsSync(resolve(root, "tools/test/lan-host-smoke.mjs"))
    && existsSync(resolve(root, "apps/runtime/src/lan-client-main.ts"))
    && existsSync(resolve(root, "tools/test/lan-client-browser-smoke.mjs"))
    && Array.isArray(state.blockers) && state.blockers.length === 0
    && Array.isArray(state.mustFixBeforeNext) && state.mustFixBeforeNext.length === 0) {
    pass("M8 rozpoczęte; VS-3 grywalny klient ukończony, VS-4 awarie i reconnect są następnym krokiem");
  } else fail("nieprawidłowy stan implementacji M8 po VS-3");
}

if (existsSync(resolve(root, "docs/process/NEXT_AGENT_BRIEF.md"))) {
  const pointer = read("docs/process/NEXT_AGENT_BRIEF.md");
  if (pointer.includes("CURRENT_MILESTONE.md") && pointer.length < 800) pass("NEXT_AGENT_BRIEF jest tylko krótkim wskaźnikiem kompatybilności");
  else fail("NEXT_AGENT_BRIEF dubluje aktywny brief");
}

const currentDocs = [
  "AI_PROJECT_MEMORY.md",
  "START_HERE.md",
  "README.md",
  "docs/process/CURRENT_MILESTONE.md",
  "docs/process/LAST_HANDOFF.md",
  "docs/product/COOPEGE_ROADMAP.md",
];
for (const relative of currentDocs) {
  const content = existsSync(resolve(root, relative)) ? read(relative) : "";
  if (/OWNER[ _]ACCEPTED/i.test(content) && !/NOT OWNER[ _]ACCEPTED/i.test(content)) pass(`${relative} potwierdza owner acceptance M7`);
  else fail(`${relative} nie jest spójny z OWNER_ACCEPTED=true`);
  if (/M8[\s\S]{0,80}LAN|LAN[\s\S]{0,80}M8/i.test(content)) pass(`${relative} wskazuje M8 LAN`);
  else fail(`${relative} nie wskazuje aktywnego M8 LAN`);
}

const feedback = existsSync(resolve(root, "docs/process/OWNER_FEEDBACK.md")) ? read("docs/process/OWNER_FEEDBACK.md") : "";
if (/respawn/i.test(feedback) && /FIXED_NEEDS_RETEST/i.test(feedback)) pass("OWNER_FEEDBACK zachowuje poprawkę respawnu C0 oczekującą na retest");
else fail("OWNER_FEEDBACK nie zapisuje aktualnego statusu poprawki respawnu C0");
for (const relative of ["docs/process/AGENT_WORKFLOW.md", "docs/process/AGENT_HANDOFF_PROTOCOL_V2.md"]) {
  const content = existsSync(resolve(root, relative)) ? read(relative) : "";
  if (content.includes("OWNER_FEEDBACK.md") && /spójno/i.test(content)) pass(`${relative} egzekwuje spójność dokumentacji i intake feedbacku`);
  else fail(`${relative} nie zawiera reguły spójności dokumentacji i OWNER_FEEDBACK.md`);
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
