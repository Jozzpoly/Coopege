import {
  COOPEGE_LAN_PROTOCOL,
  COOPEGE_LAN_PROTOCOL_VERSION,
  LAN_MAX_ACTORS,
  LAN_MAX_MESSAGE_BYTES,
  LAN_MAX_PLAYERS,
  LAN_MESSAGE_TYPES,
  type ClientHelloPayload,
  type HostRejectCode,
  type LanCompatibilityRequirements,
  type LanCompatibilityResult,
  type LanDisconnectReason,
  type LanEnvelope,
  type LanMessageType,
  type LanPayloadByType,
  type LanPresentationValue,
} from "./types.js";

export type LanValidationErrorCode =
  | "invalid_json"
  | "message_too_large"
  | "invalid_envelope"
  | "unsupported_protocol"
  | "unsupported_protocol_version"
  | "unknown_message_type"
  | "invalid_payload";

export type LanValidationResult =
  | { ok: true; envelope: LanEnvelope }
  | { ok: false; code: LanValidationErrorCode; path: string; message: string };

const SHA256 = /^[a-f0-9]{64}$/;
const MESSAGE_TYPES = new Set<string>(Object.values(LAN_MESSAGE_TYPES));
const REJECT_CODES = new Set<HostRejectCode>([
  "engine_version_mismatch",
  "project_id_mismatch",
  "project_checksum_mismatch",
  "invalid_session_token",
  "session_full",
  "reconnect_rejected",
]);
const DISCONNECT_REASONS = new Set<LanDisconnectReason>(["client_exit", "timeout", "protocol_error", "server_shutdown", "replaced"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown, minimum = 0): value is number {
  return Number.isInteger(value) && (value as number) >= minimum;
}

function isShortString(value: unknown, minimum = 1, maximum = 256): value is string {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum;
}

function isNullableShortString(value: unknown, minimum = 1, maximum = 256): value is string | null {
  return value === null || isShortString(value, minimum, maximum);
}

function isPlayerCommand(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const axes = [value.moveX, value.moveY, value.aimX, value.aimY];
  return axes.every((axis) => isFiniteNumber(axis) && axis >= -1 && axis <= 1) && typeof value.usePrimary === "boolean";
}

function isPlayerSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isShortString(value.playerId) && isShortString(value.entityId) && isShortString(value.slotId) && isShortString(value.floorId)
    && [value.x, value.y, value.previousX, value.previousY, value.facingX, value.facingY, value.hp, value.maxHp].every(isFiniteNumber)
    && typeof value.alive === "boolean" && (value.hp as number) >= 0 && (value.maxHp as number) > 0 && (value.hp as number) <= (value.maxHp as number);
}

function isActorSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return value.kind === "monster" && isShortString(value.entityId) && isShortString(value.floorId)
    && [value.x, value.y, value.previousX, value.previousY, value.hp, value.maxHp].every(isFiniteNumber)
    && typeof value.alive === "boolean" && (value.hp as number) >= 0 && (value.maxHp as number) > 0 && (value.hp as number) <= (value.maxHp as number);
}

function isPresentationValue(value: unknown): value is LanPresentationValue {
  return value === null || typeof value === "string" || typeof value === "boolean" || isFiniteNumber(value);
}

function isPresentationEvent(value: unknown): boolean {
  if (!isRecord(value) || !isShortString(value.eventId) || !isShortString(value.type) || !isInteger(value.tick) || !isNullableShortString(value.entityId)) return false;
  return isRecord(value.data) && Object.keys(value.data).length <= 32 && Object.values(value.data).every(isPresentationValue);
}

function hasUniqueStrings(values: readonly unknown[]): boolean {
  return values.every((value) => typeof value === "string") && new Set(values).size === values.length;
}

function validatePayload(type: LanMessageType, payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  switch (type) {
    case LAN_MESSAGE_TYPES.clientHello:
      return isShortString(payload.engineVersion)
        && isShortString(payload.projectId)
        && typeof payload.projectChecksum === "string" && SHA256.test(payload.projectChecksum)
        && isShortString(payload.sessionToken, 16, 256)
        && isShortString(payload.clientNonce, 16, 256)
        && isNullableShortString(payload.reconnectToken, 16, 256);
    case LAN_MESSAGE_TYPES.hostWelcome:
      return isShortString(payload.sessionId, 16) && isShortString(payload.playerId) && isShortString(payload.slotId)
        && isShortString(payload.reconnectToken, 16) && isInteger(payload.hostTick)
        && isInteger(payload.tickRate, 1) && (payload.tickRate as number) <= 240
        && isInteger(payload.snapshotRateHz, 1) && (payload.snapshotRateHz as number) <= (payload.tickRate as number);
    case LAN_MESSAGE_TYPES.hostReject:
      return typeof payload.code === "string" && REJECT_CODES.has(payload.code as HostRejectCode) && isShortString(payload.message, 1, 1024);
    case LAN_MESSAGE_TYPES.clientInput:
      return isShortString(payload.sessionId, 16) && isShortString(payload.playerId)
        && isInteger(payload.inputSeq, 1) && isInteger(payload.clientTick)
        && isFiniteNumber(payload.sampledAtMs) && payload.sampledAtMs >= 0
        && isPlayerCommand(payload.command);
    case LAN_MESSAGE_TYPES.hostSnapshot:
      if (!isShortString(payload.sessionId, 16) || !isInteger(payload.hostTick) || !isShortString(payload.activeFloorId)
        || !isInteger(payload.acknowledgedInputSeq) || !Array.isArray(payload.players) || payload.players.length > LAN_MAX_PLAYERS
        || !payload.players.every(isPlayerSnapshot) || !Array.isArray(payload.actors) || payload.actors.length > LAN_MAX_ACTORS
        || !payload.actors.every(isActorSnapshot) || !Array.isArray(payload.events) || payload.events.length > 256
        || !payload.events.every(isPresentationEvent) || !isRecord(payload.diagnostics)) return false;
      if (!hasUniqueStrings(payload.players.map((player) => (player as Record<string, unknown>).playerId))
        || !hasUniqueStrings(payload.players.map((player) => (player as Record<string, unknown>).slotId))
        || !hasUniqueStrings([
          ...payload.players.map((player) => (player as Record<string, unknown>).entityId),
          ...payload.actors.map((actor) => (actor as Record<string, unknown>).entityId),
        ])
        || !hasUniqueStrings(payload.events.map((event) => (event as Record<string, unknown>).eventId))
        || payload.players.some((player) => (player as Record<string, unknown>).floorId !== payload.activeFloorId)
        || payload.actors.some((actor) => (actor as Record<string, unknown>).floorId !== payload.activeFloorId)) return false;
      return isInteger(payload.diagnostics.snapshotSeq, 1)
        && isInteger(payload.diagnostics.connectedPlayers) && payload.diagnostics.connectedPlayers <= LAN_MAX_PLAYERS
        && isInteger(payload.diagnostics.rejectedInputs);
    case LAN_MESSAGE_TYPES.clientPing:
      return isShortString(payload.sessionId, 16) && isShortString(payload.pingId) && isFiniteNumber(payload.sentAtMs) && payload.sentAtMs >= 0;
    case LAN_MESSAGE_TYPES.hostPong:
      return isShortString(payload.sessionId, 16) && isShortString(payload.pingId)
        && [payload.clientSentAtMs, payload.hostReceivedAtMs, payload.hostSentAtMs].every((value) => isFiniteNumber(value) && value >= 0);
    case LAN_MESSAGE_TYPES.clientDisconnect:
      return isShortString(payload.sessionId, 16) && typeof payload.reason === "string" && DISCONNECT_REASONS.has(payload.reason as LanDisconnectReason);
    case LAN_MESSAGE_TYPES.hostDisconnect:
      return isShortString(payload.sessionId, 16) && typeof payload.reason === "string" && DISCONNECT_REASONS.has(payload.reason as LanDisconnectReason)
        && isShortString(payload.message, 1, 1024) && typeof payload.reconnectAllowed === "boolean";
  }
}

export function isLanMessageType(value: unknown): value is LanMessageType {
  return typeof value === "string" && MESSAGE_TYPES.has(value);
}

export function validateLanEnvelope(value: unknown): LanValidationResult {
  if (!isRecord(value)) return { ok: false, code: "invalid_envelope", path: "$", message: "Koperta LAN musi być obiektem." };
  if (value.protocol !== COOPEGE_LAN_PROTOCOL) return { ok: false, code: "unsupported_protocol", path: "$.protocol", message: "Nieobsługiwana nazwa protokołu LAN." };
  if (value.protocolVersion !== COOPEGE_LAN_PROTOCOL_VERSION) return { ok: false, code: "unsupported_protocol_version", path: "$.protocolVersion", message: "Nieobsługiwana wersja protokołu LAN." };
  if (!isLanMessageType(value.type)) return { ok: false, code: "unknown_message_type", path: "$.type", message: "Nieznany typ wiadomości LAN." };
  if (!validatePayload(value.type, value.payload)) return { ok: false, code: "invalid_payload", path: "$.payload", message: `Nieprawidłowy payload ${value.type}.` };
  return { ok: true, envelope: value as unknown as LanEnvelope };
}

export function isLanEnvelope(value: unknown): value is LanEnvelope {
  return validateLanEnvelope(value).ok;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export function encodeLanMessage<TType extends LanMessageType>(envelope: LanEnvelope<TType>): string {
  const validation = validateLanEnvelope(envelope);
  if (!validation.ok) throw new Error(`${validation.code} ${validation.path}: ${validation.message}`);
  const encoded = stableJson(envelope);
  if (new TextEncoder().encode(encoded).byteLength > LAN_MAX_MESSAGE_BYTES) throw new Error("Wiadomość LAN przekracza limit rozmiaru.");
  return encoded;
}

export function decodeLanMessage(encoded: string): LanValidationResult {
  if (new TextEncoder().encode(encoded).byteLength > LAN_MAX_MESSAGE_BYTES) {
    return { ok: false, code: "message_too_large", path: "$", message: "Wiadomość LAN przekracza limit rozmiaru." };
  }
  let value: unknown;
  try { value = JSON.parse(encoded); }
  catch { return { ok: false, code: "invalid_json", path: "$", message: "Wiadomość LAN nie jest poprawnym JSON-em." }; }
  return validateLanEnvelope(value);
}

export function createLanEnvelope<TType extends LanMessageType>(type: TType, payload: LanPayloadByType[TType]): LanEnvelope<TType> {
  const envelope: LanEnvelope<TType> = {
    protocol: COOPEGE_LAN_PROTOCOL,
    protocolVersion: COOPEGE_LAN_PROTOCOL_VERSION,
    type,
    payload,
  };
  const validation = validateLanEnvelope(envelope);
  if (!validation.ok) throw new Error(`${validation.code} ${validation.path}: ${validation.message}`);
  return envelope;
}

export function checkHelloCompatibility(hello: ClientHelloPayload, expected: LanCompatibilityRequirements): LanCompatibilityResult {
  if (hello.engineVersion !== expected.engineVersion) return { ok: false, code: "engine_version_mismatch", message: "Wersja silnika klienta nie zgadza się z hostem." };
  if (hello.projectId !== expected.projectId) return { ok: false, code: "project_id_mismatch", message: "Klient otworzył inny projekt niż host." };
  if (hello.projectChecksum !== expected.projectChecksum) return { ok: false, code: "project_checksum_mismatch", message: "Snapshot projektu klienta nie zgadza się z hostem." };
  if (hello.sessionToken !== expected.sessionToken) return { ok: false, code: "invalid_session_token", message: "Token sesji LAN jest nieprawidłowy." };
  return { ok: true };
}
