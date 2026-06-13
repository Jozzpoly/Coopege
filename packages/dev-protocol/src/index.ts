import type { CoopegeProject } from "../../schema/src/types.js";
import type { ValidationIssue } from "../../validation/src/index.js";
import type { GameplayPlanResult } from "../../gameplay-language/src/index.js";

export const COOPEGE_PROTOCOL = "coopege-runtime-studio" as const;
export const COOPEGE_PROTOCOL_VERSION = 1 as const;

export const BRIDGE_TYPES = {
  studioHello: "studio.hello",
  runtimeReady: "runtime.ready",
  projectApply: "project.apply",
  projectApplied: "project.applied",
  projectRejected: "project.rejected",
  gameplayTest: "gameplay.test",
  gameplayTestResult: "gameplay.test-result",
  ping: "bridge.ping",
  pong: "bridge.pong",
  error: "bridge.error",
} as const;

export type BridgeMessageType = (typeof BRIDGE_TYPES)[keyof typeof BRIDGE_TYPES];

export interface StudioHelloPayload {
  studioVersion: string;
  schemaVersion: number;
  capabilities: string[];
}

export interface RuntimeReadyPayload {
  runtimeVersion: string;
  schemaVersion: number;
  capabilities: string[];
}

export interface ProjectApplyPayload {
  project: CoopegeProject;
  studioRevision: number;
}

export interface ProjectAppliedPayload {
  runtimeRevision: number;
  studioRevision: number;
  checksum: string;
  summary: {
    projectId: string;
    name: string;
    schemaVersion: number;
    floorCount: number;
    monsterCount: number;
    spawnCount: number;
    assetCount: number;
  };
}

export interface ProjectRejectedPayload {
  runtimeRevision: number;
  studioRevision: number;
  issues: ValidationIssue[];
}


export interface GameplayTestPayload {
  graphId: string;
  playerId: string;
}

export interface GameplayTestResultPayload {
  graphId: string;
  playerId: string;
  result: GameplayPlanResult;
}

export interface BridgePingPayload {
  sentAt: number;
}

export interface BridgePongPayload {
  sentAt: number;
  receivedAt: number;
}

export interface BridgeErrorPayload {
  code: string;
  message: string;
  requestType?: string;
}

export interface BridgePayloadByType {
  "studio.hello": StudioHelloPayload;
  "runtime.ready": RuntimeReadyPayload;
  "project.apply": ProjectApplyPayload;
  "project.applied": ProjectAppliedPayload;
  "project.rejected": ProjectRejectedPayload;
  "gameplay.test": GameplayTestPayload;
  "gameplay.test-result": GameplayTestResultPayload;
  "bridge.ping": BridgePingPayload;
  "bridge.pong": BridgePongPayload;
  "bridge.error": BridgeErrorPayload;
}

export interface BridgeEnvelope<TType extends BridgeMessageType = BridgeMessageType> {
  protocol: typeof COOPEGE_PROTOCOL;
  protocolVersion: typeof COOPEGE_PROTOCOL_VERSION;
  sessionNonce: string;
  requestId: string;
  type: TType;
  payload: BridgePayloadByType[TType];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isKnownBridgeType(value: unknown): value is BridgeMessageType {
  return typeof value === "string" && Object.values(BRIDGE_TYPES).includes(value as BridgeMessageType);
}

export function isBridgeEnvelope(value: unknown, expectedNonce?: string): value is BridgeEnvelope {
  if (!isRecord(value)) return false;
  if (
    value.protocol !== COOPEGE_PROTOCOL ||
    value.protocolVersion !== COOPEGE_PROTOCOL_VERSION ||
    typeof value.sessionNonce !== "string" ||
    value.sessionNonce.length < 16 ||
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    !isKnownBridgeType(value.type) ||
    !isRecord(value.payload)
  ) return false;
  if (expectedNonce !== undefined && value.sessionNonce !== expectedNonce) return false;
  return validatePayload(value.type, value.payload);
}

function validatePayload(type: BridgeMessageType, payload: Record<string, unknown>): boolean {
  switch (type) {
    case BRIDGE_TYPES.studioHello:
      return typeof payload.studioVersion === "string" &&
        Number.isInteger(payload.schemaVersion) &&
        isStringArray(payload.capabilities);
    case BRIDGE_TYPES.runtimeReady:
      return typeof payload.runtimeVersion === "string" &&
        Number.isInteger(payload.schemaVersion) &&
        isStringArray(payload.capabilities);
    case BRIDGE_TYPES.projectApply:
      return isRecord(payload.project) && Number.isInteger(payload.studioRevision);
    case BRIDGE_TYPES.projectApplied:
      return Number.isInteger(payload.runtimeRevision) &&
        Number.isInteger(payload.studioRevision) &&
        typeof payload.checksum === "string" &&
        isRecord(payload.summary);
    case BRIDGE_TYPES.projectRejected:
      return Number.isInteger(payload.runtimeRevision) &&
        Number.isInteger(payload.studioRevision) &&
        Array.isArray(payload.issues);
    case BRIDGE_TYPES.gameplayTest:
      return typeof payload.graphId === "string" && typeof payload.playerId === "string";
    case BRIDGE_TYPES.gameplayTestResult:
      return typeof payload.graphId === "string" && typeof payload.playerId === "string" && isRecord(payload.result);
    case BRIDGE_TYPES.ping:
      return typeof payload.sentAt === "number" && Number.isFinite(payload.sentAt);
    case BRIDGE_TYPES.pong:
      return typeof payload.sentAt === "number" && typeof payload.receivedAt === "number";
    case BRIDGE_TYPES.error:
      return typeof payload.code === "string" && typeof payload.message === "string";
  }
}

export function createBridgeEnvelope<TType extends BridgeMessageType>(
  sessionNonce: string,
  requestId: string,
  type: TType,
  payload: BridgePayloadByType[TType],
): BridgeEnvelope<TType> {
  if (sessionNonce.length < 16) throw new Error("Nonce sesji mostu musi mieć co najmniej 16 znaków.");
  if (!requestId) throw new Error("requestId nie może być pusty.");
  return {
    protocol: COOPEGE_PROTOCOL,
    protocolVersion: COOPEGE_PROTOCOL_VERSION,
    sessionNonce,
    requestId,
    type,
    payload,
  };
}

export function createSessionNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
