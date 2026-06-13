import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GameplayInterpreter,
  createCoreGameplayRegistry,
  type GameplayPrimitiveEnvironment,
} from "../packages/gameplay-language/src/index.js";
import {
  GameWorld,
  PRIMARY_PLAYER_ID,
  createInputFrame,
  type PlayerCommand,
} from "../packages/gameplay/src/index.js";
import {
  migrateProjectToLatest,
  type CoopegeProject,
  type CoopegeProjectV1,
  type GameplayDomain,
  type GameplayLanguageDefinition,
} from "../packages/schema/src/index.js";
import { AtomicProjectHost, prepareRuntimeProject } from "../packages/runtime-core/src/index.js";
import { validateProject } from "../packages/validation/src/index.js";

const root = process.cwd();

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as unknown;
}

function latestProject(): CoopegeProject {
  const value = readJson("project/project.json");
  const validation = validateProject(value);
  assert.equal(validation.ok, true, JSON.stringify(validation.issues));
  return value as CoopegeProject;
}

function prepared() {
  const result = prepareRuntimeProject(latestProject());
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.prepared;
}

function command(overrides: Partial<PlayerCommand> = {}): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false, ...overrides };
}

function context(world: GameWorld, domain: GameplayDomain, sourceEntityId: string, providedTargetEntityId: string | null, abilityId: string | null) {
  return {
    domain,
    entryPointId: `test.${domain}`,
    sourceEntityId,
    ownerPlayerId: sourceEntityId === world.player.entityId ? world.player.playerId : null,
    abilityId,
    providedTargetEntityId,
  };
}

test("schema v1 migruje jawnie do v2 z deterministycznymi grafami i sześcioma domenami", () => {
  const v1 = readJson("project/migration/legacy-v14.1/coopege.project.json") as CoopegeProjectV1;
  assert.equal(v1.schemaVersion, 1);
  const first = migrateProjectToLatest(v1);
  const second = migrateProjectToLatest(v1);
  assert.equal(first.migratedFromVersion, 1);
  assert.deepEqual(first.project, second.project);
  assert.equal(first.project.schemaVersion, 2);
  assert.ok(first.project.content.abilities.every((ability) => ability.graphId.startsWith("graph.ability.")));
  assert.deepEqual(new Set(first.project.gameplay.bindings.map((binding) => binding.domain)), new Set<GameplayDomain>([
    "ability", "item-effect", "talent-modifier", "ai-action", "quest-reaction", "map-trigger",
  ]));
  assert.equal(validateProject(first.project).ok, true);
});

test("walidator odrzuca nieznany prymityw, zły typ parametru i cykl grafu", () => {
  const unknown = structuredClone(latestProject());
  const unknownNode = unknown.gameplay.graphs[0]!.nodes.find((node) => node.kind === "effect");
  assert.ok(unknownNode && unknownNode.kind === "effect");
  unknownNode.effectId = "effect.not-registered";
  const unknownResult = validateProject(unknown);
  assert.equal(unknownResult.ok, false);
  assert.ok(unknownResult.issues.some((issue) => issue.code === "unknown_gameplay_primitive"));

  const wrongType = structuredClone(latestProject());
  const heal = wrongType.gameplay.graphs.find((graph) => graph.id === "graph.item.healing-tonic")!;
  const healNode = heal.nodes.find((node) => node.kind === "effect");
  assert.ok(healNode && healNode.kind === "effect");
  healNode.parameters = { amount: "dziesięć" };
  const wrongTypeResult = validateProject(wrongType);
  assert.equal(wrongTypeResult.ok, false);
  assert.ok(wrongTypeResult.issues.some((issue) => issue.code === "invalid_gameplay_parameter_type"));

  const cycle = structuredClone(latestProject());
  const graph = cycle.gameplay.graphs[0]!;
  const end = graph.nodes.find((node) => node.kind === "end");
  assert.ok(end);
  graph.nodes[graph.nodes.indexOf(end!)] = { id: end!.id, kind: "action", actionId: "action.start-miss-cooldown", next: graph.entryNodeId };
  const cycleResult = validateProject(cycle);
  assert.equal(cycleResult.ok, false);
  assert.ok(cycleResult.issues.some((issue) => issue.code === "gameplay_cycle_forbidden"));
});

test("AtomicProjectHost odrzuca wadliwy graf bez zmiany aktywnego projektu", () => {
  const host = new AtomicProjectHost();
  const valid = latestProject();
  const applied = host.apply(valid);
  assert.equal(applied.ok, true);
  const checksum = host.current?.checksum;
  const bad = structuredClone(valid);
  bad.content.abilities[0]!.graphId = "graph.missing";
  const rejected = host.apply(bad);
  assert.equal(rejected.ok, false);
  assert.equal(host.revision, 1);
  assert.equal(host.current?.checksum, checksum);
});

test("interpreter zatrzymuje graf przed commit po przekroczeniu budżetu", () => {
  const read = {
    sourceAlive: () => true,
    cooldownReady: () => true,
    providedTargetIsMonster: () => true,
    selectNearestHostile: () => [],
    selectSource: () => ["entity.player.1"],
    selectProvidedTarget: () => [],
  };
  const registry = createCoreGameplayRegistry(read);
  const language: GameplayLanguageDefinition = {
    schemaVersion: 1,
    executionBudget: 2,
    graphs: [{
      id: "graph.test.budget",
      name: "Budget",
      entryNodeId: "node.one",
      nodes: [
        { id: "node.one", kind: "action", actionId: "action.increment-quest-credit", next: "node.two" },
        { id: "node.two", kind: "action", actionId: "action.increment-quest-credit", next: "node.three" },
        { id: "node.three", kind: "action", actionId: "action.increment-quest-credit", next: "node.end" },
        { id: "node.end", kind: "end" },
      ],
    }],
    bindings: [],
    triggers: [],
  };
  const interpreter = new GameplayInterpreter(language, registry);
  const result = interpreter.planGraph("graph.test.budget", {
    domain: "quest-reaction",
    entryPointId: "test.budget",
    sourceEntityId: "entity.player.1",
    ownerPlayerId: PRIMARY_PLAYER_ID,
    abilityId: null,
    providedTargetEntityId: null,
    tick: 1,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "budget_exceeded");
  assert.equal(result.stepsUsed, 2);
});

test("sześć domen używa tych samych rejestrów i zachowuje ownership coopa", () => {
  const world = new GameWorld(prepared(), { initialPlayerCount: 2 });
  const player = world.player;
  const monster = world.monsters[0]!;
  player.position = { x: 4.5, y: 4.5 };
  player.previousPosition = { ...player.position };
  player.facing = { x: 1, y: 0 };
  monster.position = { x: 5.2, y: 4.5 };
  monster.previousPosition = { ...monster.position };

  player.hp = 50;
  assert.equal(world.executeGameplayBinding("binding.item.healing-tonic", context(world, "item-effect", player.entityId, null, null)).ok, true);
  assert.equal(player.hp, 60);
  assert.equal(world.executeGameplayBinding("binding.talent.guardian-focus", context(world, "talent-modifier", player.entityId, null, null)).ok, true);
  assert.equal(player.hp, 63);
  assert.equal(world.executeGameplayBinding("binding.map.healing-sigil", context(world, "map-trigger", player.entityId, null, null)).ok, true);
  assert.equal(player.hp, 71);

  const hpBeforeAi = player.hp;
  assert.equal(world.executeGameplayBinding("binding.ai.training-attack", context(world, "ai-action", monster.entityId, player.entityId, null)).ok, true);
  assert.equal(player.hp, hpBeforeAi - 5);

  const creditBefore = world.teamQuestKillCredits;
  assert.equal(world.executeGameplayBinding("binding.quest.monster-kill-credit", context(world, "quest-reaction", player.entityId, monster.entityId, null)).ok, true);
  assert.equal(world.teamQuestKillCredits, creditBefore + 1);

  const hpBeforeAbility = monster.hp;
  assert.equal(world.executeGameplayBinding("binding.ability.basic_strike", context(world, "ability", player.entityId, null, player.abilityId)).ok, true);
  assert.equal(monster.hp, hpBeforeAbility - 15);
  const damageEvent = world.events.drain().find((event) => event.type === "damage.applied" && event.context.ownerPlayerId === player.playerId);
  assert.ok(damageEvent && damageEvent.type === "damage.applied");
  assert.equal(damageEvent.context.effectId, "effect.damage-from-ability");
});

test("trigger actor.died nalicza quest credit tylko dla potwora i pozostaje deterministyczny", () => {
  const run = (): { checksum: string; credits: number; failures: number } => {
    const world = new GameWorld(prepared());
    const monster = world.monsters[0]!;
    world.player.position = { x: 4.5, y: 4.5 };
    world.player.previousPosition = { ...world.player.position };
    world.player.facing = { x: 1, y: 0 };
    monster.position = { x: 5.2, y: 4.5 };
    monster.previousPosition = { ...monster.position };
    monster.moveSpeedTilesPerSecond = 0;
    const events: ReturnType<typeof world.events.drain> = [];
    world.events.subscribeAll((event) => events.push(event));
    for (let tick = 1; tick <= 50; tick += 1) {
      world.step(createInputFrame(tick, world.playerId, command({ usePrimary: tick === 1 || tick === 19 || tick === 37 })));
    }
    return {
      checksum: world.stateChecksum(),
      credits: world.teamQuestKillCredits,
      failures: events.filter((event) => event.type === "gameplay.execution_failed").length,
    };
  };
  const first = run();
  const second = run();
  assert.equal(first.credits, 1);
  assert.equal(first.failures, 0);
  assert.deepEqual(first, second);
});
