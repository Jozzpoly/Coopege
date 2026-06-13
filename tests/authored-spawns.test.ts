import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSpawnRuntimeStates,
  createMultiPlayerInputFrame,
  GameWorld,
  PRIMARY_PLAYER_ID,
  SECONDARY_PLAYER_ID,
  type PlayerCommand,
} from "../packages/gameplay/src/index.js";
import { AtomicProjectHost, prepareRuntimeProject, type PreparedRuntimeProject } from "../packages/runtime-core/src/index.js";
import type { CoopegeProject, SpawnDefinition } from "../packages/schema/src/index.js";

const root = process.cwd();

function loadJson(path: string): CoopegeProject {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as CoopegeProject;
}

function prepare(project: unknown): PreparedRuntimeProject {
  const result = prepareRuntimeProject(project);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.prepared;
}

function minimalProject(): PreparedRuntimeProject {
  return prepare(loadJson("project/project.json"));
}

function legacyProject(): PreparedRuntimeProject {
  return prepare(loadJson("project/migration/legacy-v14.1/coopege.project.json"));
}

function command(overrides: Partial<PlayerCommand> = {}): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false, ...overrides };
}

function neutralFrame(world: GameWorld): ReturnType<typeof createMultiPlayerInputFrame> {
  return createMultiPlayerInputFrame(world.tick + 1, world.players.map((player) => ({ playerId: player.playerId, command: command() })));
}

function activeState(world: GameWorld, instanceId: string) {
  return world.authoredSpawnStates.find((state) => state.instanceId === instanceId);
}

test("M7 rozwija 338 authored spawnów, ale materializuje tylko deterministyczny limit aktywnych aktorów", () => {
  const project = legacyProject();
  const first = new GameWorld(project, {
    spawnActivationRadiusTiles: 1000,
    spawnDeactivationRadiusTiles: 1100,
    activeMonsterLimit: 12,
  });
  const second = new GameWorld(project, {
    spawnActivationRadiusTiles: 1000,
    spawnDeactivationRadiusTiles: 1100,
    activeMonsterLimit: 12,
  });
  const diagnostics = first.spawnDiagnostics();
  assert.equal(diagnostics.authoredDefinitions, 338);
  assert.equal(diagnostics.authoredInstances, 338);
  assert.equal(diagnostics.activeActorCount, 12);
  assert.equal(diagnostics.active, 12);
  assert.equal(diagnostics.capped, 98);
  assert.equal(diagnostics.active + diagnostics.sleeping + diagnostics.respawning, 338);
  assert.deepEqual(first.monsters.map((monster) => monster.entityId), second.monsters.map((monster) => monster.entityId));
  assert.ok(first.monsters.every((monster) => monster.entityId.includes(".instance.")));
});

test("aktywacja używa najbliższego żywego członka drużyny i nie uprzywilejowuje P1", () => {
  const world = new GameWorld(legacyProject(), {
    initialPlayerCount: 2,
    spawnActivationRadiusTiles: 3,
    spawnDeactivationRadiusTiles: 5,
    activeMonsterLimit: 8,
    softTetherTiles: 1000,
    hardTetherTiles: 1100,
  });
  const floorStates = world.authoredSpawnStates.filter((state) => state.floorId === world.activeFloorId);
  const left = [...floorStates].sort((a, b) => a.homeX - b.homeX || a.instanceId.localeCompare(b.instanceId))[0];
  const right = [...floorStates].sort((a, b) => b.homeX - a.homeX || a.instanceId.localeCompare(b.instanceId))[0];
  assert.ok(left && right && Math.hypot(left.homeX - right.homeX, left.homeY - right.homeY) > 20);
  const [p1, p2] = world.players;
  assert.ok(p1 && p2);
  p1.position = { x: left.homeX, y: left.homeY };
  p1.previousPosition = { ...p1.position };
  p2.position = { x: right.homeX, y: right.homeY };
  p2.previousPosition = { ...p2.position };
  world.step(neutralFrame(world));
  assert.ok(activeState(world, left.instanceId)?.activeEntityId);
  assert.ok(activeState(world, right.instanceId)?.activeEntityId, "region P2 nie został aktywowany");
  assert.ok(world.monsters.some((monster) => monster.spawnInstanceId === right.instanceId));
});

test("uśpienie i ponowna aktywacja zachowują częściowe HP, threat i stabilne ID", () => {
  const world = new GameWorld(minimalProject(), {
    spawnActivationRadiusTiles: 6,
    spawnDeactivationRadiusTiles: 7,
    activeMonsterLimit: 4,
  });
  const monster = world.monsters[0];
  assert.ok(monster?.spawnInstanceId);
  const entityId = monster.entityId;
  monster.hp = 19;
  monster.threatByPlayer[PRIMARY_PLAYER_ID] = 7.5;
  monster.targetPlayerId = PRIMARY_PLAYER_ID;
  world.player.position = { x: 1.5, y: 1.5 };
  world.player.previousPosition = { ...world.player.position };
  world.step(neutralFrame(world));
  assert.equal(world.monsters.length, 0);
  const sleeping = activeState(world, monster.spawnInstanceId);
  assert.equal(sleeping?.status, "sleeping");
  assert.equal(sleeping?.hp, 19);
  assert.deepEqual(sleeping?.threatByPlayer, [[PRIMARY_PLAYER_ID, 7.5]]);

  world.player.position = { x: sleeping!.x, y: sleeping!.y };
  world.player.previousPosition = { ...world.player.position };
  world.step(neutralFrame(world));
  const restored = world.monsters[0];
  assert.equal(restored?.entityId, entityId);
  assert.equal(restored?.hp, 19);
  assert.equal(restored?.threatByPlayer[PRIMARY_PLAYER_ID], 7.5);
});

test("respawn postępuje także podczas snu i używa authored respawnTicks", () => {
  const world = new GameWorld(minimalProject(), {
    spawnActivationRadiusTiles: 6,
    spawnDeactivationRadiusTiles: 7,
    activeMonsterLimit: 4,
  });
  const monster = world.monsters[0];
  assert.ok(monster?.spawnInstanceId);
  monster.hp = 0;
  monster.alive = false;
  monster.respawnAtTick = 5;
  world.step(neutralFrame(world));
  world.player.position = { x: 1.5, y: 1.5 };
  world.player.previousPosition = { ...world.player.position };
  world.step(neutralFrame(world));
  assert.equal(world.monsters.length, 0);
  assert.equal(activeState(world, monster.spawnInstanceId)?.status, "respawning");

  const state = activeState(world, monster.spawnInstanceId)!;
  world.player.position = { x: state.homeX, y: state.homeY };
  world.player.previousPosition = { ...world.player.position };
  world.step(neutralFrame(world));
  world.step(neutralFrame(world));
  assert.equal(world.tick, 4);
  assert.equal(world.monsters.length, 0);
  world.step(neutralFrame(world));
  assert.equal(world.tick, 5);
  assert.equal(world.monsters.length, 1);
  assert.equal(world.monsters[0]?.alive, true);
  assert.equal(world.monsters[0]?.hp, world.monsters[0]?.maxHp);
});

test("wielokrotne przekraczanie hysteresis nie tworzy duplikatów aktora", () => {
  const world = new GameWorld(minimalProject(), {
    spawnActivationRadiusTiles: 6,
    spawnDeactivationRadiusTiles: 7,
  });
  const instanceId = world.monsters[0]?.spawnInstanceId;
  assert.ok(instanceId);
  const expectedEntityId = world.monsters[0]!.entityId;
  for (let cycle = 0; cycle < 12; cycle += 1) {
    world.player.position = { x: 1.5, y: 1.5 };
    world.player.previousPosition = { ...world.player.position };
    world.step(neutralFrame(world));
    world.player.position = { x: 8.5, y: 4.5 };
    world.player.previousPosition = { ...world.player.position };
    world.step(neutralFrame(world));
    assert.equal(world.monsters.length, 1);
    assert.equal(world.monsters[0]?.entityId, expectedEntityId);
    assert.equal(new Set(world.actors.values().map((actor) => actor.entityId)).size, world.actors.size);
  }
});

test("count > 1 i authored pole w ścianie dają unikalne, deterministyczne walkowalne pozycje", () => {
  const project = minimalProject();
  const spawn: SpawnDefinition = {
    ...project.project.content.spawns[0]!,
    id: "spawn.wall_cluster",
    x: 0,
    y: 0,
    count: 4,
  };
  const states = buildSpawnRuntimeStates(
    [spawn],
    project.project.content.monsters,
    project.floors,
    project.project.world.tiles,
  );
  assert.equal(states.length, 4);
  assert.equal(new Set(states.map((state) => `${state.homeX},${state.homeY}`)).size, 4);
  assert.deepEqual(states.map((state) => state.instanceId), [
    "spawn.wall_cluster.instance.001",
    "spawn.wall_cluster.instance.002",
    "spawn.wall_cluster.instance.003",
    "spawn.wall_cluster.instance.004",
  ]);
  const floor = project.floors.get(spawn.floorId)!;
  const walkable = new Map(project.project.world.tiles.map((tile) => [tile.id, tile.walkable]));
  for (const state of states) {
    const x = Math.floor(state.homeX);
    const y = Math.floor(state.homeY);
    assert.equal(walkable.get(floor.tiles[y * floor.width + x]!), true);
  }
});

test("save v3 w połowie walki odtwarza wszystkie spawny i identyczną przyszłość symulacji", () => {
  const project = minimalProject();
  const source = new GameWorld(project, { initialPlayerCount: 2 });
  const [p1, p2] = source.players;
  const monster = source.monsters[0];
  assert.ok(p1 && p2 && monster);
  p1.position = { x: monster.position.x - 0.8, y: monster.position.y };
  p1.previousPosition = { ...p1.position };
  p2.position = { x: monster.position.x + 0.8, y: monster.position.y };
  p2.previousPosition = { ...p2.position };
  p2.facing = { x: -1, y: 0 };
  for (let tick = 1; tick <= 12; tick += 1) {
    source.step(createMultiPlayerInputFrame(tick, [
      { playerId: PRIMARY_PLAYER_ID, command: command({ usePrimary: tick === 1 }) },
      { playerId: SECONDARY_PLAYER_ID, command: command({ aimX: -1, usePrimary: tick === 7 }) },
    ]));
  }
  const snapshot = JSON.parse(JSON.stringify(source.createSaveSnapshot())) as ReturnType<GameWorld["createSaveSnapshot"]>;
  assert.equal(snapshot.spawnStates.length, 1);
  const restored = new GameWorld(project);
  restored.loadSaveSnapshot(snapshot);
  assert.equal(restored.stateChecksum(), source.stateChecksum());

  for (let tick = 13; tick <= 80; tick += 1) {
    const frame = createMultiPlayerInputFrame(tick, [
      { playerId: PRIMARY_PLAYER_ID, command: command({ moveY: tick < 30 ? 0.2 : 0, usePrimary: tick % 18 === 0 }) },
      { playerId: SECONDARY_PLAYER_ID, command: command({ aimX: -1, moveY: tick < 25 ? -0.2 : 0, usePrimary: tick % 22 === 0 }) },
    ]);
    source.step(frame);
    restored.step(structuredClone(frame));
  }
  assert.equal(restored.stateChecksum(), source.stateChecksum());
  assert.deepEqual(restored.createSaveSnapshot(), source.createSaveSnapshot());
});

test("ponowne zastosowanie projektu z usuniętymi instancjami nie pozostawia orphan spawnów", () => {
  const rawA = loadJson("project/project.json");
  rawA.manifest.projectVersion = "0.7.0-a";
  rawA.content.spawns[0]!.count = 3;
  const rawB = structuredClone(rawA);
  rawB.manifest.projectVersion = "0.7.0-b";
  rawB.content.spawns[0]!.count = 1;
  const host = new AtomicProjectHost();
  assert.equal(host.apply(rawA).ok, true);
  const worldA = new GameWorld(host.current!);
  assert.equal(worldA.authoredSpawnStates.length, 3);
  const removedIds = worldA.authoredSpawnStates.slice(1).map((state) => state.instanceId);
  assert.equal(host.apply(rawB).ok, true);
  const worldB = new GameWorld(host.current!);
  assert.equal(worldB.authoredSpawnStates.length, 1);
  assert.ok(removedIds.every((instanceId) => !worldB.authoredSpawnStates.some((state) => state.instanceId === instanceId)));
  assert.ok(worldB.monsters.every((monster) => monster.spawnInstanceId === "spawn.training_slime.1.instance.001"));
});
