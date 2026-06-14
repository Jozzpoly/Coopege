import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const state = JSON.parse(readFileSync(resolve(process.cwd(), "PROJECT_STATE.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

test("PROJECT_STATE zamyka M7 i potwierdza ukończony host M8 VS-2", () => {
  assert.equal(state.format, "coopege-project-state");
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.projectVersion, packageJson.version);
  assert.equal(state.status.implemented, true);
  assert.equal(state.status.techVerified, true);
  assert.equal(state.status.successorReviewed, true);
  assert.equal(state.status.ownerAccepted, true);
  assert.equal(state.status.acceptance, "ACCEPT_WITH_DEBT");
  assert.match(state.completedMilestone, /M7/);
  assert.match(state.activeMilestone, /M8 LAN/);
  assert.equal(state.nextMilestone.phase, "IN_PROGRESS");
  assert.equal(state.nextMilestone.implementationStarted, true);
  assert.equal(state.nextMilestone.completedSlice, "VS-2");
  assert.equal(state.nextMilestone.nextSlice, "VS-3");
  assert.deepEqual(state.blockers, []);
  assert.deepEqual(state.mustFixBeforeNext, []);
  assert.match(state.documents.inheritanceReview, /M8_ENTRY_L2_INHERITANCE_REVIEW/);
  assert.match(state.documents.m8LanPlan, /M8_LAN_VERTICAL_SLICE_PLAN/);
  assert.match(state.documents.m8LanAdr, /0018-/);
  assert.match(state.documents.respawnAdr, /0019-/);
  assert.match(state.documents.lanProtocol, /packages\/lan-protocol/);
  assert.match(state.documents.lanHost, /apps\/lan-host/);
  assert.match(state.documents.lanHostGuide, /M8_LAN_HOST_VS2/);
  assert.match(state.documents.lanHostSmoke, /lan-host-smoke/);
});

test("PROJECT_STATE nie próbuje zawierać samoreferencyjnego SHA końcowego ZIP-a", () => {
  assert.match(state.releaseHashAuthority, /External .*\.zip\.sha256/i);
  assert.equal("packageSha256" in state, false);
  assert.equal("archiveSha256" in state, false);
});
