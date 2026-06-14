import { randomBytes } from "node:crypto";
import {
  createMultiPlayerInputFrame,
  neutralPlayerCommand,
  type GameSaveSnapshotV3,
  type GameWorld,
  type GameplayEvent,
  type PlayerCommand,
} from "../../../packages/gameplay/src/index.js";
import {
  LAN_MESSAGE_TYPES,
  checkHelloCompatibility,
  createLanEnvelope,
  evaluateInputAdmission,
  type ClientHelloPayload,
  type ClientInputPayload,
  type ClientPingPayload,
  type HostRejectCode,
  type HostSnapshotPayload,
  type InputAdmissionResult,
  type LanCompatibilityRequirements,
  type LanEnvelope,
  type LanPresentationEvent,
} from "../../../packages/lan-protocol/src/index.js";

export interface LanHostSessionOptions extends LanCompatibilityRequirements {
  world: GameWorld;
  sessionId?: string;
  snapshotRateHz?: number;
  createToken?: () => string;
}

export interface LanHostSessionDiagnostics {
  sessionId: string;
  hostTick: number;
  connectedPlayers: number;
  rejectedInputs: number;
  snapshotSeq: number;
}

export type LanConnectResult =
  | {
      ok: true;
      playerId: string;
      slotId: string;
      reconnectToken: string;
      message: LanEnvelope<"host.welcome">;
    }
  | {
      ok: false;
      code: HostRejectCode;
      message: LanEnvelope<"host.reject">;
    };

interface HostSlot {
  playerId: string;
  slotId: string;
  ownerConnectionId: string | null;
  reconnectToken: string;
  lastAcceptedInputSeq: number;
  pendingCommand: PlayerCommand | null;
}

function secureToken(): string {
  return randomBytes(18).toString("hex");
}

function eventTick(event: GameplayEvent): number {
  return event.type === "damage.applied" ? event.context.tick : event.tick;
}

function eventEntityId(event: GameplayEvent): string | null {
  switch (event.type) {
    case "player.joined":
    case "player.left":
    case "actor.died":
    case "actor.respawned":
      return event.entityId;
    case "ability.used":
      return event.sourceEntityId;
    case "damage.applied":
      return event.context.targetEntityId;
    case "threat.target_changed":
      return event.monsterEntityId;
    case "rewards.awarded":
      return event.defeatedEntityId;
    case "party.floor_changed":
    case "party.transition_conflict":
    case "gameplay.execution_failed":
      return null;
  }
}

function eventData(event: GameplayEvent): LanPresentationEvent["data"] {
  switch (event.type) {
    case "damage.applied":
      return {
        amount: event.context.amount,
        remainingHp: event.remainingHp,
        sourceEntityId: event.context.sourceEntityId,
        ownerPlayerId: event.context.ownerPlayerId,
      };
    case "ability.used":
      return { abilityId: event.abilityId, targetEntityId: event.targetEntityId };
    case "actor.died":
      return { killerEntityId: event.killerEntityId, ownerPlayerId: event.ownerPlayerId };
    case "actor.respawned":
      return {};
    case "player.joined":
    case "player.left":
      return { playerId: event.playerId, slotId: event.slotId };
    case "threat.target_changed":
      return { previousPlayerId: event.previousPlayerId, targetPlayerId: event.targetPlayerId };
    case "rewards.awarded":
      return {
        killerPlayerId: event.killerPlayerId,
        lootRecipientPlayerId: event.lootRecipientPlayerId,
        teamQuestKillCredits: event.teamQuestKillCredits,
      };
    case "party.floor_changed":
      return { transitionId: event.transitionId, fromFloorId: event.fromFloorId, toFloorId: event.toFloorId };
    case "party.transition_conflict":
      return { chosenTransitionId: event.chosenTransitionId };
    case "gameplay.execution_failed":
      return { graphId: event.graphId, nodeId: event.nodeId, code: event.code, message: event.message };
  }
}

export class LanHostSession {
  readonly world: GameWorld;
  readonly sessionId: string;
  readonly snapshotRateHz: number;
  private readonly requirements: LanCompatibilityRequirements;
  private readonly createToken: () => string;
  private readonly slots: HostSlot[];
  private readonly slotByConnection = new Map<string, HostSlot>();
  private readonly snapshotIntervalTicks: number;
  private pendingEvents: LanPresentationEvent[] = [];
  private eventSequence = 0;
  private rejectedInputs = 0;
  private snapshotSequence = 0;

  constructor(options: LanHostSessionOptions) {
    this.world = options.world;
    this.sessionId = options.sessionId ?? `session-${secureToken()}`;
    this.snapshotRateHz = options.snapshotRateHz ?? 10;
    this.createToken = options.createToken ?? secureToken;
    this.requirements = {
      engineVersion: options.engineVersion,
      projectId: options.projectId,
      projectChecksum: options.projectChecksum,
      sessionToken: options.sessionToken,
    };
    if (!Number.isInteger(this.snapshotRateHz) || this.snapshotRateHz < 1 || this.world.tickRate % this.snapshotRateHz !== 0) {
      throw new Error("Snapshot rate hosta musi być dodatnim dzielnikiem tick rate.");
    }
    this.snapshotIntervalTicks = this.world.tickRate / this.snapshotRateHz;
    this.slots = this.world.players.map((player) => ({
      playerId: player.playerId,
      slotId: player.slotId,
      ownerConnectionId: null,
      reconnectToken: this.createToken(),
      lastAcceptedInputSeq: 0,
      pendingCommand: null,
    }));
    if (this.slots.length !== 2) throw new Error("Pierwszy host LAN wymaga dokładnie dwóch graczy w GameWorld.");
  }

  connect(connectionId: string, hello: ClientHelloPayload): LanConnectResult {
    const compatibility = checkHelloCompatibility(hello, this.requirements);
    if (!compatibility.ok) return this.reject(compatibility.code, compatibility.message);
    if (this.slotByConnection.has(connectionId)) return this.reject("reconnect_rejected", "Połączenie ma już przydzielonego gracza.");

    let slot: HostSlot | undefined;
    if (hello.reconnectToken !== null) {
      slot = this.slots.find((candidate) => candidate.ownerConnectionId === null && candidate.reconnectToken === hello.reconnectToken);
      if (!slot) return this.reject("reconnect_rejected", "Token ponownego połączenia nie pasuje do wolnego slotu.");
    } else {
      slot = this.slots.find((candidate) => candidate.ownerConnectionId === null);
      if (!slot) return this.reject("session_full", "Sesja LAN ma już dwóch połączonych graczy.");
      slot.reconnectToken = this.createToken();
      slot.lastAcceptedInputSeq = 0;
    }

    slot.ownerConnectionId = connectionId;
    slot.pendingCommand = null;
    this.slotByConnection.set(connectionId, slot);
    const message = createLanEnvelope(LAN_MESSAGE_TYPES.hostWelcome, {
      sessionId: this.sessionId,
      playerId: slot.playerId,
      slotId: slot.slotId,
      reconnectToken: slot.reconnectToken,
      hostTick: this.world.tick,
      tickRate: this.world.tickRate,
      snapshotRateHz: this.snapshotRateHz,
    });
    return { ok: true, playerId: slot.playerId, slotId: slot.slotId, reconnectToken: slot.reconnectToken, message };
  }

  disconnect(connectionId: string): void {
    const slot = this.slotByConnection.get(connectionId);
    if (!slot) return;
    slot.ownerConnectionId = null;
    slot.pendingCommand = null;
    this.slotByConnection.delete(connectionId);
  }

  receiveInput(connectionId: string, input: ClientInputPayload): InputAdmissionResult {
    const slot = this.slotByConnection.get(connectionId);
    if (!slot) return this.rejected({ ok: false, code: "not_owner", message: "Połączenie nie ma przydzielonego gracza." });
    const admission = evaluateInputAdmission(input, {
      connectionId,
      ownerConnectionId: slot.ownerConnectionId ?? "",
      sessionId: this.sessionId,
      playerId: slot.playerId,
      lastAcceptedInputSeq: slot.lastAcceptedInputSeq,
      hostTick: this.world.tick,
    });
    if (!admission.ok) return this.rejected(admission);
    slot.lastAcceptedInputSeq = admission.acceptedInputSeq;
    slot.pendingCommand = structuredClone(input.command);
    return admission;
  }

  createPong(connectionId: string, ping: ClientPingPayload, receivedAtMs: number, sentAtMs = Date.now()): LanEnvelope<"host.pong"> | null {
    if (!this.slotByConnection.has(connectionId) || ping.sessionId !== this.sessionId) return null;
    return createLanEnvelope(LAN_MESSAGE_TYPES.hostPong, {
      sessionId: this.sessionId,
      pingId: ping.pingId,
      clientSentAtMs: ping.sentAtMs,
      hostReceivedAtMs: receivedAtMs,
      hostSentAtMs: sentAtMs,
    });
  }

  advanceTick(): ReadonlyMap<string, LanEnvelope<"host.snapshot">> {
    const nextTick = this.world.tick + 1;
    const commands = this.slots.map((slot) => ({
      playerId: slot.playerId,
      command: slot.pendingCommand ?? neutralPlayerCommand(),
    }));
    for (const slot of this.slots) slot.pendingCommand = null;
    this.world.step(createMultiPlayerInputFrame(nextTick, commands));
    this.collectEvents(this.world.events.drain());
    if (this.world.tick % this.snapshotIntervalTicks !== 0) return new Map();

    this.snapshotSequence += 1;
    const snapshots = new Map<string, LanEnvelope<"host.snapshot">>();
    for (const [connectionId, slot] of this.slotByConnection) {
      snapshots.set(connectionId, createLanEnvelope(LAN_MESSAGE_TYPES.hostSnapshot, this.snapshotPayload(slot)));
    }
    this.pendingEvents = [];
    return snapshots;
  }

  createSaveSnapshot(): GameSaveSnapshotV3 {
    return this.world.createSaveSnapshot();
  }

  diagnostics(): LanHostSessionDiagnostics {
    return {
      sessionId: this.sessionId,
      hostTick: this.world.tick,
      connectedPlayers: this.slotByConnection.size,
      rejectedInputs: this.rejectedInputs,
      snapshotSeq: this.snapshotSequence,
    };
  }

  connectionIds(): string[] {
    return [...this.slotByConnection.keys()].sort();
  }

  private snapshotPayload(slot: HostSlot): HostSnapshotPayload {
    return {
      sessionId: this.sessionId,
      hostTick: this.world.tick,
      activeFloorId: this.world.activeFloorId,
      acknowledgedInputSeq: slot.lastAcceptedInputSeq,
      players: this.world.players.map((player) => ({
        playerId: player.playerId,
        entityId: player.entityId,
        slotId: player.slotId,
        classId: player.classId,
        floorId: player.floorId,
        radius: player.radius,
        x: player.position.x,
        y: player.position.y,
        previousX: player.previousPosition.x,
        previousY: player.previousPosition.y,
        facingX: player.facing.x,
        facingY: player.facing.y,
        alive: player.alive,
        hp: player.hp,
        maxHp: player.maxHp,
      })),
      actors: this.world.monsters
        .filter((monster) => monster.floorId === this.world.activeFloorId)
        .sort((left, right) => left.entityId.localeCompare(right.entityId))
        .map((monster) => ({
          entityId: monster.entityId,
          kind: "monster" as const,
          definitionId: monster.definitionId,
          floorId: monster.floorId,
          radius: monster.radius,
          x: monster.position.x,
          y: monster.position.y,
          previousX: monster.previousPosition.x,
          previousY: monster.previousPosition.y,
          alive: monster.alive,
          hp: monster.hp,
          maxHp: monster.maxHp,
        })),
      events: this.pendingEvents.map((event) => ({ ...event, data: { ...event.data } })),
      diagnostics: {
        snapshotSeq: this.snapshotSequence,
        connectedPlayers: this.slotByConnection.size,
        rejectedInputs: this.rejectedInputs,
      },
    };
  }

  private collectEvents(events: readonly GameplayEvent[]): void {
    for (const event of events) {
      this.eventSequence += 1;
      this.pendingEvents.push({
        eventId: `${this.sessionId}.event.${String(this.eventSequence).padStart(8, "0")}`,
        type: event.type,
        tick: eventTick(event),
        entityId: eventEntityId(event),
        data: eventData(event),
      });
    }
    if (this.pendingEvents.length > 256) this.pendingEvents = this.pendingEvents.slice(-256);
  }

  private reject(code: HostRejectCode, message: string): LanConnectResult {
    return { ok: false, code, message: createLanEnvelope(LAN_MESSAGE_TYPES.hostReject, { code, message }) };
  }

  private rejected(result: InputAdmissionResult): InputAdmissionResult {
    this.rejectedInputs += 1;
    return result;
  }
}
