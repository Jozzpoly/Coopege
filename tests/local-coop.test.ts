import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FixedClock } from "../packages/core/src/index.js";
import {
  computeSharedCameraFrame,
  createMultiPlayerInputFrame,
  GameWorld,
  InputRouter,
  PRIMARY_PLAYER_ID,
  PRIMARY_SLOT_ID,
  runReplay,
  SECONDARY_PLAYER_ID,
  SECONDARY_SLOT_ID,
  type ActorSaveRecordV1,
  type GameSaveSnapshotV1,
  type InputFrame,
  type PlayerCommand,
} from "../packages/gameplay/src/index.js";
import { prepareRuntimeProject, type PreparedRuntimeProject } from "../packages/runtime-core/src/index.js";

const root = process.cwd();

function loadProject(path = "project/project.json"): PreparedRuntimeProject {
  const input = JSON.parse(readFileSync(resolve(root, path), "utf8")) as unknown;
  const result = prepareRuntimeProject(input);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.prepared;
}

function command(overrides: Partial<PlayerCommand> = {}): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false, ...overrides };
}

function twoPlayerFrame(tick: number, p1: Partial<PlayerCommand> = {}, p2: Partial<PlayerCommand> = {}): InputFrame {
  return createMultiPlayerInputFrame(tick, [
    { playerId: PRIMARY_PLAYER_ID, command: command(p1) },
    { playerId: SECONDARY_PLAYER_ID, command: command(p2) },
  ]);
}

function placePartyAroundMonster(world: GameWorld): void {
  const [p1, p2] = world.players;
  const monster = world.monsters[0];
  assert.ok(p1 && p2 && monster);
  p1.position = { x: monster.position.x - 0.85, y: monster.position.y };
  p1.previousPosition = { ...p1.position };
  p1.facing = { x: 1, y: 0 };
  p2.position = { x: monster.position.x + 0.85, y: monster.position.y };
  p2.previousPosition = { ...p2.position };
  p2.facing = { x: -1, y: 0 };
}

test("M7 tworzy dwóch graczy przez wspólną fabrykę i niezależny lifecycle spawnów", () => {
  const world = new GameWorld(loadProject(), { initialPlayerCount: 2 });
  assert.deepEqual(world.players.map((player) => player.playerId), [PRIMARY_PLAYER_ID, SECONDARY_PLAYER_ID]);
  assert.deepEqual(world.players.map((player) => player.entityId), ["entity.player.000001", "entity.player.000002"]);
  assert.equal(world.monsters[0]?.entityId, "entity.monster.spawn.training_slime.1.instance.001");
  assert.deepEqual(world.playerSlots.filter((slot) => slot.joined).map((slot) => slot.slotId), [SECONDARY_SLOT_ID, PRIMARY_SLOT_ID].sort());
  assert.notEqual(world.players[0]?.classId, world.players[0]?.entityId);
});

test("InputRouter mapuje niezależne komendy slotów na stabilne playerId", () => {
  const router = new InputRouter();
  router.sync([
    { slotId: PRIMARY_SLOT_ID, playerId: PRIMARY_PLAYER_ID, deviceKind: "keyboard-mouse", deviceIndex: null, joined: true },
    { slotId: SECONDARY_SLOT_ID, playerId: SECONDARY_PLAYER_ID, deviceKind: "gamepad", deviceIndex: 0, joined: true },
  ]);
  const frame = router.createFrame(1, new Map([
    [PRIMARY_SLOT_ID, command({ moveX: 1 })],
    [SECONDARY_SLOT_ID, command({ moveY: -1, aimX: 0, aimY: -1, usePrimary: true })],
  ]));
  assert.equal(frame.players.length, 2);
  assert.equal(frame.players.find((entry) => entry.playerId === PRIMARY_PLAYER_ID)?.command.moveX, 1);
  assert.equal(frame.players.find((entry) => entry.playerId === SECONDARY_PLAYER_ID)?.command.moveY, -1);
  assert.equal(frame.players.find((entry) => entry.playerId === SECONDARY_PLAYER_ID)?.command.usePrimary, true);
});

test("dołączenie i opuszczenie P2 nie resetuje stanu ani encji P1", () => {
  const world = new GameWorld(loadProject());
  for (let tick = 1; tick <= 10; tick += 1) world.step(createMultiPlayerInputFrame(tick, [{ playerId: PRIMARY_PLAYER_ID, command: command({ moveX: 1 }) }]));
  const p1Before = structuredClone(world.player);
  const p2 = world.joinPlayer({ playerId: SECONDARY_PLAYER_ID, slotId: SECONDARY_SLOT_ID, deviceKind: "virtual", deviceIndex: null });
  assert.equal(p2.entityId, "entity.player.000002");
  assert.equal(world.player.entityId, p1Before.entityId);
  assert.deepEqual(world.player.position, p1Before.position);
  assert.notDeepEqual(p2.position, p1Before.position);
  assert.deepEqual(p2.spawnPosition, p1Before.spawnPosition);
  world.leavePlayer(SECONDARY_PLAYER_ID);
  assert.equal(world.players.length, 1);
  assert.equal(world.player.entityId, p1Before.entityId);
  assert.deepEqual(world.player.position, p1Before.position);
  assert.equal(world.playerSlots.find((slot) => slot.slotId === SECONDARY_SLOT_ID)?.joined, false);
});

test("lokalny coop używa wspólnej kotwicy respawnu niezależnie od chwili dołączenia P2", () => {
  const world = new GameWorld(loadProject());
  for (let tick = 1; tick <= 24; tick += 1) world.step(createMultiPlayerInputFrame(tick, [{ playerId: PRIMARY_PLAYER_ID, command: command({ moveX: 1 }) }]));
  const originalAnchor = { ...world.player.spawnPosition };
  const p2 = world.joinPlayer({ playerId: SECONDARY_PLAYER_ID, slotId: SECONDARY_SLOT_ID, deviceKind: "virtual", deviceIndex: null });
  assert.deepEqual(world.player.spawnPosition, originalAnchor);
  assert.deepEqual(p2.spawnPosition, originalAnchor);

  for (const player of world.players) {
    player.alive = false;
    player.hp = 0;
    player.respawnAtTick = world.tick + 1;
  }
  world.step(twoPlayerFrame(world.tick + 1));

  assert.ok(world.players.every((player) => player.alive));
  assert.ok(world.players.every((player) => player.spawnPosition.x === originalAnchor.x && player.spawnPosition.y === originalAnchor.y));
  assert.notDeepEqual(world.players[0]!.position, world.players[1]!.position);
});

test("odłączenie P2 usuwa threat z uśpionych spawnów i pozwala wczytać zapis solo", () => {
  const project = loadProject("project/migration/legacy-v14.1/coopege.project.v2.json");
  const world = new GameWorld(project, { initialPlayerCount: 2 });
  const monster = world.monsters[0];
  assert.ok(monster);
  monster.threatByPlayer[SECONDARY_PLAYER_ID] = 30;
  monster.targetPlayerId = SECONDARY_PLAYER_ID;

  const otherFloorId = [...project.floors.keys()].find((floorId) => floorId !== world.activeFloorId);
  assert.ok(otherFloorId);
  world.transitionParty(otherFloorId);
  world.leavePlayer(SECONDARY_PLAYER_ID);

  const snapshot = world.createSaveSnapshot();
  assert.equal(snapshot.actors.filter((record) => record.kind === "player").length, 1);
  assert.ok(snapshot.spawnStates.every((state) => state.targetPlayerId !== SECONDARY_PLAYER_ID));
  assert.ok(snapshot.spawnStates.every((state) => state.threatByPlayer.every(([playerId]) => playerId !== SECONDARY_PLAYER_ID)));

  const restored = new GameWorld(project);
  restored.loadSaveSnapshot(snapshot);
  assert.equal(restored.players.length, 1);
  assert.equal(restored.stateChecksum(), world.stateChecksum());
});

test("dwóch graczy porusza się jednocześnie z niezależnych InputFrame", () => {
  const world = new GameWorld(loadProject(), { initialPlayerCount: 2, softTetherTiles: 4, hardTetherTiles: 6 });
  const initial = world.players.map((player) => ({ ...player.position }));
  for (let tick = 1; tick <= 12; tick += 1) world.step(twoPlayerFrame(tick, { moveX: 1 }, { moveY: 1, aimX: 0, aimY: 1 }));
  assert.ok(world.players[0]!.position.x > initial[0]!.x);
  assert.ok(world.players[1]!.position.y > initial[1]!.y);
  assert.notDeepEqual(world.players[0]!.position, world.players[1]!.position);
});

test("AI wybiera cel z jawnego threat wielu graczy zamiast globalnego gracza", () => {
  const world = new GameWorld(loadProject(), { initialPlayerCount: 2, respawnDelayTicks: 999 });
  placePartyAroundMonster(world);
  world.monsters[0]!.hp = 120;
  world.monsters[0]!.maxHp = 120;
  const events: ReturnType<typeof world.events.drain> = [];
  world.events.subscribeAll((event) => events.push(event));
  for (let tick = 1; tick <= 38; tick += 1) {
    world.step(twoPlayerFrame(
      tick,
      { aimX: 1, usePrimary: tick === 1 },
      { aimX: -1, usePrimary: tick === 19 || tick === 37 },
    ));
  }
  const monster = world.monsters[0]!;
  assert.equal(monster.threatByPlayer[PRIMARY_PLAYER_ID], 15);
  assert.equal(monster.threatByPlayer[SECONDARY_PLAYER_ID], 30);
  assert.equal(monster.targetPlayerId, SECONDARY_PLAYER_ID);
  assert.ok(events.some((event) => event.type === "damage.applied" && event.context.ownerPlayerId === PRIMARY_PLAYER_ID));
  assert.ok(events.some((event) => event.type === "damage.applied" && event.context.ownerPlayerId === SECONDARY_PLAYER_ID));
});

test("nagrody mają jawną regułę party/proximity, loot killera i wspólny quest credit", () => {
  const world = new GameWorld(loadProject(), { initialPlayerCount: 2, respawnDelayTicks: 999 });
  placePartyAroundMonster(world);
  const events: ReturnType<typeof world.events.drain> = [];
  world.events.subscribeAll((event) => events.push(event));
  for (let tick = 1; tick <= 38; tick += 1) {
    world.step(twoPlayerFrame(
      tick,
      { aimX: 1, usePrimary: tick === 1 },
      { aimX: -1, usePrimary: tick === 19 || tick === 37 },
    ));
  }
  const [p1, p2] = world.players;
  assert.ok(p1 && p2);
  assert.equal(p1.xp + p2.xp, 42);
  assert.equal(p1.gold + p2.gold, 4);
  assert.equal(p1.lootCount, 0);
  assert.equal(p2.lootCount, 1);
  assert.equal(p1.questKillCredits, 1);
  assert.equal(p2.questKillCredits, 1);
  assert.equal(world.teamQuestKillCredits, 1);
  assert.equal(p2.kills, 1);
  const reward = events.find((event) => event.type === "rewards.awarded");
  assert.ok(reward && reward.type === "rewards.awarded");
  assert.equal(reward.killerPlayerId, SECONDARY_PLAYER_ID);
  assert.equal(reward.lootRecipientPlayerId, SECONDARY_PLAYER_ID);
  assert.deepEqual(reward.shares.map((share) => share.playerId), [PRIMARY_PLAYER_ID, SECONDARY_PLAYER_ID]);
});

test("miękki i twardy tether utrzymują graczy w testowalnym limicie", () => {
  const world = new GameWorld(loadProject(), { initialPlayerCount: 2, softTetherTiles: 2, hardTetherTiles: 3 });
  for (let tick = 1; tick <= 120; tick += 1) world.step(twoPlayerFrame(tick, { moveX: -1 }, { moveX: 1 }));
  assert.ok(world.maximumPlayerDistance() <= 3.000001, `dystans ${world.maximumPlayerDistance()} przekroczył twardy tether`);
});

test("wspólna kamera obejmuje obu graczy i zmniejsza zoom wraz z dystansem", () => {
  const close = computeSharedCameraFrame([{ x: 4, y: 4 }, { x: 5, y: 4 }], 1000, 600, { minimumTilePixels: 24, maximumTilePixels: 56 });
  const far = computeSharedCameraFrame([{ x: 0, y: 0 }, { x: 14, y: 0 }], 1000, 600, { minimumTilePixels: 24, maximumTilePixels: 56 });
  assert.deepEqual(close.center, { x: 4.5, y: 4 });
  assert.deepEqual(far.center, { x: 7, y: 0 });
  assert.ok(far.tilePixels < close.tilePixels);
  assert.equal(far.spreadTiles, 14);
});

test("save v3 przywraca dwóch graczy, sloty, threat i identyczny checksum", () => {
  const world = new GameWorld(loadProject(), { initialPlayerCount: 2 });
  placePartyAroundMonster(world);
  for (let tick = 1; tick <= 25; tick += 1) world.step(twoPlayerFrame(tick, { usePrimary: tick === 1 }, { aimX: -1, usePrimary: tick === 19 }));
  const snapshot = world.createSaveSnapshot();
  const checksum = world.stateChecksum();
  assert.equal(snapshot.schemaVersion, 3);
  assert.equal(snapshot.playerSlots.filter((slot) => slot.joined).length, 2);
  for (let tick = 26; tick <= 40; tick += 1) world.step(twoPlayerFrame(tick, { moveY: 1 }, { moveY: -1 }));
  world.loadSaveSnapshot(snapshot);
  assert.equal(world.stateChecksum(), checksum);
  assert.equal(world.players.length, 2);
  assert.equal(world.monsters[0]?.threatByPlayer[PRIMARY_PLAYER_ID], 15);
});

test("loader normalizuje historyczny save coopa z rozbieżnymi punktami respawnu", () => {
  const source = new GameWorld(loadProject(), { initialPlayerCount: 2 });
  const snapshot = source.createSaveSnapshot();
  const p1Record = snapshot.actors.find((record) => record.kind === "player" && record.playerId === PRIMARY_PLAYER_ID);
  const p2Record = snapshot.actors.find((record) => record.kind === "player" && record.playerId === SECONDARY_PLAYER_ID);
  const p2 = source.getPlayer(SECONDARY_PLAYER_ID);
  assert.ok(p1Record && p2Record && p2);
  p2Record.spawnX = p2.position.x;
  p2Record.spawnY = p2.position.y;
  assert.notDeepEqual({ x: p2Record.spawnX, y: p2Record.spawnY }, { x: p1Record.spawnX, y: p1Record.spawnY });

  const restored = new GameWorld(loadProject());
  restored.loadSaveSnapshot(snapshot);
  assert.deepEqual(restored.players.map((player) => player.spawnPosition), [
    { x: p1Record.spawnX, y: p1Record.spawnY },
    { x: p1Record.spawnX, y: p1Record.spawnY },
  ]);
});

test("save v1 migruje jawnie do v3 bez utraty gracza i authored spawnów", () => {
  const source = new GameWorld(loadProject());
  const v2 = source.createSaveSnapshot();
  const actors: ActorSaveRecordV1[] = v2.actors.map((record) => ({
    entityId: record.entityId,
    kind: record.kind,
    floorId: record.floorId,
    x: record.x,
    y: record.y,
    previousX: record.previousX,
    previousY: record.previousY,
    radius: record.radius,
    alive: record.alive,
    hp: record.hp,
    maxHp: record.maxHp,
    moveSpeedTilesPerSecond: record.moveSpeedTilesPerSecond,
    abilityId: record.abilityId,
    cooldownUntilTick: record.cooldownUntilTick,
    respawnAtTick: record.respawnAtTick,
    playerId: record.playerId,
    classId: record.classId,
    facingX: record.facingX,
    facingY: record.facingY,
    spawnX: record.spawnX,
    spawnY: record.spawnY,
    deaths: record.deaths,
    definitionId: record.definitionId,
    sourceSpawnId: record.sourceSpawnId,
    homeX: record.homeX,
    homeY: record.homeY,
    aggroRangeTiles: record.aggroRangeTiles,
    leashRangeTiles: record.leashRangeTiles,
  }));
  const v1: GameSaveSnapshotV1 = {
    format: "coopege-save",
    schemaVersion: 1,
    projectChecksum: v2.projectChecksum,
    tick: v2.tick,
    activeFloorId: v2.activeFloorId,
    simulationRngState: v2.simulationRngState,
    dropRngState: v2.dropRngState,
    nextEntitySequence: v2.nextEntitySequence,
    actors,
  };
  const restored = new GameWorld(loadProject());
  restored.loadSaveSnapshot(v1);
  assert.equal(restored.createSaveSnapshot().schemaVersion, 3);
  assert.equal(restored.createSaveSnapshot().spawnStates.length, 1);
  assert.equal(restored.players.length, 1);
  assert.equal(restored.player.slotId, PRIMARY_SLOT_ID);
});

test("drużynowa zmiana piętra przenosi wszystkich graczy i zapisuje aktywne piętro", () => {
  const project = loadProject("project/migration/legacy-v14.1/coopege.project.json");
  const world = new GameWorld(project, { initialPlayerCount: 2 });
  const targetFloorId = [...project.floors.keys()].find((floorId) => floorId !== world.activeFloorId);
  assert.ok(targetFloorId);
  world.transitionParty(targetFloorId);
  assert.equal(world.activeFloorId, targetFloorId);
  assert.ok(world.players.every((player) => player.floorId === targetFloorId));
  assert.deepEqual(world.players.map((player) => player.spawnPosition), [
    world.players[0]!.spawnPosition,
    world.players[0]!.spawnPosition,
  ]);
  assert.ok(world.monsters.every((monster) => monster.floorId === targetFloorId));
  assert.equal(world.authoredSpawnStates.length, 338);
  assert.ok(world.monsters.length < world.authoredSpawnStates.length);
  const snapshot = world.createSaveSnapshot();
  const restored = new GameWorld(project);
  restored.loadSaveSnapshot(snapshot);
  assert.equal(restored.activeFloorId, targetFloorId);
  assert.equal(restored.players.length, 2);
});

test("dwuosobowy replay jest deterministyczny także przy różnym render FPS", () => {
  const project = loadProject();
  const frames: InputFrame[] = [];
  for (let tick = 1; tick <= 140; tick += 1) {
    frames.push(twoPlayerFrame(
      tick,
      { moveX: tick < 35 ? 1 : 0, aimX: 1, usePrimary: tick % 18 === 0 },
      { moveY: tick < 25 ? 0.4 : 0, aimX: 1, usePrimary: tick % 22 === 0 },
    ));
  }
  const first = runReplay(project, frames, { initialPlayerCount: 2 });
  const second = runReplay(project, frames, { initialPlayerCount: 2 });
  assert.equal(first.checksum, second.checksum);

  function simulate(renderDeltas: readonly number[]): string {
    const world = new GameWorld(project, { initialPlayerCount: 2 });
    const clock = new FixedClock(30, 16);
    let frameIndex = 0;
    let renderIndex = 0;
    while (frameIndex < frames.length) {
      clock.advance(renderDeltas[renderIndex % renderDeltas.length]!, () => {
        if (frameIndex >= frames.length) return;
        world.step(frames[frameIndex]!);
        frameIndex += 1;
      });
      renderIndex += 1;
    }
    return world.stateChecksum();
  }
  assert.equal(simulate([33.333333]), simulate([5, 7, 9, 4, 12, 6, 8]));
  assert.equal(simulate([33.333333]), simulate([16, 50, 11, 22, 40, 8]));
});
