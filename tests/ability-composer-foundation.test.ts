import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CORE_ACTION_IDS,
  CORE_CONDITION_IDS,
  CORE_EFFECT_IDS,
  CORE_GAMEPLAY_PRIMITIVE_CATALOG,
  CORE_TARGET_QUERY_IDS,
} from "../packages/gameplay-language/src/index.js";
import { GameWorld, PRIMARY_PLAYER_ID, SECONDARY_PLAYER_ID } from "../packages/gameplay/src/index.js";
import type { CoopegeProject, GameplayNodeDefinition } from "../packages/schema/src/index.js";
import { prepareRuntimeProject } from "../packages/runtime-core/src/index.js";
import { stableChecksum, validateProject } from "../packages/validation/src/index.js";

const root = process.cwd();
function project(): CoopegeProject {
  return JSON.parse(readFileSync(resolve(root, "project/project.json"), "utf8")) as CoopegeProject;
}

test("katalog Ability Composer dokładnie pokrywa wszystkie prymitywy runtime", () => {
  const expected = new Set<string>([
    ...CORE_CONDITION_IDS,
    ...CORE_TARGET_QUERY_IDS,
    ...CORE_ACTION_IDS,
    ...CORE_EFFECT_IDS,
  ]);
  const actual = new Set(CORE_GAMEPLAY_PRIMITIVE_CATALOG.map((entry) => entry.id));
  assert.deepEqual(actual, expected);
  for (const entry of CORE_GAMEPLAY_PRIMITIVE_CATALOG) {
    assert.ok(entry.label.length > 0);
    assert.ok(entry.description.length > 0);
    for (const parameter of entry.parameters) {
      assert.match(parameter.id, /^[a-z][a-zA-Z0-9_-]*$/);
      if (parameter.type === "number" && parameter.defaultValue !== undefined) {
        assert.equal(typeof parameter.defaultValue, "number");
      }
    }
  }
});

test("runtime planuje ten sam graf dla P1 i P2 bez mutowania świata, zachowując ownership", () => {
  const prepared = prepareRuntimeProject(project());
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const world = new GameWorld(prepared.prepared, { initialPlayerCount: 2 });
  const before = world.stateChecksum();
  const graphId = project().content.abilities[0]!.graphId;
  const p1 = world.planGameplayGraph(graphId, PRIMARY_PLAYER_ID);
  const p2 = world.planGameplayGraph(graphId, SECONDARY_PLAYER_ID);
  assert.equal(p1.ok, true);
  assert.equal(p2.ok, true);
  if (!p1.ok || !p2.ok) return;
  assert.equal(world.stateChecksum(), before);
  assert.ok(p1.operations.length > 0);
  assert.ok(p2.operations.length > 0);
  assert.ok(p1.operations.every((operation) => operation.ownerPlayerId === PRIMARY_PLAYER_ID));
  assert.ok(p2.operations.every((operation) => operation.ownerPlayerId === SECONDARY_PLAYER_ID));
  assert.deepEqual(p1.trace.map((step) => step.nodeId), p2.trace.map((step) => step.nodeId));
});

test("struktura grafu nie dopuszcza węzła skryptowego ani wykonywalnego kodu", () => {
  const malicious = structuredClone(project());
  const graph = malicious.gameplay.graphs[0]!;
  graph.nodes.splice(0, 0, {
    id: "node.script.injected",
    kind: "script",
    source: "globalThis.hacked=true",
    next: graph.entryNodeId,
  } as unknown as GameplayNodeDefinition);
  graph.entryNodeId = "node.script.injected";
  const before = stableChecksum(project());
  const result = validateProject(malicious);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "invalid_gameplay_node_kind"));
  assert.equal(stableChecksum(project()), before);
});
