import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LanHostSession } from "../apps/lan-host/src/session.js";
import {
  GameWorld,
  PRIMARY_PLAYER_ID,
  SECONDARY_PLAYER_ID,
  type PlayerCommand,
} from "../packages/gameplay/src/index.js";
import type { ClientHelloPayload, ClientInputPayload } from "../packages/lan-protocol/src/index.js";
import { prepareRuntimeProject } from "../packages/runtime-core/src/index.js";

const engineVersion = "0.8.0-m8-lan-vs2";
const projectChecksum = "a".repeat(64);
const sessionToken = "session-token-0123456789abcdef";

function host(): LanHostSession {
  const input = JSON.parse(readFileSync(resolve(process.cwd(), "project/project.json"), "utf8")) as unknown;
  const prepared = prepareRuntimeProject(input);
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues));
  let tokenSequence = 0;
  return new LanHostSession({
    world: new GameWorld(prepared.prepared, { initialPlayerCount: 2, tickRate: 30 }),
    engineVersion,
    projectId: prepared.prepared.project.manifest.projectId,
    projectChecksum,
    sessionToken,
    sessionId: "session-test-0123456789abcdef",
    snapshotRateHz: 10,
    createToken: () => `reconnect-${String(++tokenSequence).padStart(16, "0")}`,
  });
}

function hello(reconnectToken: string | null = null): ClientHelloPayload {
  return {
    engineVersion,
    projectId: "coopege.foundation",
    projectChecksum,
    sessionToken,
    clientNonce: "client-nonce-0123456789abcdef",
    reconnectToken,
  };
}

function command(overrides: Partial<PlayerCommand> = {}): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false, ...overrides };
}

function input(session: LanHostSession, playerId: string, inputSeq: number, overrides: Partial<PlayerCommand> = {}): ClientInputPayload {
  return {
    sessionId: session.sessionId,
    playerId,
    inputSeq,
    clientTick: session.world.tick,
    sampledAtMs: inputSeq * 10,
    command: command(overrides),
  };
}

test("host VS-2 przydziela dwa równorzędne sloty i odrzuca trzeciego klienta", () => {
  const session = host();
  const first = session.connect("connection.1", hello());
  const second = session.connect("connection.2", hello());
  const third = session.connect("connection.3", hello());

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
  if (!first.ok || !second.ok || third.ok) return;
  assert.deepEqual([first.playerId, second.playerId], [PRIMARY_PLAYER_ID, SECONDARY_PLAYER_ID]);
  assert.equal(third.code, "session_full");
  assert.equal(session.diagnostics().connectedPlayers, 2);
});

test("host egzekwuje ownership, konsumuje input raz i składa neutralny fallback", () => {
  const session = host();
  const first = session.connect("connection.1", hello());
  const second = session.connect("connection.2", hello());
  assert.ok(first.ok && second.ok);
  if (!first.ok || !second.ok) return;

  const p1Start = { ...session.world.getPlayer(first.playerId)!.position };
  const p2Start = { ...session.world.getPlayer(second.playerId)!.position };
  const accepted = session.receiveInput("connection.1", input(session, first.playerId, 1, { moveX: 1 }));
  const ownershipReject = session.receiveInput("connection.2", input(session, first.playerId, 1, { moveX: 1 }));
  assert.equal(accepted.ok, true);
  assert.equal(ownershipReject.ok, false);

  session.advanceTick();
  const p1AfterInput = { ...session.world.getPlayer(first.playerId)!.position };
  const p2AfterInput = { ...session.world.getPlayer(second.playerId)!.position };
  assert.ok(p1AfterInput.x > p1Start.x);
  assert.deepEqual(p2AfterInput, p2Start);

  session.advanceTick();
  assert.deepEqual(session.world.getPlayer(first.playerId)!.position, p1AfterInput);
  assert.equal(session.diagnostics().rejectedInputs, 1);
});

test("snapshot hosta ma ACK per klient i nie serializuje save v3", () => {
  const session = host();
  const first = session.connect("connection.1", hello());
  const second = session.connect("connection.2", hello());
  assert.ok(first.ok && second.ok);
  if (!first.ok || !second.ok) return;
  assert.equal(session.receiveInput("connection.1", input(session, first.playerId, 4, { moveY: 1 })).ok, true);
  assert.equal(session.receiveInput("connection.2", input(session, second.playerId, 9, { moveY: -1 })).ok, true);

  session.advanceTick();
  session.advanceTick();
  const snapshots = session.advanceTick();
  const firstPayload = snapshots.get("connection.1")?.payload;
  const secondPayload = snapshots.get("connection.2")?.payload;
  assert.ok(firstPayload && secondPayload);
  assert.equal(firstPayload.acknowledgedInputSeq, 4);
  assert.equal(secondPayload.acknowledgedInputSeq, 9);
  assert.equal(firstPayload.hostTick, 3);
  assert.equal(firstPayload.players.length, 2);
  assert.equal("spawnStates" in firstPayload, false);
  assert.equal("simulationRngState" in firstPayload, false);
});

test("disconnect nie usuwa świata, a reconnect odzyskuje ten sam slot", () => {
  const session = host();
  const first = session.connect("connection.1", hello());
  const second = session.connect("connection.2", hello());
  assert.ok(first.ok && second.ok);
  if (!first.ok || !second.ok) return;
  assert.equal(session.receiveInput("connection.1", input(session, first.playerId, 7)).ok, true);

  session.disconnect("connection.1");
  session.advanceTick();
  const save = session.createSaveSnapshot();
  assert.equal(save.actors.filter((actor) => actor.kind === "player").length, 2);
  assert.equal(session.world.players.length, 2);

  const reconnected = session.connect("connection.3", hello(first.reconnectToken));
  assert.equal(reconnected.ok, true);
  if (!reconnected.ok) return;
  assert.equal(reconnected.playerId, first.playerId);
  assert.equal(reconnected.reconnectToken, first.reconnectToken);
  assert.deepEqual(session.connectionIds(), ["connection.2", "connection.3"]);
});

test("ping odpowiada tylko klientowi należącemu do sesji", () => {
  const session = host();
  const first = session.connect("connection.1", hello());
  assert.equal(first.ok, true);
  const pong = session.createPong("connection.1", {
    sessionId: session.sessionId,
    pingId: "ping.1",
    sentAtMs: 100,
  }, 120, 121);
  assert.equal(pong?.type, "host.pong");
  assert.deepEqual(pong?.payload, {
    sessionId: session.sessionId,
    pingId: "ping.1",
    clientSentAtMs: 100,
    hostReceivedAtMs: 120,
    hostSentAtMs: 121,
  });
  assert.equal(session.createPong("connection.unknown", {
    sessionId: session.sessionId,
    pingId: "ping.2",
    sentAtMs: 200,
  }, 220), null);
});
