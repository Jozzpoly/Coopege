import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BRIDGE_TYPES,
  COOPEGE_PROTOCOL,
  COOPEGE_PROTOCOL_VERSION,
  createBridgeEnvelope,
  isBridgeEnvelope,
} from "../packages/dev-protocol/src/index.js";

const nonce = "0123456789abcdef0123456789abcdef";

test("most akceptuje wyłącznie poprawną kopertę i nonce sesji", () => {
  const valid = createBridgeEnvelope(nonce, "r1", BRIDGE_TYPES.studioHello, {
    studioVersion: "0.1.0",
    schemaVersion: 1,
    capabilities: [],
  });
  assert.equal(isBridgeEnvelope(valid, nonce), true);
  assert.equal(isBridgeEnvelope(valid, "ffffffffffffffffffffffffffffffff"), false);
  assert.equal(isBridgeEnvelope({ ...valid, protocolVersion: 99 }), false);
  assert.equal(isBridgeEnvelope({ ...valid, sessionNonce: "short" }), false);
  assert.equal(isBridgeEnvelope({ ...valid, type: "unknown.message" }), false);
});

test("project.apply wymaga projektu i revision", async () => {
  const project = JSON.parse(await readFile(join(process.cwd(), "project", "fixtures", "minimal.project.json"), "utf8"));
  const valid = createBridgeEnvelope(nonce, "r2", BRIDGE_TYPES.projectApply, { project, studioRevision: 4 });
  assert.equal(isBridgeEnvelope(valid, nonce), true);
  assert.equal(isBridgeEnvelope({
    protocol: COOPEGE_PROTOCOL,
    protocolVersion: COOPEGE_PROTOCOL_VERSION,
    sessionNonce: nonce,
    requestId: "r3",
    type: BRIDGE_TYPES.projectApply,
    payload: { project },
  }, nonce), false);
});

test("gameplay.test wymaga stabilnego graphId i playerId, a wynik niesie plan", () => {
  const request = createBridgeEnvelope(nonce, "r4", BRIDGE_TYPES.gameplayTest, {
    graphId: "graph.ability.basic_strike",
    playerId: "player.local.2",
  });
  assert.equal(isBridgeEnvelope(request, nonce), true);
  assert.equal(isBridgeEnvelope({ ...request, payload: { graphId: 5, playerId: "player.local.2" } }, nonce), false);
  const response = createBridgeEnvelope(nonce, "r4", BRIDGE_TYPES.gameplayTestResult, {
    graphId: "graph.ability.basic_strike",
    playerId: "player.local.2",
    result: { ok: true, graphId: "graph.ability.basic_strike", operations: [], trace: [], stepsUsed: 1 },
  });
  assert.equal(isBridgeEnvelope(response, nonce), true);
});
