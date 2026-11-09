import test from "node:test";
import assert from "node:assert/strict";
import { spawnsAtCell, spawnById } from "../apps/studio/src/spawn-inspection.js";
import type { SpawnDefinition } from "../packages/schema/src/types.js";

const examples: ReadonlyArray<SpawnDefinition> = Object.freeze([
  Object.freeze({ id: "spawn.rat.1", monsterId: "rat", floorId: "surface", x: 4, y: 5, count: 1, respawnTicks: 120 }),
  Object.freeze({ id: "spawn.rat.2", monsterId: "rat", floorId: "surface", x: 4, y: 5, count: 2, respawnTicks: 130 }),
  Object.freeze({ id: "spawn.orc", monsterId: "orc", floorId: "surface", x: 5, y: 5, count: 1, respawnTicks: 150 }),
  Object.freeze({ id: "spawn.cave", monsterId: "rat", floorId: "cave", x: 4, y: 5, count: 1, respawnTicks: 150 }),
]);

test("every spawn at a cell is discoverable, never an arbitrary first", () => {
  assert.deepEqual(spawnsAtCell(examples, "surface", 4, 5).map((spawn) => spawn.id), ["spawn.rat.1", "spawn.rat.2"]);
  assert.deepEqual(spawnsAtCell(examples, "cave", 4, 5).map((spawn) => spawn.id), ["spawn.cave"]);
  assert.deepEqual(spawnsAtCell(examples, "surface", 1, 1), []);
});

test("stable id points to exactly one spawn without fallback", () => {
  assert.equal(spawnById(examples, "spawn.orc")?.monsterId, "orc");
  assert.equal(spawnById(examples, "unknown"), undefined);
});

test("inspection does not mutate the authored source", () => {
  const before = JSON.stringify(examples);
  spawnsAtCell(examples, "surface", 4, 5);
  spawnById(examples, "spawn.rat.2");
  assert.equal(JSON.stringify(examples), before);
});
