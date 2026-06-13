import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareRuntimeProject } from "../../.build/node/packages/runtime-core/src/index.js";
import { createMultiPlayerInputFrame, GameWorld, PRIMARY_PLAYER_ID, SECONDARY_PLAYER_ID } from "../../.build/node/packages/gameplay/src/index.js";

const root = resolve(import.meta.dirname, "../..");
const projectJson = JSON.parse(readFileSync(resolve(root, "project/migration/legacy-v14.1/coopege.project.v2.json"), "utf8"));
const preparedResult = prepareRuntimeProject(projectJson);
if (!preparedResult.ok) throw new Error(JSON.stringify(preparedResult.issues));
const project = preparedResult.prepared;
const TICKS_PER_GATE = 15 * 60 * 30;

function commandFor(world, playerId, tick, phaseOffset = 0) {
  const player = world.getPlayer(playerId);
  if (!player || !player.alive) return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false };
  const living = world.monsters
    .filter((monster) => monster.alive && monster.floorId === player.floorId)
    .map((monster) => ({ monster, distance: Math.hypot(monster.position.x - player.position.x, monster.position.y - player.position.y) }))
    .sort((a, b) => a.distance - b.distance || a.monster.entityId.localeCompare(b.monster.entityId));
  const target = living[0];
  if (target) {
    const dx = target.monster.position.x - player.position.x;
    const dy = target.monster.position.y - player.position.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      moveX: target.distance > 1.15 ? dx / length : 0,
      moveY: target.distance > 1.15 ? dy / length : 0,
      aimX: dx / length,
      aimY: dy / length,
      usePrimary: target.distance < 2.2 && (tick + phaseOffset) % 9 === 0,
    };
  }
  const angle = ((tick + phaseOffset) % 900) / 900 * Math.PI * 2;
  return { moveX: Math.cos(angle), moveY: Math.sin(angle), aimX: Math.cos(angle), aimY: Math.sin(angle), usePrimary: false };
}

function validateWorld(world, label) {
  const diagnostics = world.spawnDiagnostics();
  if (diagnostics.authoredInstances !== 338) throw new Error(`${label}: utracono authored instancje (${diagnostics.authoredInstances}).`);
  if (diagnostics.activeActorCount > diagnostics.activeMonsterLimit) throw new Error(`${label}: przekroczono cap aktorów.`);
  if (diagnostics.active + diagnostics.sleeping + diagnostics.respawning !== diagnostics.authoredInstances) throw new Error(`${label}: niespójne statusy spawnów.`);
  const ids = world.actors.values().map((actor) => actor.entityId);
  if (new Set(ids).size !== ids.length) throw new Error(`${label}: duplikat entityId.`);
  for (const actor of world.actors.values()) {
    if (![actor.position.x, actor.position.y, actor.hp].every(Number.isFinite)) throw new Error(`${label}: niepoprawny stan aktora ${actor.entityId}.`);
  }
}

function floorAnchors() {
  const byFloor = new Map();
  for (const spawn of project.project.content.spawns) {
    if (!byFloor.has(spawn.floorId)) byFloor.set(spawn.floorId, { x: spawn.x + 0.5, y: spawn.y + 0.5 });
  }
  return [...byFloor.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function runGate(playerCount) {
  const world = new GameWorld(project, { initialPlayerCount: playerCount, simulationSeed: 0xc00fee, dropSeed: 0xd09f00d });
  const anchors = floorAnchors();
  const metrics = {
    mode: playerCount === 1 ? "solo" : "coop-c0",
    ticks: TICKS_PER_GATE,
    simulatedMinutes: 15,
    maximumActiveActors: 0,
    maximumCapped: 0,
    floorTransitions: 0,
    saveLoadChecks: 0,
    deaths: 0,
    rewards: 0,
    gameplayFailures: 0,
    finalChecksum: "",
    finalFloorId: "",
    playerSummary: [],
  };
  world.events.subscribeAll((event) => {
    if (event.type === "actor.died") metrics.deaths += 1;
    if (event.type === "rewards.awarded") metrics.rewards += 1;
    if (event.type === "gameplay.execution_failed") metrics.gameplayFailures += 1;
  });

  for (let tick = 1; tick <= TICKS_PER_GATE; tick += 1) {
    if (tick === 9001 || tick === 18001) {
      const currentIndex = anchors.findIndex(([floorId]) => floorId === world.activeFloorId);
      const [floorId, anchor] = anchors[(currentIndex + 1) % anchors.length];
      world.transitionParty(floorId, anchor);
      metrics.floorTransitions += 1;
    }
    const players = [{ playerId: PRIMARY_PLAYER_ID, command: commandFor(world, PRIMARY_PLAYER_ID, tick) }];
    if (playerCount === 2) players.push({ playerId: SECONDARY_PLAYER_ID, command: commandFor(world, SECONDARY_PLAYER_ID, tick, 4) });
    world.step(createMultiPlayerInputFrame(tick, players));

    const diagnostics = world.spawnDiagnostics();
    metrics.maximumActiveActors = Math.max(metrics.maximumActiveActors, diagnostics.activeActorCount);
    metrics.maximumCapped = Math.max(metrics.maximumCapped, diagnostics.capped);
    if (tick % 900 === 0) validateWorld(world, `${metrics.mode}@${tick}`);
    if (tick % 4500 === 0) {
      const snapshot = JSON.parse(JSON.stringify(world.createSaveSnapshot()));
      const checksum = world.stateChecksum();
      world.loadSaveSnapshot(snapshot);
      if (world.stateChecksum() !== checksum) throw new Error(`${metrics.mode}@${tick}: save/load zmienił checksum.`);
      metrics.saveLoadChecks += 1;
    }
  }
  validateWorld(world, `${metrics.mode}@final`);
  const summary = world.summary();
  metrics.finalChecksum = summary.stateChecksum;
  metrics.finalFloorId = summary.activeFloorId;
  metrics.playerSummary = summary.players;
  return metrics;
}

const startedAt = new Date().toISOString();
const solo = runGate(1);
const coop = runGate(2);
const report = {
  format: "coopege-gameplay-gate-0.1",
  generatedAt: new Date().toISOString(),
  startedAt,
  projectChecksum: project.checksum,
  gateKind: "automated deterministic soak; not a substitute for owner human playtest",
  result: solo.gameplayFailures === 0 && coop.gameplayFailures === 0 ? "PASS_AUTOMATED" : "FAIL",
  solo,
  coop,
};
mkdirSync(resolve(root, ".build"), { recursive: true });
writeFileSync(resolve(root, ".build/gameplay-gate-0.1.json"), JSON.stringify(report, null, 2));
console.log(`PASS Gameplay Gate 0.1 automated soak: solo ${solo.ticks} ticks / coop ${coop.ticks} ticks · active max ${solo.maximumActiveActors}/${coop.maximumActiveActors} · rewards ${solo.rewards}/${coop.rewards} · saves ${solo.saveLoadChecks}/${coop.saveLoadChecks}`);
