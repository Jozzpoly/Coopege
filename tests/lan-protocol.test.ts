import test from "node:test";
import assert from "node:assert/strict";
import {
  COOPEGE_LAN_PROTOCOL,
  COOPEGE_LAN_PROTOCOL_VERSION,
  LAN_MAX_MESSAGE_BYTES,
  LAN_MESSAGE_TYPES,
  checkHelloCompatibility,
  createLanEnvelope,
  decodeLanMessage,
  encodeLanMessage,
  evaluateInputAdmission,
  validateLanEnvelope,
  type ClientHelloPayload,
  type ClientInputPayload,
  type InputAdmissionContext,
} from "../packages/lan-protocol/src/index.js";

const checksum = "a".repeat(64);
const sessionId = "session-0123456789abcdef";
const sessionToken = "token-0123456789abcdef";

function hello(overrides: Partial<ClientHelloPayload> = {}): ClientHelloPayload {
  return {
    engineVersion: "0.8.1-m8-lan-vs3-retest",
    projectId: "coopege.silver_gate_legacy",
    projectChecksum: checksum,
    sessionToken,
    clientNonce: "nonce-0123456789abcdef",
    reconnectToken: null,
    ...overrides,
  };
}

function input(overrides: Partial<ClientInputPayload> = {}): ClientInputPayload {
  return {
    sessionId,
    playerId: "player.local.1",
    inputSeq: 11,
    clientTick: 100,
    sampledAtMs: 1234.5,
    command: { moveX: 1, moveY: 0, aimX: 1, aimY: 0, usePrimary: false },
    ...overrides,
  };
}

function context(overrides: Partial<InputAdmissionContext> = {}): InputAdmissionContext {
  return {
    connectionId: "connection.host",
    ownerConnectionId: "connection.host",
    sessionId,
    playerId: "player.local.1",
    lastAcceptedInputSeq: 10,
    hostTick: 100,
    ...overrides,
  };
}

test("LAN handshake ma osobny protokół, wersję i deterministyczne kodowanie JSON", () => {
  const envelope = createLanEnvelope(LAN_MESSAGE_TYPES.clientHello, hello());
  assert.equal(envelope.protocol, COOPEGE_LAN_PROTOCOL);
  assert.equal(envelope.protocolVersion, COOPEGE_LAN_PROTOCOL_VERSION);
  const encoded = encodeLanMessage(envelope);
  assert.equal(encoded, encodeLanMessage({ payload: envelope.payload, type: envelope.type, protocolVersion: 1, protocol: COOPEGE_LAN_PROTOCOL }));
  const decoded = decodeLanMessage(encoded);
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.deepEqual(decoded.envelope, envelope);
});

test("compatibility gate odrzuca inną wersję silnika, projekt, checksum i token", () => {
  const expected = { engineVersion: "0.8.1-m8-lan-vs3-retest", projectId: "coopege.silver_gate_legacy", projectChecksum: checksum, sessionToken };
  assert.deepEqual(checkHelloCompatibility(hello(), expected), { ok: true });
  assert.equal(checkHelloCompatibility(hello({ engineVersion: "0.7.5" }), expected).ok, false);
  assert.equal(checkHelloCompatibility(hello({ projectId: "coopege.other" }), expected).ok, false);
  assert.equal(checkHelloCompatibility(hello({ projectChecksum: "b".repeat(64) }), expected).ok, false);
  assert.equal(checkHelloCompatibility(hello({ sessionToken: "token-ffffffffffffffff" }), expected).ok, false);
});

test("walidator odrzuca obcy protokół, wersję, typ, payload i zbyt duży komunikat", () => {
  const valid = createLanEnvelope(LAN_MESSAGE_TYPES.clientHello, hello());
  assert.equal(validateLanEnvelope({ ...valid, protocol: "coopege-runtime-studio" }).ok, false);
  assert.deepEqual(validateLanEnvelope({ ...valid, protocolVersion: 2 }), {
    ok: false,
    code: "unsupported_protocol_version",
    path: "$.protocolVersion",
    message: "Nieobsługiwana wersja protokołu LAN.",
  });
  assert.equal(validateLanEnvelope({ ...valid, type: "client.cheat" }).ok, false);
  assert.equal(validateLanEnvelope({ ...valid, payload: { ...valid.payload, projectChecksum: "bad" } }).ok, false);
  assert.equal(decodeLanMessage("{").ok, false);
  const oversized = JSON.stringify({ padding: "x".repeat(LAN_MAX_MESSAGE_BYTES) });
  const result = decodeLanMessage(oversized);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "message_too_large");
});

test("input gate egzekwuje ownership połączenia i tożsamość sesji/gracza", () => {
  assert.deepEqual(evaluateInputAdmission(input(), context()), { ok: true, acceptedInputSeq: 11 });
  assert.equal(evaluateInputAdmission(input(), context({ connectionId: "connection.guest" })).ok, false);
  assert.equal(evaluateInputAdmission(input({ sessionId: "session-ffffffffffffffff" }), context()).ok, false);
  assert.equal(evaluateInputAdmission(input({ playerId: "player.local.2" }), context()).ok, false);
});

test("input gate odrzuca duplicate, out-of-order oraz tick zbyt stary lub przyszły", () => {
  const duplicate = evaluateInputAdmission(input({ inputSeq: 10 }), context());
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.code, "duplicate_input");
  const outOfOrder = evaluateInputAdmission(input({ inputSeq: 9 }), context());
  assert.equal(outOfOrder.ok, false);
  if (!outOfOrder.ok) assert.equal(outOfOrder.code, "out_of_order_input");
  const stale = evaluateInputAdmission(input({ clientTick: 79 }), context({ maximumPastTicks: 20 }));
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.code, "input_too_old");
  const future = evaluateInputAdmission(input({ clientTick: 103 }), context({ maximumFutureTicks: 2 }));
  assert.equal(future.ok, false);
  if (!future.ok) assert.equal(future.code, "input_from_future");
});

test("snapshot prezentacyjny ma limit graczy, aktorów i poprawne ACK", () => {
  const snapshot = createLanEnvelope(LAN_MESSAGE_TYPES.hostSnapshot, {
    sessionId,
    hostTick: 120,
    activeFloorId: "floor.legacy.z_0",
    acknowledgedInputSeq: 11,
    players: [{
      playerId: "player.local.1",
      entityId: "entity.player.000001",
      slotId: "slot.lan.1",
      classId: "class.warrior",
      floorId: "floor.legacy.z_0",
      radius: 0.3,
      x: 88.5,
      y: 84.5,
      previousX: 88.4,
      previousY: 84.5,
      facingX: 1,
      facingY: 0,
      alive: true,
      hp: 100,
      maxHp: 100,
    }],
    actors: [],
    events: [],
    diagnostics: { snapshotSeq: 1, connectedPlayers: 1, rejectedInputs: 0 },
  });
  assert.equal(validateLanEnvelope(snapshot).ok, true);
  assert.equal(validateLanEnvelope({ ...snapshot, payload: { ...snapshot.payload, acknowledgedInputSeq: -1 } }).ok, false);
  assert.equal(validateLanEnvelope({ ...snapshot, payload: { ...snapshot.payload, players: [...snapshot.payload.players, ...snapshot.payload.players, ...snapshot.payload.players] } }).ok, false);
  assert.equal(validateLanEnvelope({ ...snapshot, payload: { ...snapshot.payload, players: [...snapshot.payload.players, ...snapshot.payload.players] } }).ok, false);
  assert.equal(validateLanEnvelope({ ...snapshot, payload: { ...snapshot.payload, players: [{ ...snapshot.payload.players[0]!, floorId: "floor.other" }] } }).ok, false);
});
