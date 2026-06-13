import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createMultiPlayerInputFrame,
  GameWorld,
  PRIMARY_PLAYER_ID,
  SECONDARY_PLAYER_ID,
  SECONDARY_SLOT_ID,
  type PlayerCommand,
} from "../packages/gameplay/src/index.js";
import { prepareRuntimeProject, type PreparedRuntimeProject } from "../packages/runtime-core/src/index.js";
import { validateProject } from "../packages/validation/src/index.js";
import type { CoopegeProject } from "../packages/schema/src/index.js";

const projectPath = resolve(process.cwd(), "project/migration/legacy-v14.1/coopege.project.v2.json");

function rawProject(): CoopegeProject {
  return JSON.parse(readFileSync(projectPath, "utf8")) as CoopegeProject;
}

function preparedProject(): PreparedRuntimeProject {
  const result = prepareRuntimeProject(rawProject());
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.prepared;
}

function command(overrides: Partial<PlayerCommand> = {}): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false, ...overrides };
}

function movePlayerOntoTransition(world: GameWorld, playerIndex: number): { transitionId: string; destinationFloorId: string } {
  const transition = world.runtimeProject.project.world.transitions?.find((entry) => entry.source.floorId === world.activeFloorId);
  assert.ok(transition, `Brak przejścia ze стартowego piętra ${world.activeFloorId}.`);
  const player = world.players[playerIndex];
  assert.ok(player);
  const sourceCenter = { x: transition.source.x + 0.5, y: transition.source.y + 0.5 };
  player.position = { x: sourceCenter.x - 0.52, y: sourceCenter.y };
  player.previousPosition = { ...player.position };
  for (const [index, teammate] of world.players.entries()) {
    if (index === playerIndex) continue;
    teammate.position = { x: sourceCenter.x - 1.05, y: sourceCenter.y + 0.55 };
    teammate.previousPosition = { ...teammate.position };
  }
  for (let step = 0; step < 30 && world.activeFloorId === transition.source.floorId; step += 1) {
    const inputs = world.players.map((entry, index) => ({
      playerId: entry.playerId,
      command: index === playerIndex ? command({ moveX: 1 }) : command(),
    }));
    world.step(createMultiPlayerInputFrame(world.tick + 1, inputs));
  }
  return { transitionId: transition.id, destinationFloorId: transition.destination.floorId };
}

test("legacy migration exposes 24 validated bidirectional authored transitions and 45 texture layouts", () => {
  const project = rawProject();
  const validation = validateProject(project);
  assert.equal(validation.ok, true, JSON.stringify(validation.issues, null, 2));
  assert.equal(project.world.transitions?.length, 24);
  assert.equal(project.assets.entries.filter((entry) => entry.texture !== undefined).length, 45);
  const reverseKeys = new Set(project.world.transitions?.map((entry) => `${entry.source.floorId}:${entry.source.x}:${entry.source.y}->${entry.destination.floorId}:${entry.destination.x}:${entry.destination.y}`));
  for (const transition of project.world.transitions ?? []) {
    assert.ok(reverseKeys.has(`${transition.destination.floorId}:${transition.destination.x}:${transition.destination.y}->${transition.source.floorId}:${transition.source.x}:${transition.source.y}`));
  }
});

test("wejście P1 na prawdziwą komórkę schodów przenosi drużynę bez debug API", () => {
  const world = new GameWorld(preparedProject(), { initialPlayerCount: 2 });
  const events: ReturnType<typeof world.events.drain> = [];
  world.events.subscribeAll((event) => events.push(event));
  const sourceFloorId = world.activeFloorId;
  const expected = movePlayerOntoTransition(world, 0);
  assert.equal(world.activeFloorId, expected.destinationFloorId);
  assert.ok(world.players.every((player) => player.floorId === expected.destinationFloorId));
  assert.ok(world.players.every((player) => Number.isFinite(player.position.x) && Number.isFinite(player.position.y)));
  assert.notDeepEqual(world.players[0]?.position, world.players[1]?.position);
  const floorEvent = events.find((event) => event.type === "party.floor_changed");
  assert.ok(floorEvent && floorEvent.type === "party.floor_changed");
  assert.equal(floorEvent.transitionId, expected.transitionId);
  assert.equal(floorEvent.fromFloorId, sourceFloorId);
});

test("P2 może sam uruchomić schody, a P1 nie jest uprzywilejowany", () => {
  const world = new GameWorld(preparedProject(), { initialPlayerCount: 2 });
  const expected = movePlayerOntoTransition(world, 1);
  assert.equal(world.activeFloorId, expected.destinationFloorId);
  assert.equal(world.getPlayer(SECONDARY_PLAYER_ID)?.floorId, expected.destinationFloorId);
  assert.equal(world.getPlayer(PRIMARY_PLAYER_ID)?.floorId, expected.destinationFloorId);
});

test("save/load po authored transition zachowuje piętro, drużynę i deterministyczną przyszłość", () => {
  const project = preparedProject();
  const source = new GameWorld(project, { initialPlayerCount: 2 });
  movePlayerOntoTransition(source, 0);
  const snapshot = source.createSaveSnapshot();
  const checksum = source.stateChecksum();
  const restored = new GameWorld(project);
  restored.loadSaveSnapshot(snapshot);
  assert.equal(restored.activeFloorId, source.activeFloorId);
  assert.equal(restored.players.length, 2);
  assert.equal(restored.stateChecksum(), checksum);
  for (let index = 0; index < 50; index += 1) {
    const frame = createMultiPlayerInputFrame(source.tick + 1, source.players.map((player) => ({ playerId: player.playerId, command: command({ moveY: index < 15 ? 1 : 0 }) })));
    source.step(frame);
    restored.step(structuredClone(frame));
  }
  assert.equal(restored.stateChecksum(), source.stateChecksum());
});



test("każde z 24 przejść legacy jest osiągalne ruchem z sąsiedniego walkowalnego pola", () => {
  const project = preparedProject();
  const walkable = new Map(project.project.world.tiles.map((tile) => [tile.id, tile.walkable]));
  for (const transition of project.project.world.transitions ?? []) {
    const world = new GameWorld(project);
    if (world.activeFloorId !== transition.source.floorId) world.transitionParty(transition.source.floorId);
    const floor = project.floors.get(transition.source.floorId);
    assert.ok(floor);
    const candidates = [
      { dx: -1, dy: 0, moveX: 1, moveY: 0 },
      { dx: 1, dy: 0, moveX: -1, moveY: 0 },
      { dx: 0, dy: -1, moveX: 0, moveY: 1 },
      { dx: 0, dy: 1, moveX: 0, moveY: -1 },
    ];
    const approach = candidates.find(({ dx, dy }) => {
      const x = transition.source.x + dx;
      const y = transition.source.y + dy;
      if (x < 0 || y < 0 || x >= floor.width || y >= floor.height) return false;
      return walkable.get(floor.tiles[y * floor.width + x]!) === true;
    });
    assert.ok(approach, `Brak dojścia do ${transition.id}.`);
    const player = world.player;
    player.position = { x: transition.source.x + approach.dx + 0.5, y: transition.source.y + approach.dy + 0.5 };
    player.previousPosition = { ...player.position };
    for (let tick = 0; tick < 12 && world.activeFloorId === transition.source.floorId; tick += 1) {
      world.step(createMultiPlayerInputFrame(world.tick + 1, [{
        playerId: PRIMARY_PLAYER_ID,
        command: command({ moveX: approach.moveX, moveY: approach.moveY }),
      }]));
    }
    assert.equal(world.activeFloorId, transition.destination.floorId, `Nie zadziałało ${transition.id}.`);
  }
});



test("jednoczesne wejście P1 i P2 na różne schody ma jawny deterministyczny tie-break bez priorytetu P1", () => {
  const project = preparedProject();
  const byFloor = new Map<string, typeof project.project.world.transitions>();
  for (const transition of project.project.world.transitions ?? []) {
    const values = byFloor.get(transition.source.floorId) ?? [];
    values.push(transition);
    byFloor.set(transition.source.floorId, values);
  }
  const pair = [...byFloor.entries()].map(([floorId, values]) => ({ floorId, values: values ?? [] })).find((entry) => entry.values.length >= 2);
  assert.ok(pair);
  const chosenPair = [...pair.values].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 2);
  const world = new GameWorld(project, { initialPlayerCount: 2, softTetherTiles: 10_000, hardTetherTiles: 20_000 });
  if (world.activeFloorId !== pair.floorId) world.transitionParty(pair.floorId);
  const floor = project.floors.get(pair.floorId);
  assert.ok(floor);
  const walkable = new Map(project.project.world.tiles.map((tile) => [tile.id, tile.walkable]));
  const commands: PlayerCommand[] = [];
  for (const [index, transition] of chosenPair.entries()) {
    const approaches = [
      { dx: -1, dy: 0, moveX: 1, moveY: 0 },
      { dx: 1, dy: 0, moveX: -1, moveY: 0 },
      { dx: 0, dy: -1, moveX: 0, moveY: 1 },
      { dx: 0, dy: 1, moveX: 0, moveY: -1 },
    ];
    const approach = approaches.find(({ dx, dy }) => {
      const x = transition.source.x + dx;
      const y = transition.source.y + dy;
      return x >= 0 && y >= 0 && x < floor.width && y < floor.height && walkable.get(floor.tiles[y * floor.width + x]!) === true;
    });
    assert.ok(approach);
    const player = world.players[index]!;
    // Position just across the cell boundary so both candidates trigger in the same fixed tick.
    player.position = {
      x: transition.source.x + 0.5 - approach.moveX * 0.51,
      y: transition.source.y + 0.5 - approach.moveY * 0.51,
    };
    player.previousPosition = { ...player.position };
    commands.push(command({ moveX: approach.moveX, moveY: approach.moveY }));
  }
  const events: ReturnType<typeof world.events.drain> = [];
  world.events.subscribeAll((event) => events.push(event));
  world.step(createMultiPlayerInputFrame(world.tick + 1, world.players.map((player, index) => ({ playerId: player.playerId, command: commands[index]! }))));
  const conflict = events.find((event) => event.type === "party.transition_conflict");
  assert.ok(conflict && conflict.type === "party.transition_conflict");
  assert.deepEqual(conflict.candidateTransitionIds, chosenPair.map((entry) => entry.id));
  assert.equal(conflict.chosenTransitionId, chosenPair[0]!.id);
  assert.deepEqual(conflict.triggeringPlayerIds, [PRIMARY_PLAYER_ID, SECONDARY_PLAYER_ID]);
  assert.equal(world.activeFloorId, chosenPair[0]!.destination.floorId);
});

test("walidator odrzuca dwa przejścia z tej samej komórki i niewalkowalny cel", () => {
  const project = rawProject();
  const first = project.world.transitions?.[0];
  assert.ok(first && project.world.transitions);
  project.world.transitions.push({ ...structuredClone(first), id: "transition.invalid.duplicate-source" });
  const destinationFloor = project.world.floors.find((floor) => floor.id === first.destination.floorId);
  assert.ok(destinationFloor);
  const wallTile = project.world.tiles.find((tile) => !tile.walkable)?.id;
  assert.ok(wallTile);
  // Force destination 0,0 to be non-walkable without changing RLE length.
  destinationFloor.tiles = [[wallTile, destinationFloor.width * destinationFloor.height]];
  const result = validateProject(project);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_transition_source"));
  assert.ok(result.issues.some((issue) => issue.code === "transition_not_walkable"));
});


test("P2 dołączający po zmianie piętra pojawia się przy aktualnej drużynie, nie przy współrzędnych startowych innego piętra", () => {
  const project = preparedProject();
  const world = new GameWorld(project);
  const transition = project.project.world.transitions![0]!;
  if (world.activeFloorId !== transition.source.floorId) world.transitionParty(transition.source.floorId);
  world.transitionParty(transition.destination.floorId, { x: transition.destination.x + 0.5, y: transition.destination.y + 0.5 });
  const p1 = world.player;
  const p2 = world.joinPlayer({ playerId: SECONDARY_PLAYER_ID, slotId: SECONDARY_SLOT_ID, deviceKind: "keyboard", deviceIndex: null });
  assert.equal(p2.floorId, world.activeFloorId);
  assert.equal(p2.floorId, p1.floorId);
  const distance = Math.hypot(p2.position.x - p1.position.x, p2.position.y - p1.position.y);
  assert.ok(distance >= 0.5 && distance <= 3, `P2 powinien dołączyć blisko drużyny, dystans=${distance}`);
  assert.notDeepEqual(p2.position, p1.position);
});
