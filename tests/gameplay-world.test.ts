import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FixedClock } from "../packages/core/src/index.js";
import {
  GameWorld,
  createInputFrame,
  runReplay,
  type InputFrame,
  type PlayerCommand,
} from "../packages/gameplay/src/index.js";
import { prepareRuntimeProject, type PreparedRuntimeProject } from "../packages/runtime-core/src/index.js";

const root = process.cwd();

function loadProject(): PreparedRuntimeProject {
  const input = JSON.parse(readFileSync(resolve(root, "project/project.json"), "utf8")) as unknown;
  const result = prepareRuntimeProject(input);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  assert.equal(result.ok, true);
  return result.prepared;
}

function command(overrides: Partial<PlayerCommand> = {}): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false, ...overrides };
}

function combatFrames(ticks: number): InputFrame[] {
  const frames: InputFrame[] = [];
  for (let tick = 1; tick <= ticks; tick += 1) {
    frames.push(createInputFrame(tick, "player.local.1", command({
      moveX: tick <= 38 ? 1 : 0,
      moveY: tick <= 20 ? 0.15 : 0,
      aimX: 1,
      aimY: 0.15,
      usePrimary: tick >= 18 && tick % 6 === 0,
    })));
  }
  return frames;
}

test("GameWorld tworzy gracza i leniwie aktywuje authored spawn ze stabilnym ID", () => {
  const world = new GameWorld(loadProject());
  assert.equal(world.player.entityId, "entity.player.000001");
  assert.equal(world.monsters.length, 1);
  assert.equal(world.monsters[0]?.entityId, "entity.monster.spawn.training_slime.1.instance.001");
  assert.equal(world.spawnDiagnostics().authoredInstances, 1);
  assert.equal(world.spawnDiagnostics().activeActorCount, 1);
  assert.notEqual(world.player.classId, world.player.entityId);
  assert.equal(world.tick, 0);
});

test("ruch fixed-step respektuje kolizje kafli", () => {
  const world = new GameWorld(loadProject());
  for (let tick = 1; tick <= 90; tick += 1) {
    world.step(createInputFrame(tick, world.playerId, command({ moveX: -1, aimX: -1 })));
  }
  assert.ok(world.player.position.x >= 1.31, `gracz przeszedł przez lewą ścianę: ${world.player.position.x}`);
  assert.ok(world.player.position.x < 1.7, `gracz nie dotarł do ściany: ${world.player.position.x}`);
});

test("walka emituje jawny DamageContext z właścicielem gracza", () => {
  const world = new GameWorld(loadProject());
  const events: ReturnType<typeof world.events.drain> = [];
  world.events.subscribeAll((event) => events.push(event));
  for (const frame of combatFrames(100)) world.step(frame);
  const playerDamage = events.find((event) => event.type === "damage.applied" && event.context.ownerPlayerId === world.playerId);
  assert.ok(playerDamage && playerDamage.type === "damage.applied");
  assert.equal(playerDamage.context.sourceEntityId, world.player.entityId);
  assert.equal(playerDamage.context.targetEntityId, world.monsters[0]?.entityId);
  assert.equal(playerDamage.context.cause, "ability");
  assert.ok(events.some((event) => event.type === "ability.used"));
});

test("snapshot save/load przywraca identyczny checksum sesji", () => {
  const world = new GameWorld(loadProject());
  for (const frame of combatFrames(55)) world.step(frame);
  const snapshot = world.createSaveSnapshot();
  const checksum = world.stateChecksum();
  for (let tick = 56; tick <= 70; tick += 1) {
    world.step(createInputFrame(tick, world.playerId, command({ moveY: 1 })));
  }
  assert.notEqual(world.stateChecksum(), checksum);
  world.loadSaveSnapshot(snapshot);
  assert.equal(world.stateChecksum(), checksum);
  assert.equal(world.tick, 55);
});

test("ten sam replay daje ten sam checksum", () => {
  const project = loadProject();
  const frames = combatFrames(120);
  const first = runReplay(project, frames);
  const second = runReplay(project, frames);
  assert.equal(first.checksum, second.checksum);
  assert.deepEqual(first.snapshot, second.snapshot);
});

test("częstotliwość renderowania nie zmienia wyniku fixed-step", () => {
  const project = loadProject();
  const frames = combatFrames(150);

  function simulate(renderDeltas: readonly number[]): string {
    const world = new GameWorld(project);
    const clock = new FixedClock(30, 16);
    let frameIndex = 0;
    let renderIndex = 0;
    while (frameIndex < frames.length) {
      const delta = renderDeltas[renderIndex % renderDeltas.length]!;
      renderIndex += 1;
      clock.advance(delta, () => {
        if (frameIndex >= frames.length) return;
        world.step(frames[frameIndex]!);
        frameIndex += 1;
      });
    }
    return world.stateChecksum();
  }

  const atThirtyFps = simulate([33.333333]);
  const variableHighFps = simulate([5, 7, 9, 4, 12, 6, 8]);
  const unevenFps = simulate([16, 50, 11, 22, 40, 8]);
  assert.equal(variableHighFps, atThirtyFps);
  assert.equal(unevenFps, atThirtyFps);
});


test("odrzucony uszkodzony save nie narusza bieżącego świata", () => {
  const world = new GameWorld(loadProject());
  for (const frame of combatFrames(20)) world.step(frame);
  const before = world.stateChecksum();
  const corrupted = structuredClone(world.createSaveSnapshot());
  const player = corrupted.actors.find((actor) => actor.kind === "player")!;
  player.x = -100;
  assert.throws(() => world.loadSaveSnapshot(corrupted), /walkowalnym światem/);
  assert.equal(world.stateChecksum(), before);
});

test("save loader odrzuca sprzeczny aktor spawnu i duplikaty entityId atomowo", () => {
  const world = new GameWorld(loadProject());
  const before = world.stateChecksum();
  const inconsistent = structuredClone(world.createSaveSnapshot());
  const monster = inconsistent.actors.find((actor) => actor.kind === "monster")!;
  monster.hp = Math.max(0, monster.hp - 1);
  assert.throws(() => world.loadSaveSnapshot(inconsistent), /sprzeczne z kanonicznym stanem spawnu/);
  assert.equal(world.stateChecksum(), before);

  const duplicate = structuredClone(world.createSaveSnapshot());
  duplicate.actors[0]!.entityId = duplicate.actors[1]!.entityId;
  assert.throws(() => world.loadSaveSnapshot(duplicate), /Duplikat entityId/);
  assert.equal(world.stateChecksum(), before);
});
