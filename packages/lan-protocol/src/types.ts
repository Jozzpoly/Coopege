import type { PlayerCommand } from "../../gameplay/src/index.js";

export const COOPEGE_LAN_PROTOCOL = "coopege-lan" as const;
export const COOPEGE_LAN_PROTOCOL_VERSION = 1 as const;
export const LAN_MAX_MESSAGE_BYTES = 64 * 1024;
export const LAN_MAX_PLAYERS = 2;
export const LAN_MAX_ACTORS = 512;

export const LAN_MESSAGE_TYPES = {
  clientHello: "client.hello",
  hostWelcome: "host.welcome",
  hostReject: "host.reject",
  clientInput: "client.input",
  hostSnapshot: "host.snapshot",
  clientPing: "client.ping",
  hostPong: "host.pong",
  clientDisconnect: "client.disconnect",
  hostDisconnect: "host.disconnect",
} as const;

export type LanMessageType = (typeof LAN_MESSAGE_TYPES)[keyof typeof LAN_MESSAGE_TYPES];

export interface ClientHelloPayload {
  engineVersion: string;
  projectId: string;
  projectChecksum: string;
  sessionToken: string;
  clientNonce: string;
  reconnectToken: string | null;
}

export interface HostWelcomePayload {
  sessionId: string;
  playerId: string;
  slotId: string;
  reconnectToken: string;
  hostTick: number;
  tickRate: number;
  snapshotRateHz: number;
}

export type HostRejectCode =
  | "engine_version_mismatch"
  | "project_id_mismatch"
  | "project_checksum_mismatch"
  | "invalid_session_token"
  | "session_full"
  | "reconnect_rejected";

export interface HostRejectPayload {
  code: HostRejectCode;
  message: string;
}

export interface ClientInputPayload {
  sessionId: string;
  playerId: string;
  inputSeq: number;
  clientTick: number;
  sampledAtMs: number;
  command: PlayerCommand;
}

export interface LanPlayerSnapshot {
  playerId: string;
  entityId: string;
  slotId: string;
  classId: string;
  floorId: string;
  radius: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  facingX: number;
  facingY: number;
  alive: boolean;
  hp: number;
  maxHp: number;
}

export interface LanActorSnapshot {
  entityId: string;
  kind: "monster";
  definitionId: string;
  floorId: string;
  radius: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  alive: boolean;
  hp: number;
  maxHp: number;
}

export type LanPresentationValue = string | number | boolean | null;

export interface LanPresentationEvent {
  eventId: string;
  type: string;
  tick: number;
  entityId: string | null;
  data: Record<string, LanPresentationValue>;
}

export interface LanSnapshotDiagnostics {
  snapshotSeq: number;
  connectedPlayers: number;
  rejectedInputs: number;
}

export interface HostSnapshotPayload {
  sessionId: string;
  hostTick: number;
  activeFloorId: string;
  acknowledgedInputSeq: number;
  players: LanPlayerSnapshot[];
  actors: LanActorSnapshot[];
  events: LanPresentationEvent[];
  diagnostics: LanSnapshotDiagnostics;
}

export interface ClientPingPayload {
  sessionId: string;
  pingId: string;
  sentAtMs: number;
}

export interface HostPongPayload {
  sessionId: string;
  pingId: string;
  clientSentAtMs: number;
  hostReceivedAtMs: number;
  hostSentAtMs: number;
}

export type LanDisconnectReason = "client_exit" | "timeout" | "protocol_error" | "server_shutdown" | "replaced";

export interface ClientDisconnectPayload {
  sessionId: string;
  reason: LanDisconnectReason;
}

export interface HostDisconnectPayload {
  sessionId: string;
  reason: LanDisconnectReason;
  message: string;
  reconnectAllowed: boolean;
}

export interface LanPayloadByType {
  "client.hello": ClientHelloPayload;
  "host.welcome": HostWelcomePayload;
  "host.reject": HostRejectPayload;
  "client.input": ClientInputPayload;
  "host.snapshot": HostSnapshotPayload;
  "client.ping": ClientPingPayload;
  "host.pong": HostPongPayload;
  "client.disconnect": ClientDisconnectPayload;
  "host.disconnect": HostDisconnectPayload;
}

export interface LanEnvelope<TType extends LanMessageType = LanMessageType> {
  protocol: typeof COOPEGE_LAN_PROTOCOL;
  protocolVersion: typeof COOPEGE_LAN_PROTOCOL_VERSION;
  type: TType;
  payload: LanPayloadByType[TType];
}

export interface LanCompatibilityRequirements {
  engineVersion: string;
  projectId: string;
  projectChecksum: string;
  sessionToken: string;
}

export type LanCompatibilityResult =
  | { ok: true }
  | { ok: false; code: Exclude<HostRejectCode, "session_full" | "reconnect_rejected">; message: string };

export interface InputAdmissionContext {
  connectionId: string;
  ownerConnectionId: string;
  sessionId: string;
  playerId: string;
  lastAcceptedInputSeq: number;
  hostTick: number;
  maximumPastTicks?: number;
  maximumFutureTicks?: number;
}

export type InputAdmissionRejectCode =
  | "not_owner"
  | "session_mismatch"
  | "player_mismatch"
  | "duplicate_input"
  | "out_of_order_input"
  | "input_too_old"
  | "input_from_future";

export type InputAdmissionResult =
  | { ok: true; acceptedInputSeq: number }
  | { ok: false; code: InputAdmissionRejectCode; message: string };
