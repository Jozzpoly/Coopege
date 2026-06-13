import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const state = JSON.parse(readFileSync(resolve(process.cwd(), "PROJECT_STATE.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

test("PROJECT_STATE zamyka M7 decyzją właściciela i otwiera M8 wyłącznie na entry review", () => {
  assert.equal(state.format, "coopege-project-state");
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.projectVersion, packageJson.version);
  assert.equal(state.status.implemented, true);
  assert.equal(state.status.techVerified, true);
  assert.equal(state.status.successorReviewed, false);
  assert.equal(state.status.ownerAccepted, true);
  assert.equal(state.status.acceptance, "ACCEPT_WITH_DEBT");
  assert.match(state.completedMilestone, /M7/);
  assert.match(state.activeMilestone, /M8 LAN/);
  assert.equal(state.nextMilestone.implementationStarted, false);
  assert.ok(!state.mustFixBeforeNext.some((item: string) => /Przemek|owner/i.test(item)));
  assert.ok(state.mustFixBeforeNext.some((item: string) => /successor|L2/i.test(item)));
});

test("PROJECT_STATE nie próbuje zawierać samoreferencyjnego SHA końcowego ZIP-a", () => {
  assert.match(state.releaseHashAuthority, /External .*\.zip\.sha256/i);
  assert.equal("packageSha256" in state, false);
  assert.equal("archiveSha256" in state, false);
});
