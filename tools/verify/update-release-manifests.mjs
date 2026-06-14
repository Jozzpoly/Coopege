import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const projectState = JSON.parse(readFileSync(resolve(root, "PROJECT_STATE.json"), "utf8"));
const checkOnly = process.argv.includes("--check");

function fileMetadata(relativePath) {
  const bytes = readFileSync(resolve(root, relativePath));
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function writeJson(relativePath, value) {
  writeFileSync(resolve(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

const generatedAt = new Date().toISOString();
const handoffPath = "docs/process/HANDOFF_DOCS_MANIFEST.json";
const handoff = JSON.parse(readFileSync(resolve(root, handoffPath), "utf8"));
const expectedHandoff = { ...handoff };
if (!checkOnly) expectedHandoff.generatedAt = generatedAt;
expectedHandoff.workspace = `coopege@${packageJson.version}`;
expectedHandoff.status = projectState.status.ownerAccepted
  ? projectState.status.successorReviewed
    ? "M7_OWNER_ACCEPTED_WITH_DEBT_SUCCESSOR_REVIEWED"
    : "M7_OWNER_ACCEPTED_WITH_DEBT_NOT_SUCCESSOR_REVIEWED"
  : "TECH_VERIFIED_NOT_SUCCESSOR_REVIEWED_NOT_OWNER_ACCEPTED";
expectedHandoff.activeMilestone = projectState.activeMilestone;
const handoffPaths = [...handoff.files.map((entry) => entry.path)];
for (const path of [
  "docs/process/OWNER_FEEDBACK.md",
  "docs/decisions/0016-deterministic-tile-variants-and-padded-player-atlases.md",
  "docs/decisions/0017-document-coherence-and-owner-feedback.md",
  "docs/reviews/M8_ENTRY_L2_INHERITANCE_REVIEW_2026-06-14.md",
  "docs/process/M8_LAN_VERTICAL_SLICE_PLAN.md",
  "docs/decisions/0018-m8-lan-authoritative-host-and-websocket-protocol.md",
  "docs/decisions/0019-party-respawn-anchor-and-save-normalization.md",
  "docs/process/M8_LAN_HOST_VS2.md",
  "apps/lan-host/src/session.ts",
  "apps/lan-host/src/server.ts",
  "tools/test/lan-host-smoke.mjs",
]) {
  if (!handoffPaths.includes(path)) handoffPaths.push(path);
}
expectedHandoff.files = handoffPaths.map(fileMetadata);
if (!checkOnly) writeJson(handoffPath, expectedHandoff);

const validationPath = "docs/testing/M7_FINAL_VALIDATION_ARTIFACT_MANIFEST.json";
const validation = JSON.parse(readFileSync(resolve(root, validationPath), "utf8"));
const expectedValidation = { ...validation, baseline: { ...validation.baseline } };
if (!checkOnly) expectedValidation.generatedAt = generatedAt;
expectedValidation.workspace = `coopege@${packageJson.version}`;
expectedValidation.status = projectState.status.ownerAccepted
  ? "M7_OWNER_ACCEPTED_WITH_DEBT"
  : "M7_FINAL_VALIDATION_CANDIDATE";
expectedValidation.baseline.doctor = "18 PASS / 0 WARN / 0 FAIL";
expectedValidation.baseline.handoff = "40 PASS / 0 FAIL";
expectedValidation.baseline.portability = "21 PASS / 0 WARN / 0 FAIL";
expectedValidation.baseline.node = `${projectState.expectedBaseline.nodeTests}/${projectState.expectedBaseline.nodeTests} PASS`;
const validationPaths = [...validation.files.map((entry) => entry.path)];
for (const path of [
  "tools/npm-cli.mjs",
  "tools/verify/update-release-manifests.mjs",
  "docs/decisions/0016-deterministic-tile-variants-and-padded-player-atlases.md",
  "docs/decisions/0017-document-coherence-and-owner-feedback.md",
  "docs/process/OWNER_FEEDBACK.md",
]) {
  if (!validationPaths.includes(path)) validationPaths.push(path);
}
expectedValidation.files = validationPaths.map(fileMetadata);
if (!checkOnly) writeJson(validationPath, expectedValidation);

const sumsPath = "docs/testing/SHA256SUMS_M7_FINAL_VALIDATION.txt";
const sumPaths = readFileSync(resolve(root, sumsPath), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(66));
const sums = sumPaths.map((path) => `${fileMetadata(path).sha256}  ${path}`).join("\n");
const expectedSums = `${sums}\n`;

if (checkOnly) {
  const failures = [];
  if (JSON.stringify(handoff) !== JSON.stringify(expectedHandoff)) failures.push(handoffPath);
  if (JSON.stringify(validation) !== JSON.stringify(expectedValidation)) failures.push(validationPath);
  if (readFileSync(resolve(root, sumsPath), "utf8") !== expectedSums) failures.push(sumsPath);
  if (failures.length > 0) {
    throw new Error(`Nieaktualne manifesty wydania: ${failures.join(", ")}. Uruchom npm run release:manifests.`);
  }
  console.log(`PASS manifesty wydania dla coopege@${packageJson.version}.`);
} else {
  writeFileSync(resolve(root, sumsPath), expectedSums);
  console.log(`Zaktualizowano manifesty wydania dla coopege@${packageJson.version}.`);
}
