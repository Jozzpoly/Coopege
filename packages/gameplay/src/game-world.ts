import { DeterministicRng } from "../../core/src/index.js";
import type { AbilityDefinition, GameplayDomain, GameplayParameters, GameplayTriggerEvent, MonsterDefinition, PlayerClassDefinition, SpawnDefinition, WorldTransitionDefinition } from "../../schema/src/index.js";
import {
  GameplayInterpreter,
  createCoreGameplayRegistry,
  type GameplayExecutionContext,
  type GameplayOperation,
  type GameplayPlanResult,
  type GameplayPrimitiveEnvironment,
} from "../../gameplay-language/src/index.js";
import type { PreparedFloor, PreparedRuntimeProject } from "../../runtime-core/src/index.js";
import { stableChecksum } from "../../validation/src/index.js";
import { EntityIdAllocator, EntityStore } from "./entity-store.js";
import { EventBus } from "./event-bus.js";
import { neutralPlayerCommand, normalizePlayerCommand } from "./input.js";
import { buildSpawnRuntimeStates, cloneSpawnRuntimeState, createSpawnEntityId } from "./spawn-runtime.js";
import type {
  ActorSaveRecordV1,
  ActorSaveRecordV2,
  ActorSaveRecordV3,
  DamageContext,
  GameSaveSnapshot,
  GameSaveSnapshotV1,
  GameSaveSnapshotV2,
  GameSaveSnapshotV3,
  GameplayEvent,
  InputDeviceKind,
  InputFrame,
  MonsterActor,
  PlayerActor,
  PlayerCommand,
  PlayerId,
  PlayerSlotAssignment,
  PlayerSlotId,
  RuntimeActor,
  SpawnRuntimeDiagnostics,
  SpawnRuntimeState,
  Vec2,
} from "./types.js";

const POSITION_QUANTIZATION = 1_000_000;
export const PRIMARY_PLAYER_ID = "player.local.1";
export const SECONDARY_PLAYER_ID = "player.local.2";
export const PRIMARY_SLOT_ID = "slot.keyboard-mouse.1";
export const SECONDARY_SLOT_ID = "slot.gamepad.1";

function quantize(value: number): number {
  return Math.round(value * POSITION_QUANTIZATION) / POSITION_QUANTIZATION;
}

function cloneVec(value: Vec2): Vec2 {
  return { x: value.x, y: value.y };
}

function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function normalizeVector(x: number, y: number): Vec2 {
  const length = Math.hypot(x, y);
  if (length < 0.000001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function isPlayer(actor: RuntimeActor): actor is PlayerActor {
  return actor.kind === "player";
}

function isMonster(actor: RuntimeActor): actor is MonsterActor {
  return actor.kind === "monster";
}

function sortedRecord(record: Record<string, number>): Array<readonly [string, number]> {
  return Object.entries(record)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort(([left], [right]) => left.localeCompare(right));
}

function allocateIntegerShares(total: number, playerIds: readonly PlayerId[], preferredPlayerId: PlayerId | null): Map<PlayerId, number> {
  const result = new Map<PlayerId, number>();
  if (playerIds.length === 0 || total <= 0) return result;
  const ordered = [...playerIds].sort((left, right) => {
    if (left === preferredPlayerId) return -1;
    if (right === preferredPlayerId) return 1;
    return left.localeCompare(right);
  });
  const base = Math.floor(total / ordered.length);
  let remainder = total % ordered.length;
  for (const playerId of ordered) {
    result.set(playerId, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return result;
}

export interface PlayerJoinOptions {
  playerId?: PlayerId;
  slotId?: PlayerSlotId;
  deviceKind?: InputDeviceKind;
  deviceIndex?: number | null;
  classId?: string;
}

export interface GameWorldOptions {
  tickRate?: number;
  simulationSeed?: number;
  dropSeed?: number;
  playerClassId?: string;
  playerClassIds?: readonly string[];
  initialPlayerCount?: 1 | 2;
  trainingMonsterId?: string;
  /** Test-only fallback for non-authored monsters. Authored spawns use their own respawnTicks. */
  respawnDelayTicks?: number;
  spawnActivationRadiusTiles?: number;
  spawnDeactivationRadiusTiles?: number;
  activeMonsterLimit?: number;
  softTetherTiles?: number;
  hardTetherTiles?: number;
  rewardRadiusTiles?: number;
}

export interface PlayerSummary {
  playerId: PlayerId;
  entityId: string;
  slotId: PlayerSlotId;
  hp: number;
  maxHp: number;
  alive: boolean;
  xp: number;
  gold: number;
  lootCount: number;
  kills: number;
  questKillCredits: number;
}

export interface GameWorldSummary {
  tick: number;
  activeFloorId: string;
  playerEntityId: string;
  playerHp: number;
  playerMaxHp: number;
  players: PlayerSummary[];
  livingMonsters: number;
  spawnDiagnostics: SpawnRuntimeDiagnostics;
  teamQuestKillCredits: number;
  maximumPlayerDistance: number;
  stateChecksum: string;
}

class CollisionGrid {
  private readonly walkableByTileId: ReadonlyMap<string, boolean>;

  constructor(
    readonly floor: PreparedFloor,
    tileDefinitions: readonly { id: string; walkable: boolean }[],
  ) {
    this.walkableByTileId = new Map(tileDefinitions.map((tile) => [tile.id, tile.walkable]));
  }

  isWalkableCell(x: number, y: number): boolean {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.floor.width || y >= this.floor.height) return false;
    const tileId = this.floor.tiles[y * this.floor.width + x];
    return tileId !== undefined && this.walkableByTileId.get(tileId) === true;
  }

  isCircleWalkable(x: number, y: number, radius: number): boolean {
    const points = [
      [0, 0], [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
      [-radius, 0], [radius, 0], [0, -radius], [0, radius],
    ] as const;
    return points.every(([offsetX, offsetY]) => this.isWalkableCell(Math.floor(x + offsetX), Math.floor(y + offsetY)));
  }

  findNearestWalkable(origin: Vec2, preferredDistance = 0, occupied: ReadonlySet<string> = new Set()): Vec2 {
    const centerX = Math.floor(origin.x);
    const centerY = Math.floor(origin.y);
    const maximumRadius = Math.max(this.floor.width, this.floor.height);
    for (let radius = Math.max(0, Math.floor(preferredDistance)); radius <= maximumRadius; radius += 1) {
      const candidates: Array<[number, number]> = [];
      if (radius === 0) candidates.push([centerX, centerY]);
      for (let offset = -radius; offset <= radius; offset += 1) {
        candidates.push([centerX + offset, centerY - radius]);
        candidates.push([centerX + radius, centerY + offset]);
        candidates.push([centerX - offset, centerY + radius]);
        candidates.push([centerX - radius, centerY - offset]);
      }
      const seen = new Set<string>();
      for (const [x, y] of candidates) {
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!occupied.has(key) && this.isCircleWalkable(x + 0.5, y + 0.5, 0.28)) return { x: x + 0.5, y: y + 0.5 };
      }
    }
    throw new Error(`Piętro ${this.floor.id} nie zawiera dostępnego pola.`);
  }
}

export class GameWorld {
  readonly actors = new EntityStore<RuntimeActor>();
  readonly events = new EventBus<GameplayEvent>();
  readonly tickRate: number;
  readonly projectChecksum: string;
  readonly softTetherTiles: number;
  readonly hardTetherTiles: number;
  readonly rewardRadiusTiles: number;

  private readonly allocator = new EntityIdAllocator();
  private readonly simulationRng: DeterministicRng;
  private readonly dropRng: DeterministicRng;
  private readonly abilities: ReadonlyMap<string, AbilityDefinition>;
  private readonly gameplayInterpreter: GameplayInterpreter;
  private readonly activeTriggerEvents = new Set<GameplayTriggerEvent>();
  private readonly respawnDelayTicks: number;
  readonly spawnActivationRadiusTiles: number;
  readonly spawnDeactivationRadiusTiles: number;
  readonly activeMonsterLimit: number;
  private readonly spawnDefinitionById: ReadonlyMap<string, SpawnDefinition>;
  private readonly transitionBySourceCell: ReadonlyMap<string, WorldTransitionDefinition>;
  private readonly spawnStates = new Map<string, SpawnRuntimeState>();
  private _cappedSpawnCount = 0;
  private readonly playerEntityIds = new Map<PlayerId, string>();
  private readonly slots = new Map<PlayerSlotId, PlayerSlotAssignment>();
  private _tick = 0;
  private _activeFloorId: string;
  private floor: PreparedFloor;
  private collision: CollisionGrid;
  private _teamQuestKillCredits = 0;

  constructor(
    readonly runtimeProject: PreparedRuntimeProject,
    options: GameWorldOptions = {},
  ) {
    this.tickRate = options.tickRate ?? 30;
    if (!Number.isInteger(this.tickRate) || this.tickRate < 1 || this.tickRate > 240) throw new Error("Nieprawidłowy tickRate GameWorld.");
    this.softTetherTiles = options.softTetherTiles ?? 10;
    this.hardTetherTiles = options.hardTetherTiles ?? 14;
    this.rewardRadiusTiles = options.rewardRadiusTiles ?? 12;
    if (!(this.softTetherTiles > 0 && this.hardTetherTiles > this.softTetherTiles)) throw new Error("Twardy tether musi być większy od miękkiego tethera.");
    this.projectChecksum = runtimeProject.checksum;
    this._activeFloorId = runtimeProject.project.manifest.playerStart.floorId;
    const floor = runtimeProject.floors.get(this._activeFloorId);
    if (!floor) throw new Error(`Brak piętra startowego ${this._activeFloorId}.`);
    this.floor = floor;
    this.collision = new CollisionGrid(floor, runtimeProject.project.world.tiles);
    this.abilities = new Map(runtimeProject.project.content.abilities.map((ability) => [ability.id, ability]));
    const gameplayRegistry = createCoreGameplayRegistry({
      sourceAlive: (environment) => this.gameplaySourceAlive(environment),
      cooldownReady: (environment) => this.gameplayCooldownReady(environment),
      providedTargetIsMonster: (environment) => {
        const targetId = environment.context.providedTargetEntityId;
        const target = targetId ? this.actors.get(targetId) : undefined;
        return target !== undefined && isMonster(target);
      },
      selectNearestHostile: (environment, parameters) => this.gameplaySelectNearestHostile(environment, parameters),
      selectSource: (environment) => this.actors.has(environment.context.sourceEntityId) ? [environment.context.sourceEntityId] : [],
      selectProvidedTarget: (environment) => {
        const targetId = environment.context.providedTargetEntityId;
        return targetId && this.actors.has(targetId) ? [targetId] : [];
      },
    });
    this.gameplayInterpreter = new GameplayInterpreter(runtimeProject.project.gameplay, gameplayRegistry);
    this.simulationRng = new DeterministicRng(options.simulationSeed ?? 0xc00fee);
    this.dropRng = new DeterministicRng(options.dropSeed ?? 0xd09f00d);
    this.respawnDelayTicks = options.respawnDelayTicks ?? 90;
    this.spawnActivationRadiusTiles = options.spawnActivationRadiusTiles ?? 24;
    this.spawnDeactivationRadiusTiles = options.spawnDeactivationRadiusTiles ?? 30;
    this.activeMonsterLimit = options.activeMonsterLimit ?? 48;
    if (!(this.spawnActivationRadiusTiles > 0 && this.spawnDeactivationRadiusTiles > this.spawnActivationRadiusTiles)) {
      throw new Error("Promień dezaktywacji spawnów musi być większy od promienia aktywacji.");
    }
    if (!Number.isInteger(this.activeMonsterLimit) || this.activeMonsterLimit < 1 || this.activeMonsterLimit > 512) {
      throw new Error("Limit aktywnych potworów musi być liczbą całkowitą 1..512.");
    }
    this.spawnDefinitionById = new Map(runtimeProject.project.content.spawns.map((spawn) => [spawn.id, spawn]));
    this.transitionBySourceCell = new Map((runtimeProject.project.world.transitions ?? []).map((transition) => [
      this.transitionCellKey(transition.source.floorId, transition.source.x, transition.source.y),
      transition,
    ]));
    for (const state of buildSpawnRuntimeStates(
      runtimeProject.project.content.spawns,
      runtimeProject.project.content.monsters,
      runtimeProject.floors,
      runtimeProject.project.world.tiles,
    )) this.spawnStates.set(state.instanceId, state);
    this.createInitialActors(options);
  }

  get tick(): number {
    return this._tick;
  }

  get activeFloorId(): string {
    return this._activeFloorId;
  }

  get teamQuestKillCredits(): number {
    return this._teamQuestKillCredits;
  }

  /** Compatibility accessor for systems that intentionally address the first local player. */
  get playerId(): PlayerId {
    return this.players[0]?.playerId ?? PRIMARY_PLAYER_ID;
  }

  /** Compatibility accessor. Gameplay systems must iterate `players` instead. */
  get player(): PlayerActor {
    const player = this.players[0];
    if (!player) throw new Error("GameWorld nie zawiera aktywnego gracza.");
    return player;
  }

  get players(): PlayerActor[] {
    return this.actors.filter(isPlayer).sort((left, right) => left.playerId.localeCompare(right.playerId));
  }

  get monsters(): MonsterActor[] {
    return this.actors.filter(isMonster);
  }

  get preparedFloor(): PreparedFloor {
    return this.floor;
  }

  get playerSlots(): PlayerSlotAssignment[] {
    return [...this.slots.values()].map((slot) => ({ ...slot })).sort((left, right) => left.slotId.localeCompare(right.slotId));
  }

  getPlayer(playerId: PlayerId): PlayerActor | undefined {
    const entityId = this.playerEntityIds.get(playerId);
    if (!entityId) return undefined;
    const actor = this.actors.get(entityId);
    return actor && isPlayer(actor) ? actor : undefined;
  }

  private createInitialActors(options: GameWorldOptions): void {
    this.slots.set(PRIMARY_SLOT_ID, {
      slotId: PRIMARY_SLOT_ID,
      playerId: PRIMARY_PLAYER_ID,
      deviceKind: "keyboard-mouse",
      deviceIndex: null,
      joined: false,
    });
    this.slots.set(SECONDARY_SLOT_ID, {
      slotId: SECONDARY_SLOT_ID,
      playerId: SECONDARY_PLAYER_ID,
      deviceKind: "gamepad",
      deviceIndex: 0,
      joined: false,
    });
    const primaryClassId = options.playerClassIds?.[0] ?? options.playerClassId;
    this.joinPlayerInternal({
      playerId: PRIMARY_PLAYER_ID,
      slotId: PRIMARY_SLOT_ID,
      deviceKind: "keyboard-mouse",
      deviceIndex: null,
      ...(primaryClassId ? { classId: primaryClassId } : {}),
    }, false);
    if ((options.initialPlayerCount ?? 1) >= 2) {
      const secondaryClassId = options.playerClassIds?.[1] ?? options.playerClassId;
      this.joinPlayerInternal({
        playerId: SECONDARY_PLAYER_ID,
        slotId: SECONDARY_SLOT_ID,
        deviceKind: "gamepad",
        deviceIndex: 0,
        ...(secondaryClassId ? { classId: secondaryClassId } : {}),
      }, false);
    }
    this.reconcileSpawnLifecycle();
  }

  joinPlayer(options: PlayerJoinOptions = {}): PlayerActor {
    const player = this.joinPlayerInternal(options, true);
    this.reconcileSpawnLifecycle();
    return player;
  }

  private joinPlayerInternal(options: PlayerJoinOptions, emitEvent: boolean): PlayerActor {
    const slotId = options.slotId ?? SECONDARY_SLOT_ID;
    const existingSlot = this.slots.get(slotId);
    const playerId = options.playerId ?? existingSlot?.playerId ?? `player.local.${this.slots.size + 1}`;
    if (this.playerEntityIds.has(playerId)) throw new Error(`Gracz ${playerId} jest już dołączony.`);
    if (existingSlot?.joined) throw new Error(`Slot ${slotId} jest już zajęty przez ${existingSlot.playerId}.`);
    for (const slot of this.slots.values()) {
      if (slot.joined && slot.playerId === playerId) throw new Error(`Gracz ${playerId} jest przypisany do innego slotu.`);
    }

    const playerClass = this.resolvePlayerClass(options.classId);
    const abilityId = playerClass.abilityIds[0];
    if (!abilityId || !this.abilities.has(abilityId)) throw new Error(`Klasa ${playerClass.id} nie ma poprawnej umiejętności podstawowej.`);
    const position = this.playerSpawnPosition(this.players.length);
    const player = this.createPlayer(playerClass, abilityId, position, playerId, slotId);
    this.actors.add(player);
    this.playerEntityIds.set(playerId, player.entityId);
    this.slots.set(slotId, {
      slotId,
      playerId,
      deviceKind: options.deviceKind ?? existingSlot?.deviceKind ?? "virtual",
      deviceIndex: options.deviceIndex === undefined ? (existingSlot?.deviceIndex ?? null) : options.deviceIndex,
      joined: true,
    });
    if (emitEvent) this.emitGameplayEvent({ type: "player.joined", tick: this._tick, playerId, entityId: player.entityId, slotId });
    return player;
  }

  leavePlayer(playerId: PlayerId): void {
    if (this.players.length <= 1) throw new Error("Nie można odłączyć ostatniego gracza lokalnej sesji.");
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Gracz ${playerId} nie jest dołączony.`);
    this.actors.remove(player.entityId);
    this.playerEntityIds.delete(playerId);
    const slot = this.slots.get(player.slotId);
    if (slot) this.slots.set(player.slotId, { ...slot, joined: false });
    for (const monster of this.monsters) {
      delete monster.threatByPlayer[playerId];
      if (monster.targetPlayerId === playerId) this.setMonsterTarget(monster, null);
    }
    for (const state of this.spawnStates.values()) {
      state.threatByPlayer = state.threatByPlayer.filter(([threatPlayerId]) => threatPlayerId !== playerId);
      if (state.targetPlayerId === playerId) state.targetPlayerId = null;
    }
    this.emitGameplayEvent({ type: "player.left", tick: this._tick, playerId, entityId: player.entityId, slotId: player.slotId });
    this.reconcileSpawnLifecycle();
  }

  private resolvePlayerClass(classId?: string): PlayerClassDefinition {
    const classes = this.runtimeProject.project.content.classes;
    const requested = classId === undefined ? undefined : classes.find((item) => item.id === classId);
    const result = requested
      ?? classes.find((item) => item.id.includes("warrior") || item.id.includes("vanguard"))
      ?? classes[0];
    if (!result) throw new Error("Projekt nie zawiera klasy gracza wymaganej przez GameWorld.");
    return result;
  }

  private playerSpawnPosition(index: number): Vec2 {
    const currentParty = this.players.filter((player) => player.floorId === this._activeFloorId);
    if (currentParty.length > 0) {
      const center = {
        x: currentParty.reduce((sum, player) => sum + player.position.x, 0) / currentParty.length,
        y: currentParty.reduce((sum, player) => sum + player.position.y, 0) / currentParty.length,
      };
      const occupied = new Set(currentParty.map((player) => `${Math.floor(player.position.x)},${Math.floor(player.position.y)}`));
      return this.collision.findNearestWalkable(center, 1, occupied);
    }

    const configuredStart = this.runtimeProject.project.manifest.playerStart;
    const center = this.collision.isCircleWalkable(configuredStart.x + 0.5, configuredStart.y + 0.5, 0.32)
      ? { x: configuredStart.x + 0.5, y: configuredStart.y + 0.5 }
      : this.collision.findNearestWalkable({ x: configuredStart.x + 0.5, y: configuredStart.y + 0.5 });
    return index === 0 ? center : this.collision.findNearestWalkable(center, Math.max(1, index));
  }

  get authoredSpawnStates(): SpawnRuntimeState[] {
    this.syncAllSpawnStatesFromActors();
    return [...this.spawnStates.values()].map(cloneSpawnRuntimeState).sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  }

  spawnDiagnostics(): SpawnRuntimeDiagnostics {
    this.syncAllSpawnStatesFromActors();
    const states = [...this.spawnStates.values()];
    return {
      authoredDefinitions: this.runtimeProject.project.content.spawns.length,
      authoredInstances: states.length,
      active: states.filter((state) => state.status === "active").length,
      sleeping: states.filter((state) => state.status === "sleeping").length,
      respawning: states.filter((state) => state.status === "respawning").length,
      capped: this._cappedSpawnCount,
      activeActorCount: this.monsters.length,
      activeFloorId: this._activeFloorId,
      activationRadiusTiles: this.spawnActivationRadiusTiles,
      deactivationRadiusTiles: this.spawnDeactivationRadiusTiles,
      activeMonsterLimit: this.activeMonsterLimit,
    };
  }

  private monsterDefinition(monsterId: string): MonsterDefinition {
    const definition = this.runtimeProject.project.content.monsters.find((monster) => monster.id === monsterId);
    if (!definition) throw new Error(`Brak definicji potwora ${monsterId}.`);
    return definition;
  }

  private stateDistanceToParty(state: SpawnRuntimeState): number {
    const players = this.players.filter((player) => player.alive && player.floorId === state.floorId);
    if (players.length === 0) return Number.POSITIVE_INFINITY;
    return Math.min(...players.map((player) => Math.hypot(player.position.x - state.x, player.position.y - state.y)));
  }

  private syncSpawnStateFromActor(state: SpawnRuntimeState): void {
    if (!state.activeEntityId) return;
    const actor = this.actors.get(state.activeEntityId);
    if (!actor || !isMonster(actor) || actor.spawnInstanceId !== state.instanceId) {
      state.activeEntityId = null;
      if (state.status === "active") state.status = "sleeping";
      return;
    }
    state.x = quantize(actor.position.x);
    state.y = quantize(actor.position.y);
    state.previousX = quantize(actor.previousPosition.x);
    state.previousY = quantize(actor.previousPosition.y);
    state.hp = actor.hp;
    state.cooldownUntilTick = actor.cooldownUntilTick;
    state.respawnAtTick = actor.respawnAtTick;
    state.targetPlayerId = actor.targetPlayerId;
    state.threatByPlayer = sortedRecord(actor.threatByPlayer);
    state.status = actor.alive ? "active" : "respawning";
  }

  private syncAllSpawnStatesFromActors(): void {
    for (const state of this.spawnStates.values()) this.syncSpawnStateFromActor(state);
  }

  private resetRespawnedState(state: SpawnRuntimeState): void {
    const definition = this.monsterDefinition(state.monsterId);
    state.x = state.homeX;
    state.y = state.homeY;
    state.previousX = state.homeX;
    state.previousY = state.homeY;
    state.hp = definition.maxHp;
    state.cooldownUntilTick = this._tick + 10;
    state.respawnAtTick = 0;
    state.targetPlayerId = null;
    state.threatByPlayer = [];
    state.status = "sleeping";
    state.activeEntityId = null;
  }

  private activateSpawnState(state: SpawnRuntimeState): void {
    if (state.activeEntityId) return;
    if (state.status === "respawning") {
      if (this._tick < state.respawnAtTick) return;
      this.resetRespawnedState(state);
    }
    const definition = this.monsterDefinition(state.monsterId);
    const abilityId = definition.abilityIds[0];
    if (!abilityId || !this.abilities.has(abilityId)) throw new Error(`Potwór ${definition.id} nie ma poprawnej umiejętności podstawowej.`);
    const actor = this.createMonster(definition, abilityId, state);
    this.actors.add(actor);
    state.activeEntityId = actor.entityId;
    state.status = actor.alive ? "active" : "respawning";
  }

  private deactivateSpawnState(state: SpawnRuntimeState): void {
    this.syncSpawnStateFromActor(state);
    if (state.activeEntityId) this.actors.remove(state.activeEntityId);
    state.activeEntityId = null;
    if (state.status === "active") state.status = "sleeping";
  }

  private reconcileSpawnLifecycle(): void {
    this.syncAllSpawnStatesFromActors();
    for (const state of this.spawnStates.values()) {
      if (!state.activeEntityId && state.status === "respawning" && this._tick >= state.respawnAtTick) this.resetRespawnedState(state);
    }

    const candidates = [...this.spawnStates.values()]
      .filter((state) => state.floorId === this._activeFloorId)
      .map((state) => {
        const active = state.activeEntityId !== null;
        const distanceToParty = this.stateDistanceToParty(state);
        const inCombat = active && (state.targetPlayerId !== null || state.threatByPlayer.length > 0);
        const eligible = active
          ? distanceToParty <= this.spawnDeactivationRadiusTiles
          : state.status === "sleeping" && distanceToParty <= this.spawnActivationRadiusTiles;
        return { state, active, inCombat, distanceToParty, eligible };
      })
      .filter((entry) => entry.eligible)
      .sort((left, right) => {
        if (left.inCombat !== right.inCombat) return left.inCombat ? -1 : 1;
        if (left.active !== right.active) return left.active ? -1 : 1;
        return left.distanceToParty - right.distanceToParty || left.state.instanceId.localeCompare(right.state.instanceId);
      });

    const selected = new Set(candidates.slice(0, this.activeMonsterLimit).map((entry) => entry.state.instanceId));
    this._cappedSpawnCount = Math.max(0, candidates.length - selected.size);

    for (const state of this.spawnStates.values()) {
      if (state.activeEntityId && (state.floorId !== this._activeFloorId || !selected.has(state.instanceId))) this.deactivateSpawnState(state);
    }
    for (const entry of candidates) {
      if (selected.has(entry.state.instanceId) && !entry.state.activeEntityId) this.activateSpawnState(entry.state);
    }
  }

  private deactivateAllSpawnActors(): void {
    for (const state of this.spawnStates.values()) if (state.activeEntityId) this.deactivateSpawnState(state);
    this._cappedSpawnCount = 0;
  }

  private createPlayer(
    definition: PlayerClassDefinition,
    abilityId: string,
    position: Vec2,
    playerId: PlayerId,
    slotId: PlayerSlotId,
  ): PlayerActor {
    return {
      entityId: this.allocator.allocate("player"),
      kind: "player",
      playerId,
      slotId,
      classId: definition.id,
      floorId: this._activeFloorId,
      position: cloneVec(position),
      previousPosition: cloneVec(position),
      radius: 0.32,
      alive: true,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      moveSpeedTilesPerSecond: definition.moveSpeedTilesPerSecond,
      abilityId,
      cooldownUntilTick: 0,
      respawnAtTick: 0,
      facing: { x: 1, y: 0 },
      spawnPosition: cloneVec(position),
      deaths: 0,
      xp: 0,
      gold: 0,
      lootCount: 0,
      kills: 0,
      questKillCredits: this._teamQuestKillCredits,
    };
  }

  private createMonster(definition: MonsterDefinition, abilityId: string, state: SpawnRuntimeState): MonsterActor {
    const alive = state.status !== "respawning";
    return {
      entityId: createSpawnEntityId(state.instanceId),
      kind: "monster",
      definitionId: definition.id,
      sourceSpawnId: state.spawnId,
      spawnInstanceId: state.instanceId,
      floorId: state.floorId,
      position: { x: state.x, y: state.y },
      previousPosition: { x: state.previousX, y: state.previousY },
      radius: 0.3,
      alive,
      hp: state.hp,
      maxHp: definition.maxHp,
      moveSpeedTilesPerSecond: definition.moveSpeedTilesPerSecond,
      abilityId,
      cooldownUntilTick: state.cooldownUntilTick,
      respawnAtTick: state.respawnAtTick,
      homePosition: { x: state.homeX, y: state.homeY },
      aggroRangeTiles: 9,
      leashRangeTiles: 13,
      targetPlayerId: state.targetPlayerId,
      threatByPlayer: Object.fromEntries(state.threatByPlayer),
    };
  }

  step(frame: InputFrame): void {
    if (frame.tick !== this._tick + 1) throw new Error(`InputFrame ma tick ${frame.tick}, oczekiwano ${this._tick + 1}.`);
    this._tick = frame.tick;
    for (const actor of this.actors.values()) actor.previousPosition = cloneVec(actor.position);

    const commandByPlayerId = new Map(frame.players.map((entry) => [entry.playerId, normalizePlayerCommand(entry.command)]));
    for (const player of this.players) this.updatePlayer(player, commandByPlayerId.get(player.playerId) ?? neutralPlayerCommand());
    this.enforcePartyTether();
    this.resolveEnteredWorldTransition();
    this.reconcileSpawnLifecycle();
    for (const monster of this.monsters) this.updateMonster(monster);
    this.syncAllSpawnStatesFromActors();
  }

  private updatePlayer(player: PlayerActor, command: PlayerCommand): void {
    if (!player.alive) {
      if (this._tick >= player.respawnAtTick) this.respawnPlayer(player);
      return;
    }
    const aim = normalizeVector(command.aimX, command.aimY);
    if (aim.x !== 0 || aim.y !== 0) player.facing = aim;
    this.moveActor(player, command.moveX, command.moveY);
    if (command.usePrimary) this.tryPlayerAbility(player);
  }

  private updateMonster(monster: MonsterActor): void {
    if (!monster.alive) {
      if (this._tick >= monster.respawnAtTick) this.respawnMonster(monster);
      return;
    }
    const ability = this.abilities.get(monster.abilityId);
    if (!ability) return;
    const homeDistance = distance(monster.position, monster.homePosition);
    if (homeDistance > monster.leashRangeTiles) {
      this.setMonsterTarget(monster, null);
      const towardHome = normalizeVector(monster.homePosition.x - monster.position.x, monster.homePosition.y - monster.position.y);
      this.moveActor(monster, towardHome.x, towardHome.y);
      return;
    }

    const target = this.selectMonsterTarget(monster);
    if (!target) return;
    const targetDistance = distance(monster.position, target.position);
    if (targetDistance <= ability.rangeTiles && this._tick >= monster.cooldownUntilTick) {
      this.executeAbility(monster, target.entityId, null);
      return;
    }
    if (targetDistance <= monster.aggroRangeTiles || (monster.threatByPlayer[target.playerId] ?? 0) > 0) {
      const towardTarget = normalizeVector(target.position.x - monster.position.x, target.position.y - monster.position.y);
      this.moveActor(monster, towardTarget.x, towardTarget.y);
    }
  }

  private selectMonsterTarget(monster: MonsterActor): PlayerActor | undefined {
    const candidates = this.players
      .filter((player) => player.alive && player.floorId === monster.floorId)
      .map((player) => {
        const targetDistance = distance(monster.position, player.position);
        const homeDistance = distance(monster.homePosition, player.position);
        const threat = monster.threatByPlayer[player.playerId] ?? 0;
        const proximity = Math.max(0, monster.aggroRangeTiles - targetDistance) * 2;
        return { player, targetDistance, homeDistance, threat, score: threat + proximity };
      })
      .filter((entry) => entry.homeDistance <= monster.leashRangeTiles && (entry.targetDistance <= monster.aggroRangeTiles || entry.threat > 0))
      .sort((left, right) => right.score - left.score || left.targetDistance - right.targetDistance || left.player.playerId.localeCompare(right.player.playerId));
    const target = candidates[0]?.player;
    this.setMonsterTarget(monster, target?.playerId ?? null);
    return target;
  }

  private setMonsterTarget(monster: MonsterActor, playerId: PlayerId | null): void {
    if (monster.targetPlayerId === playerId) return;
    const previousPlayerId = monster.targetPlayerId;
    monster.targetPlayerId = playerId;
    this.emitGameplayEvent({
      type: "threat.target_changed",
      tick: this._tick,
      monsterEntityId: monster.entityId,
      previousPlayerId,
      targetPlayerId: playerId,
    });
  }

  private tryPlayerAbility(player: PlayerActor): void {
    this.executeAbility(player, null, player.playerId);
  }

  private executeAbility(source: RuntimeActor, providedTargetEntityId: string | null, ownerPlayerId: PlayerId | null): GameplayPlanResult {
    const ability = this.abilities.get(source.abilityId);
    if (!ability) return this.executionFailure("graph.unknown", null, "unknown_graph", `Nie znaleziono umiejętności ${source.abilityId}.`);
    const result = this.gameplayInterpreter.planGraph(ability.graphId, {
      domain: "ability",
      entryPointId: ability.id,
      sourceEntityId: source.entityId,
      ownerPlayerId,
      abilityId: ability.id,
      providedTargetEntityId,
      tick: this._tick,
    });
    if (!result.ok) {
      this.executionFailure(result.graphId, result.nodeId, result.code, result.message);
      return result;
    }
    const commitError = this.commitGameplayOperations(result.operations);
    if (commitError) return this.executionFailure(result.graphId, null, "commit_rejected", commitError);
    return result;
  }

  executeGameplayBinding(
    bindingId: string,
    context: Omit<GameplayExecutionContext, "tick"> & { tick?: number },
  ): GameplayPlanResult {
    const result = this.gameplayInterpreter.planBinding(bindingId, { ...context, tick: context.tick ?? this._tick });
    if (!result.ok) {
      this.executionFailure(result.graphId, result.nodeId, result.code, result.message);
      return result;
    }
    const commitError = this.commitGameplayOperations(result.operations);
    if (commitError) return this.executionFailure(result.graphId, null, "commit_rejected", commitError);
    return result;
  }

  planGameplayGraph(graphId: string, playerId: PlayerId): GameplayPlanResult {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { ok: false, graphId, code: "primitive_error", message: `Gracz ${playerId} nie jest aktywny.`, nodeId: null, trace: [], stepsUsed: 0 };
    }
    const target = this.monsters.filter((monster) => monster.alive).sort((left, right) => left.entityId.localeCompare(right.entityId))[0];
    return this.gameplayInterpreter.planGraph(graphId, {
      domain: "ability",
      entryPointId: `studio.test.${graphId}`,
      sourceEntityId: player.entityId,
      ownerPlayerId: player.playerId,
      abilityId: player.abilityId,
      providedTargetEntityId: target?.entityId ?? null,
      tick: this._tick,
    });
  }

  private gameplaySourceAlive(environment: GameplayPrimitiveEnvironment): boolean {
    return this.actors.get(environment.context.sourceEntityId)?.alive === true;
  }

  private gameplayCooldownReady(environment: GameplayPrimitiveEnvironment): boolean {
    const source = this.actors.get(environment.context.sourceEntityId);
    return source !== undefined && source.alive && this._tick >= source.cooldownUntilTick;
  }

  private gameplaySelectNearestHostile(environment: GameplayPrimitiveEnvironment, parameters: GameplayParameters): readonly string[] {
    const source = this.actors.get(environment.context.sourceEntityId);
    if (!source || !source.alive) return [];
    const ability = environment.context.abilityId ? this.abilities.get(environment.context.abilityId) : undefined;
    const configuredRange = typeof parameters.rangeTiles === "number" ? parameters.rangeTiles : ability?.rangeTiles ?? 0;
    const minimumFacing = typeof parameters.minimumFacing === "number" ? parameters.minimumFacing : 0.2;
    const candidates = this.actors.values()
      .filter((target) => target.alive && target.floorId === source.floorId && target.kind !== source.kind)
      .map((target) => {
        const dx = target.position.x - source.position.x;
        const dy = target.position.y - source.position.y;
        const targetDistance = Math.hypot(dx, dy);
        const direction = normalizeVector(dx, dy);
        const facingScore = isPlayer(source) ? direction.x * source.facing.x + direction.y * source.facing.y : 1;
        const preferred = target.entityId === environment.context.providedTargetEntityId ? 1 : 0;
        return { target, targetDistance, facingScore, preferred };
      })
      .filter((entry) => entry.targetDistance <= configuredRange + entry.target.radius + source.radius && entry.facingScore >= minimumFacing)
      .sort((left, right) => right.preferred - left.preferred || right.facingScore - left.facingScore || left.targetDistance - right.targetDistance || left.target.entityId.localeCompare(right.target.entityId));
    return candidates[0] ? [candidates[0].target.entityId] : [];
  }

  private validateGameplayOperations(operations: readonly GameplayOperation[]): string | null {
    for (const operation of operations) {
      const source = this.actors.get(operation.sourceEntityId);
      if (!source) return `Operacja ${operation.primitiveId} wskazuje nieznane źródło ${operation.sourceEntityId}.`;
      if (operation.abilityId && !this.abilities.has(operation.abilityId)) return `Operacja ${operation.primitiveId} wskazuje nieznaną umiejętność ${operation.abilityId}.`;
      for (const targetId of operation.targetEntityIds) if (!this.actors.has(targetId)) return `Operacja ${operation.primitiveId} wskazuje nieznany cel ${targetId}.`;
      if ((operation.primitiveId === "effect.damage-fixed" || operation.primitiveId === "effect.heal-fixed" || operation.primitiveId === "effect.add-threat-fixed")
        && (typeof operation.parameters.amount !== "number" || !Number.isFinite(operation.parameters.amount) || operation.parameters.amount < 0)) {
        return `Operacja ${operation.primitiveId} wymaga nieujemnego parametru amount.`;
      }
      if (operation.primitiveId === "effect.damage-from-ability" && !operation.abilityId) return "Damage from ability wymaga abilityId.";
    }
    return null;
  }

  private commitGameplayOperations(operations: readonly GameplayOperation[]): string | null {
    const validationError = this.validateGameplayOperations(operations);
    if (validationError) return validationError;
    for (const operation of operations) {
      const source = this.actors.require(operation.sourceEntityId);
      switch (operation.primitiveId) {
        case "action.start-ability-cooldown": {
          const ability = operation.abilityId ? this.abilities.get(operation.abilityId) : undefined;
          if (!ability) return `Brak umiejętności dla cooldownu ${operation.abilityId ?? "null"}.`;
          source.cooldownUntilTick = this._tick + ability.cooldownTicks;
          break;
        }
        case "action.start-miss-cooldown": {
          const ability = operation.abilityId ? this.abilities.get(operation.abilityId) : undefined;
          if (!ability) return `Brak umiejętności dla miss cooldownu ${operation.abilityId ?? "null"}.`;
          source.cooldownUntilTick = this._tick + Math.max(3, Math.floor(ability.cooldownTicks / 4));
          break;
        }
        case "action.emit-ability-used": {
          const targetEntityId = operation.targetEntityIds[0];
          if (targetEntityId && operation.abilityId) this.emitGameplayEvent({ type: "ability.used", tick: this._tick, sourceEntityId: source.entityId, targetEntityId, abilityId: operation.abilityId });
          break;
        }
        case "action.increment-quest-credit": {
          const amount = typeof operation.parameters.amount === "number" ? Math.max(0, Math.floor(operation.parameters.amount)) : 1;
          this._teamQuestKillCredits += amount;
          for (const player of this.players) player.questKillCredits = this._teamQuestKillCredits;
          break;
        }
        case "effect.damage-from-ability": {
          const ability = operation.abilityId ? this.abilities.get(operation.abilityId) : undefined;
          if (!ability) return `Brak umiejętności dla efektu obrażeń ${operation.abilityId ?? "null"}.`;
          for (const targetEntityId of operation.targetEntityIds) this.applyDamage({ sourceEntityId: source.entityId, ownerPlayerId: operation.ownerPlayerId, targetEntityId, abilityId: ability.id, effectId: operation.primitiveId, cause: "ability", tick: this._tick, amount: Math.max(0, Math.round(ability.power)) });
          break;
        }
        case "effect.damage-fixed": {
          const amount = Math.max(0, Math.round(operation.parameters.amount as number));
          for (const targetEntityId of operation.targetEntityIds) this.applyDamage({ sourceEntityId: source.entityId, ownerPlayerId: operation.ownerPlayerId, targetEntityId, abilityId: operation.abilityId ?? "ability.system", effectId: operation.primitiveId, cause: operation.abilityId ? "ability" : "environment", tick: this._tick, amount });
          break;
        }
        case "effect.heal-fixed": {
          const amount = Math.max(0, Math.round(operation.parameters.amount as number));
          for (const targetEntityId of operation.targetEntityIds) {
            const target = this.actors.require(targetEntityId);
            if (target.alive) target.hp = Math.min(target.maxHp, target.hp + amount);
          }
          break;
        }
        case "effect.add-threat-fixed": {
          if (!operation.ownerPlayerId) break;
          const amount = Math.max(0, operation.parameters.amount as number);
          for (const targetEntityId of operation.targetEntityIds) {
            const target = this.actors.require(targetEntityId);
            if (isMonster(target)) target.threatByPlayer[operation.ownerPlayerId] = quantize((target.threatByPlayer[operation.ownerPlayerId] ?? 0) + amount);
          }
          break;
        }
        default: return `Runtime nie obsługuje operacji ${operation.primitiveId}.`;
      }
    }
    return null;
  }

  private executionFailure(graphId: string, nodeId: string | null, code: string, message: string): GameplayPlanResult {
    this.events.emit({ type: "gameplay.execution_failed", tick: this._tick, graphId, nodeId, code, message });
    return { ok: false, graphId, nodeId, code: code as Extract<GameplayPlanResult, { ok: false }>["code"], message, trace: [], stepsUsed: 0 };
  }

  private emitGameplayEvent(event: GameplayEvent): void {
    this.events.emit(event);
    const triggerEvent = this.asTriggerEvent(event.type);
    if (!triggerEvent || this.activeTriggerEvents.has(triggerEvent)) return;
    const triggerContext = this.triggerContext(event);
    if (!triggerContext) return;
    this.activeTriggerEvents.add(triggerEvent);
    try {
      for (const planned of this.gameplayInterpreter.planEvent(triggerEvent, triggerContext)) {
        if (!planned.result.ok) {
          this.events.emit({ type: "gameplay.execution_failed", tick: this._tick, graphId: planned.result.graphId, nodeId: planned.result.nodeId, code: planned.result.code, message: `Trigger ${planned.triggerId}: ${planned.result.message}` });
          continue;
        }
        const error = this.commitGameplayOperations(planned.result.operations);
        if (error) this.events.emit({ type: "gameplay.execution_failed", tick: this._tick, graphId: planned.result.graphId, nodeId: null, code: "commit_rejected", message: `Trigger ${planned.triggerId}: ${error}` });
      }
    } finally {
      this.activeTriggerEvents.delete(triggerEvent);
    }
  }

  private asTriggerEvent(type: GameplayEvent["type"]): GameplayTriggerEvent | null {
    switch (type) {
      case "ability.used":
      case "damage.applied":
      case "actor.died":
      case "actor.respawned":
      case "player.joined":
      case "player.left":
      case "party.floor_changed": return type;
      default: return null;
    }
  }

  private triggerContext(event: GameplayEvent): Omit<GameplayExecutionContext, "domain" | "entryPointId" | "eventType"> | null {
    if (event.type === "ability.used") {
      const source = this.actors.get(event.sourceEntityId);
      return { sourceEntityId: event.sourceEntityId, ownerPlayerId: source && isPlayer(source) ? source.playerId : null, abilityId: event.abilityId, providedTargetEntityId: event.targetEntityId, tick: event.tick };
    }
    if (event.type === "damage.applied") return { sourceEntityId: event.context.sourceEntityId, ownerPlayerId: event.context.ownerPlayerId, abilityId: event.context.abilityId, providedTargetEntityId: event.context.targetEntityId, tick: event.context.tick };
    if (event.type === "actor.died") return { sourceEntityId: event.killerEntityId, ownerPlayerId: event.ownerPlayerId, abilityId: null, providedTargetEntityId: event.entityId, tick: event.tick };
    if (event.type === "actor.respawned") {
      const actor = this.actors.get(event.entityId);
      return { sourceEntityId: event.entityId, ownerPlayerId: actor && isPlayer(actor) ? actor.playerId : null, abilityId: null, providedTargetEntityId: event.entityId, tick: event.tick };
    }
    if (event.type === "player.joined" || event.type === "player.left") return { sourceEntityId: event.entityId, ownerPlayerId: event.playerId, abilityId: null, providedTargetEntityId: null, tick: event.tick };
    if (event.type === "party.floor_changed") {
      const initiatingPlayer = event.triggeringPlayerIds.length > 0 ? this.getPlayer(event.triggeringPlayerIds[0]!) : undefined;
      const fallbackPlayer = this.players[0];
      const source = initiatingPlayer ?? fallbackPlayer;
      return source ? { sourceEntityId: source.entityId, ownerPlayerId: null, abilityId: null, providedTargetEntityId: null, tick: event.tick } : null;
    }
    return null;
  }

  private applyDamage(context: DamageContext): void {
    const target = this.actors.get(context.targetEntityId);
    if (!target || !target.alive || target.floorId !== this._activeFloorId) return;
    if (isMonster(target) && context.ownerPlayerId) {
      target.threatByPlayer[context.ownerPlayerId] = quantize((target.threatByPlayer[context.ownerPlayerId] ?? 0) + context.amount);
    }
    target.hp = Math.max(0, target.hp - context.amount);
    this.emitGameplayEvent({ type: "damage.applied", context, remainingHp: target.hp });
    if (target.hp > 0) return;
    target.alive = false;
    const authoredRespawnTicks = isMonster(target) && target.sourceSpawnId
      ? this.spawnDefinitionById.get(target.sourceSpawnId)?.respawnTicks
      : undefined;
    target.respawnAtTick = this._tick + (authoredRespawnTicks ?? this.respawnDelayTicks);
    if (isPlayer(target)) target.deaths += 1;
    this.emitGameplayEvent({ type: "actor.died", tick: this._tick, entityId: target.entityId, killerEntityId: context.sourceEntityId, ownerPlayerId: context.ownerPlayerId });
    if (isMonster(target)) this.awardMonsterRewards(target, context.ownerPlayerId);
  }

  private awardMonsterRewards(monster: MonsterActor, killerPlayerId: PlayerId | null): void {
    const eligible = this.players
      .filter((player) => player.floorId === monster.floorId && distance(player.position, monster.position) <= this.rewardRadiusTiles)
      .map((player) => player.playerId)
      .sort();
    if (killerPlayerId && this.getPlayer(killerPlayerId)?.floorId === monster.floorId && !eligible.includes(killerPlayerId)) eligible.push(killerPlayerId);
    eligible.sort();
    if (eligible.length === 0) {
      this.dropRng.nextUint32();
      return;
    }
    const totalXp = Math.max(1, Math.round(monster.maxHp * 1.2));
    const totalGold = Math.max(1, Math.round(monster.maxHp / 8));
    const xpShares = allocateIntegerShares(totalXp, eligible, killerPlayerId);
    const goldShares = allocateIntegerShares(totalGold, eligible, killerPlayerId);
    const lootRecipientPlayerId = killerPlayerId && eligible.includes(killerPlayerId) ? killerPlayerId : eligible[0] ?? null;
    this.dropRng.nextUint32(); // reserved deterministic roll for future item definition selection
    const shares = eligible.map((playerId) => {
      const player = this.getPlayer(playerId);
      if (!player) throw new Error(`Brak gracza ${playerId} podczas przyznawania nagrody.`);
      const xp = xpShares.get(playerId) ?? 0;
      const gold = goldShares.get(playerId) ?? 0;
      player.xp += xp;
      player.gold += gold;
      player.questKillCredits = this._teamQuestKillCredits;
      if (playerId === killerPlayerId) player.kills += 1;
      if (playerId === lootRecipientPlayerId) player.lootCount += 1;
      return { playerId, xp, gold, questCredit: true };
    });
    this.emitGameplayEvent({
      type: "rewards.awarded",
      tick: this._tick,
      defeatedEntityId: monster.entityId,
      killerPlayerId,
      shares,
      lootRecipientPlayerId,
      teamQuestKillCredits: this._teamQuestKillCredits,
    });
  }

  private moveActor(actor: RuntimeActor, inputX: number, inputY: number): void {
    if (!actor.alive || actor.floorId !== this._activeFloorId) return;
    const direction = normalizeVector(inputX, inputY);
    if (direction.x === 0 && direction.y === 0) return;
    const distancePerTick = actor.moveSpeedTilesPerSecond / this.tickRate;
    const targetX = quantize(actor.position.x + direction.x * distancePerTick);
    const targetY = quantize(actor.position.y + direction.y * distancePerTick);
    if (this.collision.isCircleWalkable(targetX, actor.position.y, actor.radius)) actor.position.x = targetX;
    if (this.collision.isCircleWalkable(actor.position.x, targetY, actor.radius)) actor.position.y = targetY;
  }

  private enforcePartyTether(): void {
    const players = this.players.filter((player) => player.alive && player.floorId === this._activeFloorId);
    if (players.length < 2) return;
    for (let leftIndex = 0; leftIndex < players.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < players.length; rightIndex += 1) {
        const left = players[leftIndex]!;
        const right = players[rightIndex]!;
        const dx = right.position.x - left.position.x;
        const dy = right.position.y - left.position.y;
        const currentDistance = Math.hypot(dx, dy);
        if (currentDistance <= this.softTetherTiles || currentDistance < 0.000001) continue;
        const direction = { x: dx / currentDistance, y: dy / currentDistance };
        const desiredDistance = currentDistance > this.hardTetherTiles
          ? this.hardTetherTiles
          : Math.max(this.softTetherTiles, currentDistance - Math.min(0.22, (currentDistance - this.softTetherTiles) * 0.12));
        const correction = (currentDistance - desiredDistance) / 2;
        const leftCandidate = { x: quantize(left.position.x + direction.x * correction), y: quantize(left.position.y + direction.y * correction) };
        const rightCandidate = { x: quantize(right.position.x - direction.x * correction), y: quantize(right.position.y - direction.y * correction) };
        if (this.collision.isCircleWalkable(leftCandidate.x, leftCandidate.y, left.radius)) left.position = leftCandidate;
        else left.position = cloneVec(left.previousPosition);
        if (this.collision.isCircleWalkable(rightCandidate.x, rightCandidate.y, right.radius)) right.position = rightCandidate;
        else right.position = cloneVec(right.previousPosition);
      }
    }
  }

  maximumPlayerDistance(): number {
    const players = this.players.filter((player) => player.floorId === this._activeFloorId);
    let maximum = 0;
    for (let left = 0; left < players.length; left += 1) {
      for (let right = left + 1; right < players.length; right += 1) maximum = Math.max(maximum, distance(players[left]!.position, players[right]!.position));
    }
    return quantize(maximum);
  }

  private transitionCellKey(floorId: string, x: number, y: number): string {
    return `${floorId}:${x}:${y}`;
  }

  private resolveEnteredWorldTransition(): void {
    if (this.transitionBySourceCell.size === 0) return;
    const candidates = new Map<string, { transition: WorldTransitionDefinition; playerIds: PlayerId[] }>();
    for (const player of this.players) {
      if (!player.alive || player.floorId !== this._activeFloorId) continue;
      const previousX = Math.floor(player.previousPosition.x);
      const previousY = Math.floor(player.previousPosition.y);
      const currentX = Math.floor(player.position.x);
      const currentY = Math.floor(player.position.y);
      if (previousX === currentX && previousY === currentY) continue;
      const transition = this.transitionBySourceCell.get(this.transitionCellKey(this._activeFloorId, currentX, currentY));
      if (!transition) continue;
      const candidate = candidates.get(transition.id) ?? { transition, playerIds: [] };
      candidate.playerIds.push(player.playerId);
      candidates.set(transition.id, candidate);
    }
    const ordered = [...candidates.values()].sort((left, right) => left.transition.id.localeCompare(right.transition.id));
    const chosen = ordered[0];
    if (!chosen) return;
    const triggeringPlayerIds = [...new Set(ordered.flatMap((candidate) => candidate.playerIds))].sort();
    if (ordered.length > 1) {
      this.emitGameplayEvent({
        type: "party.transition_conflict",
        tick: this._tick,
        candidateTransitionIds: ordered.map((candidate) => candidate.transition.id),
        chosenTransitionId: chosen.transition.id,
        triggeringPlayerIds,
      });
    }
    this.relocateParty(
      chosen.transition.destination.floorId,
      { x: chosen.transition.destination.x + 0.5, y: chosen.transition.destination.y + 0.5 },
      true,
      chosen.transition.id,
      chosen.playerIds.sort(),
    );
  }

  transitionParty(floorId: string, anchor?: Vec2): void {
    this.relocateParty(floorId, anchor, false, null, []);
  }

  private relocateParty(floorId: string, anchor: Vec2 | undefined, avoidAnchor: boolean, transitionId: string | null, triggeringPlayerIds: PlayerId[]): void {
    if (floorId === this._activeFloorId) return;
    const nextFloor = this.runtimeProject.floors.get(floorId);
    if (!nextFloor) throw new Error(`Nie istnieje piętro ${floorId}.`);
    this.deactivateAllSpawnActors();
    const previousFloorId = this._activeFloorId;
    this._activeFloorId = floorId;
    this.floor = nextFloor;
    this.collision = new CollisionGrid(nextFloor, this.runtimeProject.project.world.tiles);
    const defaultAnchor = anchor ?? {
      x: this.runtimeProject.project.manifest.playerStart.x + 0.5,
      y: this.runtimeProject.project.manifest.playerStart.y + 0.5,
    };
    const center = this.collision.isCircleWalkable(defaultAnchor.x, defaultAnchor.y, 0.32)
      ? defaultAnchor
      : this.collision.findNearestWalkable(defaultAnchor);
    const occupied = new Set<string>();
    for (const [index, player] of this.players.entries()) {
      const preferredDistance = avoidAnchor ? 1 : index === 0 ? 0 : 1;
      const position = this.collision.findNearestWalkable(center, preferredDistance, occupied);
      occupied.add(`${Math.floor(position.x)},${Math.floor(position.y)}`);
      player.floorId = floorId;
      player.position = cloneVec(position);
      player.previousPosition = cloneVec(position);
      player.spawnPosition = cloneVec(position);
    }
    this.reconcileSpawnLifecycle();
    this.emitGameplayEvent({ type: "party.floor_changed", tick: this._tick, transitionId, fromFloorId: previousFloorId, toFloorId: floorId, playerIds: this.players.map((player) => player.playerId), triggeringPlayerIds: [...triggeringPlayerIds] });
  }

  private respawnPlayer(player: PlayerActor): void {
    player.position = cloneVec(player.spawnPosition);
    player.previousPosition = cloneVec(player.spawnPosition);
    player.hp = player.maxHp;
    player.alive = true;
    player.cooldownUntilTick = this._tick + 10;
    player.respawnAtTick = 0;
    this.emitGameplayEvent({ type: "actor.respawned", tick: this._tick, entityId: player.entityId });
  }

  private respawnMonster(monster: MonsterActor): void {
    monster.position = cloneVec(monster.homePosition);
    monster.previousPosition = cloneVec(monster.homePosition);
    monster.hp = monster.maxHp;
    monster.alive = true;
    monster.cooldownUntilTick = this._tick + 10;
    monster.respawnAtTick = 0;
    monster.targetPlayerId = null;
    monster.threatByPlayer = {};
    this.emitGameplayEvent({ type: "actor.respawned", tick: this._tick, entityId: monster.entityId });
  }

  summary(): GameWorldSummary {
    const players = this.players.map((player) => ({
      playerId: player.playerId,
      entityId: player.entityId,
      slotId: player.slotId,
      hp: player.hp,
      maxHp: player.maxHp,
      alive: player.alive,
      xp: player.xp,
      gold: player.gold,
      lootCount: player.lootCount,
      kills: player.kills,
      questKillCredits: player.questKillCredits,
    }));
    const primary = players[0];
    if (!primary) throw new Error("Brak gracza podczas tworzenia podsumowania.");
    return {
      tick: this._tick,
      activeFloorId: this._activeFloorId,
      playerEntityId: primary.entityId,
      playerHp: primary.hp,
      playerMaxHp: primary.maxHp,
      players,
      livingMonsters: this.monsters.filter((monster) => monster.alive && monster.floorId === this._activeFloorId).length,
      spawnDiagnostics: this.spawnDiagnostics(),
      teamQuestKillCredits: this._teamQuestKillCredits,
      maximumPlayerDistance: this.maximumPlayerDistance(),
      stateChecksum: this.stateChecksum(),
    };
  }

  createSaveSnapshot(): GameSaveSnapshotV3 {
    this.syncAllSpawnStatesFromActors();
    return {
      format: "coopege-save",
      schemaVersion: 3,
      projectChecksum: this.projectChecksum,
      tick: this._tick,
      activeFloorId: this._activeFloorId,
      simulationRngState: this.simulationRng.snapshot(),
      dropRngState: this.dropRng.snapshot(),
      nextEntitySequence: this.allocator.snapshot(),
      teamQuestKillCredits: this._teamQuestKillCredits,
      playerSlots: this.playerSlots,
      actors: this.actors.values().map((actor) => this.actorToSaveRecord(actor)),
      spawnStates: [...this.spawnStates.values()].map(cloneSpawnRuntimeState).sort((left, right) => left.instanceId.localeCompare(right.instanceId)),
    };
  }

  loadSaveSnapshot(snapshot: GameSaveSnapshot): void {
    const migratedV2 = snapshot.schemaVersion === 1 ? this.migrateSaveV1(snapshot) : snapshot;
    const migrated = migratedV2.schemaVersion === 2 ? this.migrateSaveV2(migratedV2) : migratedV2;
    if (migrated.format !== "coopege-save" || migrated.schemaVersion !== 3) throw new Error("Nieobsługiwana wersja zapisu gry.");
    if (migrated.projectChecksum !== this.projectChecksum) throw new Error("Zapis gry pochodzi z innego snapshotu projektu.");
    const floor = this.runtimeProject.floors.get(migrated.activeFloorId);
    if (!floor) throw new Error(`Zapis wskazuje nieistniejące piętro ${migrated.activeFloorId}.`);
    if (!Number.isInteger(migrated.tick) || migrated.tick < 0) throw new Error("Nieprawidłowy tick zapisu gry.");
    if (!Number.isInteger(migrated.simulationRngState) || migrated.simulationRngState < 0 || migrated.simulationRngState > 0xffff_ffff) throw new Error("Nieprawidłowy stan simulation RNG w zapisie.");
    if (!Number.isInteger(migrated.dropRngState) || migrated.dropRngState < 0 || migrated.dropRngState > 0xffff_ffff) throw new Error("Nieprawidłowy stan drop RNG w zapisie.");
    if (!Number.isInteger(migrated.nextEntitySequence) || migrated.nextEntitySequence < 1) throw new Error("Nieprawidłowa sekwencja encji w zapisie.");
    if (!Number.isInteger(migrated.teamQuestKillCredits) || migrated.teamQuestKillCredits < 0) throw new Error("Nieprawidłowy licznik questów drużyny w zapisie.");
    if (!Array.isArray(migrated.actors) || !Array.isArray(migrated.playerSlots) || !Array.isArray(migrated.spawnStates)) throw new Error("Zapis gry nie zawiera wymaganych kolekcji.");
    if (migrated.actors.some((record) => record.kind !== "player" && record.kind !== "monster")) throw new Error("Zapis zawiera nieznany rodzaj aktora.");

    const collisionByFloor = new Map([...this.runtimeProject.floors].map(([id, prepared]) => [id, new CollisionGrid(prepared, this.runtimeProject.project.world.tiles)]));
    const requireFinite = (label: string, values: readonly number[]): void => {
      if (values.some((value) => !Number.isFinite(value))) throw new Error(`${label} zawiera wartość niefinitywną.`);
    };
    const requireNonNegativeIntegers = (label: string, values: readonly number[]): void => {
      if (values.some((value) => !Number.isInteger(value) || value < 0)) throw new Error(`${label} zawiera nieprawidłową liczbę całkowitą.`);
    };

    const canonicalStates = new Map(this.spawnStates);
    if (migrated.spawnStates.length !== canonicalStates.size) {
      throw new Error(`Zapis zawiera ${migrated.spawnStates.length} instancji spawnów, projekt wymaga ${canonicalStates.size}.`);
    }
    const restoredStates = new Map<string, SpawnRuntimeState>();
    for (const saved of migrated.spawnStates) {
      if (restoredStates.has(saved.instanceId)) throw new Error(`Duplikat instancji spawnu ${saved.instanceId} w zapisie.`);
      const canonical = canonicalStates.get(saved.instanceId);
      if (!canonical) throw new Error(`Zapis zawiera osieroconą instancję spawnu ${saved.instanceId}.`);
      if (saved.spawnId !== canonical.spawnId
        || saved.instanceIndex !== canonical.instanceIndex
        || saved.floorId !== canonical.floorId
        || saved.monsterId !== canonical.monsterId
        || saved.authoredX !== canonical.authoredX
        || saved.authoredY !== canonical.authoredY
        || saved.homeX !== canonical.homeX
        || saved.homeY !== canonical.homeY) {
        throw new Error(`Niezgodna tożsamość instancji spawnu ${saved.instanceId}.`);
      }
      if (!(["sleeping", "active", "respawning"] as const).includes(saved.status)) throw new Error(`Nieprawidłowy status instancji spawnu ${saved.instanceId}.`);
      if (!Number.isInteger(saved.instanceIndex) || saved.instanceIndex < 0) throw new Error(`Nieprawidłowy indeks instancji spawnu ${saved.instanceId}.`);
      requireFinite(`Spawn ${saved.instanceId}`, [saved.authoredX, saved.authoredY, saved.homeX, saved.homeY, saved.x, saved.y, saved.previousX, saved.previousY, saved.hp]);
      requireNonNegativeIntegers(`Spawn ${saved.instanceId}`, [saved.cooldownUntilTick, saved.respawnAtTick]);
      const savedCollision = collisionByFloor.get(saved.floorId);
      if (!savedCollision) throw new Error(`Spawn ${saved.instanceId} wskazuje nieistniejące piętro ${saved.floorId}.`);
      if (!savedCollision.isCircleWalkable(saved.x, saved.y, 0.28) || !savedCollision.isCircleWalkable(saved.homeX, saved.homeY, 0.28)) {
        throw new Error(`Spawn ${saved.instanceId} znajduje się poza walkowalnym światem.`);
      }
      const threatPlayers = new Set<string>();
      for (const entry of saved.threatByPlayer) {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || !Number.isFinite(entry[1]) || entry[1] < 0) throw new Error(`Spawn ${saved.instanceId} ma nieprawidłowy threat.`);
        if (threatPlayers.has(entry[0])) throw new Error(`Spawn ${saved.instanceId} ma duplikat threat dla ${entry[0]}.`);
        threatPlayers.add(entry[0]);
      }
      if (!Number.isFinite(saved.hp) || saved.hp < 0 || saved.hp > this.monsterDefinition(saved.monsterId).maxHp) {
        throw new Error(`Nieprawidłowe HP instancji spawnu ${saved.instanceId}.`);
      }
      const expectedEntityId = createSpawnEntityId(saved.instanceId);
      if (saved.activeEntityId !== null && saved.activeEntityId !== expectedEntityId) {
        throw new Error(`Niestabilne ID aktywnego aktora dla ${saved.instanceId}.`);
      }
      if (saved.status === "sleeping" && saved.activeEntityId !== null) throw new Error(`Uśpiony spawn ${saved.instanceId} nie może mieć aktywnego aktora.`);
      if (saved.status === "active" && saved.activeEntityId === null) throw new Error(`Aktywny spawn ${saved.instanceId} nie ma aktora.`);
      if (saved.status === "active" && saved.hp <= 0) throw new Error(`Aktywny spawn ${saved.instanceId} ma zerowe HP.`);
      if (saved.status === "respawning" && saved.hp !== 0) throw new Error(`Respawnujący spawn ${saved.instanceId} musi mieć zerowe HP.`);
      restoredStates.set(saved.instanceId, cloneSpawnRuntimeState(saved));
    }

    const playerRecords = migrated.actors.filter((record) => record.kind === "player");
    const monsterRecords = migrated.actors.filter((record) => record.kind === "monster");
    const targetCollision = collisionByFloor.get(migrated.activeFloorId)!;
    const actorEntityIds = new Set<string>();
    for (const record of migrated.actors) {
      if (typeof record.entityId !== "string" || record.entityId.length === 0) throw new Error("Aktor zapisu nie ma poprawnego entityId.");
      if (actorEntityIds.has(record.entityId)) throw new Error(`Duplikat entityId ${record.entityId} w zapisie.`);
      actorEntityIds.add(record.entityId);
      requireFinite(`Aktor ${record.entityId}`, [record.x, record.y, record.previousX, record.previousY, record.radius, record.hp, record.maxHp, record.moveSpeedTilesPerSecond]);
      requireNonNegativeIntegers(`Aktor ${record.entityId}`, [record.cooldownUntilTick, record.respawnAtTick]);
      if (record.radius <= 0 || record.radius > 2 || record.maxHp <= 0 || record.hp < 0 || record.hp > record.maxHp || record.moveSpeedTilesPerSecond < 0) throw new Error(`Aktor ${record.entityId} ma nieprawidłowe statystyki bazowe.`);
      if (typeof record.abilityId !== "string" || !this.abilities.has(record.abilityId)) throw new Error(`Aktor ${record.entityId} wskazuje nieznaną umiejętność ${record.abilityId}.`);
    }

    for (const record of playerRecords) {
      if (record.floorId !== migrated.activeFloorId) throw new Error(`Gracz ${record.entityId} nie znajduje się na aktywnym piętrze zapisu.`);
      if (!record.playerId || !record.classId || !record.slotId) throw new Error(`Niekompletny rekord gracza ${record.entityId}.`);
      if (!this.runtimeProject.project.content.classes.some((entry) => entry.id === record.classId)) throw new Error(`Gracz ${record.entityId} wskazuje nieznaną klasę ${record.classId}.`);
      requireFinite(`Gracz ${record.entityId}`, [record.facingX, record.facingY, record.spawnX, record.spawnY]);
      requireNonNegativeIntegers(`Gracz ${record.entityId}`, [record.deaths, record.xp, record.gold, record.lootCount, record.kills, record.questKillCredits]);
      if (!targetCollision.isCircleWalkable(record.x, record.y, record.radius) || !targetCollision.isCircleWalkable(record.spawnX, record.spawnY, record.radius)) {
        throw new Error(`Gracz ${record.entityId} znajduje się poza walkowalnym światem.`);
      }
    }

    const restoredPlayers = playerRecords.map((record) => this.saveRecordToActor(record)).filter(isPlayer);
    if (restoredPlayers.length < 1) throw new Error("Zapis lokalnej sesji musi zawierać co najmniej jednego gracza.");
    const playerIds = new Set<PlayerId>();
    const slotIds = new Set<PlayerSlotId>();
    for (const player of restoredPlayers) {
      if (playerIds.has(player.playerId)) throw new Error(`Duplikat playerId ${player.playerId} w zapisie.`);
      if (slotIds.has(player.slotId)) throw new Error(`Duplikat slotId ${player.slotId} w zapisie.`);
      playerIds.add(player.playerId);
      slotIds.add(player.slotId);
    }

    for (const state of restoredStates.values()) {
      if (state.targetPlayerId !== null && !playerIds.has(state.targetPlayerId)) throw new Error(`Spawn ${state.instanceId} wskazuje nieistniejący cel ${state.targetPlayerId}.`);
      for (const [playerId] of state.threatByPlayer) if (!playerIds.has(playerId)) throw new Error(`Spawn ${state.instanceId} zawiera threat nieistniejącego gracza ${playerId}.`);
    }

    const expectedActiveIds = new Set([...restoredStates.values()].flatMap((state) => state.activeEntityId ? [state.activeEntityId] : []));
    const savedMonsterIds = new Set<string>();
    for (const record of monsterRecords) {
      if (!record.spawnInstanceId) throw new Error(`Aktywny potwór ${record.entityId} nie ma spawnInstanceId.`);
      if (savedMonsterIds.has(record.entityId)) throw new Error(`Duplikat aktywnego potwora ${record.entityId} w zapisie.`);
      savedMonsterIds.add(record.entityId);
      const state = restoredStates.get(record.spawnInstanceId);
      if (!state || state.activeEntityId !== record.entityId) throw new Error(`Aktor ${record.entityId} nie zgadza się ze stanem spawnu ${record.spawnInstanceId}.`);
      if (record.floorId !== state.floorId || record.definitionId !== state.monsterId || record.sourceSpawnId !== state.spawnId
        || record.x !== state.x || record.y !== state.y || record.previousX !== state.previousX || record.previousY !== state.previousY
        || record.hp !== state.hp || record.alive !== (state.status !== "respawning")) {
        throw new Error(`Aktor ${record.entityId} ma dane sprzeczne z kanonicznym stanem spawnu.`);
      }
    }
    if (savedMonsterIds.size !== expectedActiveIds.size || [...expectedActiveIds].some((entityId) => !savedMonsterIds.has(entityId))) {
      throw new Error("Lista aktywnych aktorów nie zgadza się z kanonicznym stanem spawnów.");
    }

    const allowedDeviceKinds = new Set<InputDeviceKind>(["keyboard-mouse", "keyboard", "gamepad", "virtual"]);
    const preparedSlots = new Map<PlayerSlotId, PlayerSlotAssignment>();
    for (const slot of migrated.playerSlots) {
      if (!slot || typeof slot.slotId !== "string" || typeof slot.playerId !== "string" || !allowedDeviceKinds.has(slot.deviceKind)) throw new Error("Zapis zawiera nieprawidłowy slot gracza.");
      if (preparedSlots.has(slot.slotId)) throw new Error(`Duplikat slotId ${slot.slotId} w playerSlots.`);
      if (slot.deviceIndex !== null && (!Number.isInteger(slot.deviceIndex) || slot.deviceIndex < 0)) throw new Error(`Slot ${slot.slotId} ma nieprawidłowy deviceIndex.`);
      if (slot.joined && !playerIds.has(slot.playerId)) throw new Error(`Dołączony slot ${slot.slotId} nie ma aktora gracza ${slot.playerId}.`);
      preparedSlots.set(slot.slotId, { ...slot });
    }
    for (const player of restoredPlayers) {
      const slot = preparedSlots.get(player.slotId);
      if (!slot || !slot.joined || slot.playerId !== player.playerId) throw new Error(`Niespójny slot ${player.slotId} gracza ${player.playerId}.`);
    }

    // Prepare every entity before touching the live world. A rejected save must be atomic.
    const preparedActors = new EntityStore<RuntimeActor>();
    for (const player of restoredPlayers) preparedActors.add(player);
    for (const state of [...restoredStates.values()].sort((left, right) => left.instanceId.localeCompare(right.instanceId))) {
      if (!state.activeEntityId) continue;
      const definition = this.monsterDefinition(state.monsterId);
      const abilityId = definition.abilityIds[0];
      if (!abilityId || !this.abilities.has(abilityId)) throw new Error(`Potwór ${definition.id} nie ma poprawnej umiejętności podstawowej.`);
      preparedActors.add(this.createMonster(definition, abilityId, state));
    }

    this.actors.clear();
    this.playerEntityIds.clear();
    for (const actor of preparedActors.values()) {
      this.actors.add(actor);
      if (isPlayer(actor)) this.playerEntityIds.set(actor.playerId, actor.entityId);
    }
    this.spawnStates.clear();
    for (const state of [...restoredStates.values()].sort((left, right) => left.instanceId.localeCompare(right.instanceId))) this.spawnStates.set(state.instanceId, state);
    this.slots.clear();
    for (const [slotId, slot] of preparedSlots) this.slots.set(slotId, slot);
    this._tick = migrated.tick;
    this._activeFloorId = migrated.activeFloorId;
    this.floor = floor;
    this.collision = new CollisionGrid(floor, this.runtimeProject.project.world.tiles);
    this._teamQuestKillCredits = migrated.teamQuestKillCredits;
    this.simulationRng.restore(migrated.simulationRngState);
    this.dropRng.restore(migrated.dropRngState);
    this.allocator.restore(migrated.nextEntitySequence);
    this._cappedSpawnCount = 0;
    this.events.drain();
  }

  private migrateSaveV1(snapshot: GameSaveSnapshotV1): GameSaveSnapshotV2 {
    const playerRecords = snapshot.actors.filter((record) => record.kind === "player");
    if (playerRecords.length !== 1) throw new Error("Save v1 może zawierać dokładnie jednego gracza.");
    const playerId = playerRecords[0]!.playerId ?? PRIMARY_PLAYER_ID;
    return {
      ...snapshot,
      schemaVersion: 2,
      teamQuestKillCredits: 0,
      playerSlots: [{ slotId: PRIMARY_SLOT_ID, playerId, deviceKind: "keyboard-mouse", deviceIndex: null, joined: true }],
      actors: snapshot.actors.map((record) => ({
        ...record,
        slotId: record.kind === "player" ? PRIMARY_SLOT_ID : null,
        xp: 0,
        gold: 0,
        lootCount: 0,
        kills: 0,
        questKillCredits: 0,
        targetPlayerId: null,
        threatByPlayer: [],
      })),
    };
  }

  private migrateSaveV2(snapshot: GameSaveSnapshotV2): GameSaveSnapshotV3 {
    const states = [...this.spawnStates.values()].map(cloneSpawnRuntimeState).sort((left, right) => left.instanceId.localeCompare(right.instanceId));
    const claimed = new Set<string>();
    const migratedActors: ActorSaveRecordV3[] = [];

    for (const record of snapshot.actors) {
      if (record.kind === "player") {
        migratedActors.push({ ...record, spawnInstanceId: null });
        continue;
      }
      const candidates = states
        .filter((state) => !claimed.has(state.instanceId)
          && (record.sourceSpawnId ? state.spawnId === record.sourceSpawnId : state.monsterId === record.definitionId && state.floorId === record.floorId))
        .sort((left, right) => {
          const leftDistance = Math.hypot(left.homeX - record.homeX, left.homeY - record.homeY);
          const rightDistance = Math.hypot(right.homeX - record.homeX, right.homeY - record.homeY);
          return leftDistance - rightDistance || left.instanceId.localeCompare(right.instanceId);
        });
      const state = candidates[0];
      if (!state) continue;
      claimed.add(state.instanceId);
      state.x = quantize(record.x);
      state.y = quantize(record.y);
      state.previousX = quantize(record.previousX);
      state.previousY = quantize(record.previousY);
      state.hp = Math.max(0, Math.min(this.monsterDefinition(state.monsterId).maxHp, record.hp));
      state.cooldownUntilTick = record.cooldownUntilTick;
      state.respawnAtTick = record.respawnAtTick;
      state.targetPlayerId = record.targetPlayerId;
      state.threatByPlayer = record.threatByPlayer.map(([playerId, threat]) => [playerId, threat] as const);
      state.status = record.alive && state.hp > 0 ? "active" : "respawning";
      state.activeEntityId = createSpawnEntityId(state.instanceId);
      migratedActors.push({
        ...record,
        entityId: state.activeEntityId,
        floorId: state.floorId,
        x: state.x,
        y: state.y,
        previousX: state.previousX,
        previousY: state.previousY,
        alive: state.status === "active",
        hp: state.hp,
        maxHp: this.monsterDefinition(state.monsterId).maxHp,
        definitionId: state.monsterId,
        sourceSpawnId: state.spawnId,
        spawnInstanceId: state.instanceId,
        homeX: state.homeX,
        homeY: state.homeY,
      });
    }

    return {
      ...snapshot,
      schemaVersion: 3,
      actors: migratedActors.sort((left, right) => left.entityId.localeCompare(right.entityId)),
      spawnStates: states,
    };
  }

  stateChecksum(): string {
    return stableChecksum(this.createSaveSnapshot());
  }

  private actorToSaveRecord(actor: RuntimeActor): ActorSaveRecordV3 {
    const player = isPlayer(actor) ? actor : null;
    const monster = isMonster(actor) ? actor : null;
    return {
      entityId: actor.entityId,
      kind: actor.kind,
      floorId: actor.floorId,
      x: quantize(actor.position.x),
      y: quantize(actor.position.y),
      previousX: quantize(actor.previousPosition.x),
      previousY: quantize(actor.previousPosition.y),
      radius: actor.radius,
      alive: actor.alive,
      hp: actor.hp,
      maxHp: actor.maxHp,
      moveSpeedTilesPerSecond: actor.moveSpeedTilesPerSecond,
      abilityId: actor.abilityId,
      cooldownUntilTick: actor.cooldownUntilTick,
      respawnAtTick: actor.respawnAtTick,
      playerId: player?.playerId ?? null,
      slotId: player?.slotId ?? null,
      classId: player?.classId ?? null,
      facingX: player?.facing.x ?? 0,
      facingY: player?.facing.y ?? 0,
      spawnX: player?.spawnPosition.x ?? 0,
      spawnY: player?.spawnPosition.y ?? 0,
      deaths: player?.deaths ?? 0,
      xp: player?.xp ?? 0,
      gold: player?.gold ?? 0,
      lootCount: player?.lootCount ?? 0,
      kills: player?.kills ?? 0,
      questKillCredits: player?.questKillCredits ?? 0,
      definitionId: monster?.definitionId ?? null,
      sourceSpawnId: monster?.sourceSpawnId ?? null,
      spawnInstanceId: monster?.spawnInstanceId ?? null,
      homeX: monster?.homePosition.x ?? 0,
      homeY: monster?.homePosition.y ?? 0,
      aggroRangeTiles: monster?.aggroRangeTiles ?? 0,
      leashRangeTiles: monster?.leashRangeTiles ?? 0,
      targetPlayerId: monster?.targetPlayerId ?? null,
      threatByPlayer: monster ? sortedRecord(monster.threatByPlayer) : [],
    };
  }

  private saveRecordToActor(record: ActorSaveRecordV3): RuntimeActor {
    const common = {
      entityId: record.entityId,
      floorId: record.floorId,
      position: { x: record.x, y: record.y },
      previousPosition: { x: record.previousX, y: record.previousY },
      radius: record.radius,
      alive: record.alive,
      hp: record.hp,
      maxHp: record.maxHp,
      moveSpeedTilesPerSecond: record.moveSpeedTilesPerSecond,
      abilityId: record.abilityId,
      cooldownUntilTick: record.cooldownUntilTick,
      respawnAtTick: record.respawnAtTick,
    };
    if (record.kind === "player") {
      if (!record.playerId || !record.classId || !record.slotId) throw new Error(`Niekompletny rekord gracza ${record.entityId}.`);
      return {
        ...common,
        kind: "player",
        playerId: record.playerId,
        slotId: record.slotId,
        classId: record.classId,
        facing: { x: record.facingX, y: record.facingY },
        spawnPosition: { x: record.spawnX, y: record.spawnY },
        deaths: record.deaths,
        xp: record.xp,
        gold: record.gold,
        lootCount: record.lootCount,
        kills: record.kills,
        questKillCredits: record.questKillCredits,
      };
    }
    if (!record.definitionId || !record.spawnInstanceId) throw new Error(`Niekompletny rekord potwora ${record.entityId}.`);
    return {
      ...common,
      kind: "monster",
      definitionId: record.definitionId,
      sourceSpawnId: record.sourceSpawnId,
      spawnInstanceId: record.spawnInstanceId,
      homePosition: { x: record.homeX, y: record.homeY },
      aggroRangeTiles: record.aggroRangeTiles,
      leashRangeTiles: record.leashRangeTiles,
      targetPlayerId: record.targetPlayerId,
      threatByPlayer: Object.fromEntries(record.threatByPlayer),
    };
  }
}
