export type EntityId = string;
export type PlayerId = string;
export type PlayerSlotId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerCommand {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  usePrimary: boolean;
}

export interface PlayerInputCommand {
  playerId: PlayerId;
  command: PlayerCommand;
}

export interface InputFrame {
  tick: number;
  players: PlayerInputCommand[];
}

export type InputDeviceKind = "keyboard-mouse" | "keyboard" | "gamepad" | "virtual";

export interface PlayerSlotAssignment {
  slotId: PlayerSlotId;
  playerId: PlayerId;
  deviceKind: InputDeviceKind;
  deviceIndex: number | null;
  joined: boolean;
}

export interface BaseActor {
  entityId: EntityId;
  kind: "player" | "monster";
  floorId: string;
  position: Vec2;
  previousPosition: Vec2;
  radius: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  moveSpeedTilesPerSecond: number;
  abilityId: string;
  cooldownUntilTick: number;
  respawnAtTick: number;
}

export interface PlayerActor extends BaseActor {
  kind: "player";
  playerId: PlayerId;
  slotId: PlayerSlotId;
  classId: string;
  facing: Vec2;
  spawnPosition: Vec2;
  deaths: number;
  xp: number;
  gold: number;
  lootCount: number;
  kills: number;
  questKillCredits: number;
}

export interface MonsterActor extends BaseActor {
  kind: "monster";
  definitionId: string;
  sourceSpawnId: string | null;
  spawnInstanceId: string | null;
  homePosition: Vec2;
  aggroRangeTiles: number;
  leashRangeTiles: number;
  targetPlayerId: PlayerId | null;
  threatByPlayer: Record<PlayerId, number>;
}

export type RuntimeActor = PlayerActor | MonsterActor;

export type SpawnLifecycleStatus = "sleeping" | "active" | "respawning";

/** Canonical, renderer-independent state of one authored spawn instance. */
export interface SpawnRuntimeState {
  instanceId: string;
  spawnId: string;
  instanceIndex: number;
  floorId: string;
  monsterId: string;
  authoredX: number;
  authoredY: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  hp: number;
  cooldownUntilTick: number;
  respawnAtTick: number;
  targetPlayerId: PlayerId | null;
  threatByPlayer: Array<readonly [PlayerId, number]>;
  status: SpawnLifecycleStatus;
  activeEntityId: EntityId | null;
}

export interface SpawnRuntimeDiagnostics {
  authoredDefinitions: number;
  authoredInstances: number;
  active: number;
  sleeping: number;
  respawning: number;
  capped: number;
  activeActorCount: number;
  activeFloorId: string;
  activationRadiusTiles: number;
  deactivationRadiusTiles: number;
  activeMonsterLimit: number;
}

export interface DamageContext {
  sourceEntityId: EntityId;
  ownerPlayerId: PlayerId | null;
  targetEntityId: EntityId;
  abilityId: string;
  effectId: string | null;
  cause: "ability" | "contact" | "environment";
  tick: number;
  amount: number;
}

export interface RewardShare {
  playerId: PlayerId;
  xp: number;
  gold: number;
  questCredit: boolean;
}

export type GameplayEvent =
  | {
      type: "player.joined";
      tick: number;
      playerId: PlayerId;
      entityId: EntityId;
      slotId: PlayerSlotId;
    }
  | {
      type: "player.left";
      tick: number;
      playerId: PlayerId;
      entityId: EntityId;
      slotId: PlayerSlotId;
    }
  | {
      type: "ability.used";
      tick: number;
      sourceEntityId: EntityId;
      targetEntityId: EntityId;
      abilityId: string;
    }
  | {
      type: "damage.applied";
      context: DamageContext;
      remainingHp: number;
    }
  | {
      type: "threat.target_changed";
      tick: number;
      monsterEntityId: EntityId;
      previousPlayerId: PlayerId | null;
      targetPlayerId: PlayerId | null;
    }
  | {
      type: "actor.died";
      tick: number;
      entityId: EntityId;
      killerEntityId: EntityId;
      ownerPlayerId: PlayerId | null;
    }
  | {
      type: "rewards.awarded";
      tick: number;
      defeatedEntityId: EntityId;
      killerPlayerId: PlayerId | null;
      shares: RewardShare[];
      lootRecipientPlayerId: PlayerId | null;
      teamQuestKillCredits: number;
    }
  | {
      type: "actor.respawned";
      tick: number;
      entityId: EntityId;
    }
  | {
      type: "party.floor_changed";
      tick: number;
      transitionId: string | null;
      fromFloorId: string;
      toFloorId: string;
      playerIds: PlayerId[];
      triggeringPlayerIds: PlayerId[];
    }
  | {
      type: "party.transition_conflict";
      tick: number;
      candidateTransitionIds: string[];
      chosenTransitionId: string;
      triggeringPlayerIds: PlayerId[];
    }
  | {
      type: "gameplay.execution_failed";
      tick: number;
      graphId: string;
      nodeId: string | null;
      code: string;
      message: string;
    };

/** Legacy M2 actor record retained only for save v1 migration. */
export interface ActorSaveRecordV1 {
  entityId: EntityId;
  kind: RuntimeActor["kind"];
  floorId: string;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  radius: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  moveSpeedTilesPerSecond: number;
  abilityId: string;
  cooldownUntilTick: number;
  respawnAtTick: number;
  playerId: PlayerId | null;
  classId: string | null;
  facingX: number;
  facingY: number;
  spawnX: number;
  spawnY: number;
  deaths: number;
  definitionId: string | null;
  sourceSpawnId: string | null;
  homeX: number;
  homeY: number;
  aggroRangeTiles: number;
  leashRangeTiles: number;
}

export type ActorSaveRecord = ActorSaveRecordV1;

export interface ActorSaveRecordV2 extends ActorSaveRecordV1 {
  slotId: PlayerSlotId | null;
  xp: number;
  gold: number;
  lootCount: number;
  kills: number;
  questKillCredits: number;
  targetPlayerId: PlayerId | null;
  threatByPlayer: Array<readonly [PlayerId, number]>;
}

export interface GameSaveSnapshotV1 {
  format: "coopege-save";
  schemaVersion: 1;
  projectChecksum: string;
  tick: number;
  activeFloorId: string;
  simulationRngState: number;
  dropRngState: number;
  nextEntitySequence: number;
  actors: ActorSaveRecordV1[];
}

export interface GameSaveSnapshotV2 {
  format: "coopege-save";
  schemaVersion: 2;
  projectChecksum: string;
  tick: number;
  activeFloorId: string;
  simulationRngState: number;
  dropRngState: number;
  nextEntitySequence: number;
  teamQuestKillCredits: number;
  playerSlots: PlayerSlotAssignment[];
  actors: ActorSaveRecordV2[];
}

export interface ActorSaveRecordV3 extends ActorSaveRecordV2 {
  spawnInstanceId: string | null;
}

export interface GameSaveSnapshotV3 {
  format: "coopege-save";
  schemaVersion: 3;
  projectChecksum: string;
  tick: number;
  activeFloorId: string;
  simulationRngState: number;
  dropRngState: number;
  nextEntitySequence: number;
  teamQuestKillCredits: number;
  playerSlots: PlayerSlotAssignment[];
  actors: ActorSaveRecordV3[];
  spawnStates: SpawnRuntimeState[];
}

export type GameSaveSnapshot = GameSaveSnapshotV1 | GameSaveSnapshotV2 | GameSaveSnapshotV3;

export interface ReplayResult {
  checksum: string;
  snapshot: GameSaveSnapshotV3;
}
