export type StableId = string;
export type FloorId = StableId;
export type TileId = StableId;
export type EntityDefinitionId = StableId;

export interface ProjectManifest {
  projectId: StableId;
  name: string;
  projectVersion: string;
  createdAt: string;
  updatedAt: string;
  defaultLocale: string;
  entryFloorId: FloorId;
  playerStart: {
    floorId: FloorId;
    x: number;
    y: number;
  };
}

export interface TileDefinition {
  id: TileId;
  name: string;
  walkable: boolean;
  blocksProjectiles: boolean;
  assetId?: StableId;
}

export interface TextureFrameLayout {
  /** Source-frame width in pixels. */
  frameWidth: number;
  /** Source-frame height in pixels. */
  frameHeight: number;
  /** Optional direction-to-row mapping for actors. */
  directionRows?: {
    down: number;
    left: number;
    right: number;
    up: number;
  };
  /** Frame used while the actor is idle. */
  idleFrame?: number;
  /** Ordered source columns used by the walk/loop animation. */
  animationFrames?: number[];
  /** Visual frame duration. This never drives gameplay simulation. */
  frameDurationMs?: number;
  /** Normalized point of the source sprite attached to the world position. */
  pivotX?: number;
  pivotY?: number;
  /** Rendered size in world tiles. */
  worldWidthTiles?: number;
  worldHeightTiles?: number;
}

export type RleRun = readonly [tileId: TileId, count: number];

export interface FloorDefinition {
  id: FloorId;
  name: string;
  width: number;
  height: number;
  encoding: "rle-v1";
  tiles: RleRun[];
}

export interface WorldTransitionDefinition {
  id: StableId;
  name: string;
  trigger: "enter";
  partyRule: "all";
  source: {
    floorId: FloorId;
    x: number;
    y: number;
  };
  destination: {
    floorId: FloorId;
    x: number;
    y: number;
  };
}

export interface WorldDefinition {
  tileSize: number;
  floors: FloorDefinition[];
  tiles: TileDefinition[];
  /** Optional for compatibility with early project fixtures. */
  transitions?: WorldTransitionDefinition[];
}

export interface AbilityDefinitionBase {
  id: StableId;
  name: string;
  kind: "melee" | "projectile" | "utility";
  cooldownTicks: number;
  rangeTiles: number;
  power: number;
  assetId?: StableId;
}

export interface AbilityDefinitionV1 extends AbilityDefinitionBase {}

/** Latest ability definition. Execution is delegated to a validated gameplay graph. */
export interface AbilityDefinition extends AbilityDefinitionBase {
  graphId: StableId;
}

export interface PlayerClassDefinition {
  id: StableId;
  name: string;
  maxHp: number;
  moveSpeedTilesPerSecond: number;
  abilityIds: StableId[];
  assetId?: StableId;
}

export interface MonsterDefinition {
  id: StableId;
  name: string;
  maxHp: number;
  moveSpeedTilesPerSecond: number;
  abilityIds: StableId[];
  assetId?: StableId;
}

export interface SpawnDefinition {
  id: StableId;
  floorId: FloorId;
  monsterId: StableId;
  x: number;
  y: number;
  count: number;
  respawnTicks: number;
}

export interface AssetEntry {
  id: StableId;
  kind: "texture" | "audio" | "data";
  source: string;
  sha256?: string;
  /** Optional renderer metadata. Runtime must not guess atlas geometry when present. */
  texture?: TextureFrameLayout;
}

export type GameplayDomain =
  | "ability"
  | "item-effect"
  | "talent-modifier"
  | "ai-action"
  | "quest-reaction"
  | "map-trigger";

export type GameplayParameterValue = string | number | boolean;
export type GameplayParameters = Record<string, GameplayParameterValue>;

export interface GameplayConditionNode {
  id: StableId;
  kind: "condition";
  conditionId: StableId;
  onTrue: StableId;
  onFalse: StableId;
  parameters?: GameplayParameters;
}

export interface GameplayTargetQueryNode {
  id: StableId;
  kind: "target-query";
  queryId: StableId;
  next: StableId;
  parameters?: GameplayParameters;
}

export interface GameplayEffectNode {
  id: StableId;
  kind: "effect";
  effectId: StableId;
  next: StableId;
  parameters?: GameplayParameters;
}

export interface GameplayActionNode {
  id: StableId;
  kind: "action";
  actionId: StableId;
  next: StableId;
  parameters?: GameplayParameters;
}

export interface GameplayEndNode {
  id: StableId;
  kind: "end";
}

export type GameplayNodeDefinition =
  | GameplayConditionNode
  | GameplayTargetQueryNode
  | GameplayEffectNode
  | GameplayActionNode
  | GameplayEndNode;

export interface GameplayGraphDefinition {
  id: StableId;
  name: string;
  entryNodeId: StableId;
  nodes: GameplayNodeDefinition[];
}

export interface GameplayBindingDefinition {
  id: StableId;
  domain: GameplayDomain;
  graphId: StableId;
}

export type GameplayTriggerEvent =
  | "ability.used"
  | "damage.applied"
  | "actor.died"
  | "actor.respawned"
  | "player.joined"
  | "player.left"
  | "party.floor_changed";

export interface GameplayTriggerDefinition {
  id: StableId;
  domain: GameplayDomain;
  event: GameplayTriggerEvent;
  graphId: StableId;
  enabled: boolean;
}

export interface GameplayLanguageDefinition {
  schemaVersion: 1;
  executionBudget: number;
  graphs: GameplayGraphDefinition[];
  bindings: GameplayBindingDefinition[];
  triggers: GameplayTriggerDefinition[];
}

interface ProjectContentV1 {
  classes: PlayerClassDefinition[];
  abilities: AbilityDefinitionV1[];
  monsters: MonsterDefinition[];
  spawns: SpawnDefinition[];
}

interface ProjectContentV2 {
  classes: PlayerClassDefinition[];
  abilities: AbilityDefinition[];
  monsters: MonsterDefinition[];
  spawns: SpawnDefinition[];
}

export interface CoopegeProjectV1 {
  format: "coopege-project";
  schemaVersion: 1;
  manifest: ProjectManifest;
  world: WorldDefinition;
  content: ProjectContentV1;
  assets: {
    schemaVersion: 1;
    entries: AssetEntry[];
  };
}

export interface CoopegeProjectV2 {
  format: "coopege-project";
  schemaVersion: 2;
  manifest: ProjectManifest;
  world: WorldDefinition;
  content: ProjectContentV2;
  gameplay: GameplayLanguageDefinition;
  assets: {
    schemaVersion: 1;
    entries: AssetEntry[];
  };
}

export type CoopegeProjectInput = CoopegeProjectV1 | CoopegeProjectV2;
export type CoopegeProject = CoopegeProjectV2;
