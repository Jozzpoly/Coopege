import type { MonsterDefinition, SpawnDefinition, TileDefinition } from "../../schema/src/index.js";
import type { PreparedFloor } from "../../runtime-core/src/index.js";
import type { SpawnRuntimeState } from "./types.js";

export function createSpawnInstanceId(spawnId: string, instanceIndex: number): string {
  if (!Number.isInteger(instanceIndex) || instanceIndex < 0) throw new Error("Indeks instancji spawnu musi być nieujemną liczbą całkowitą.");
  return `${spawnId}.instance.${String(instanceIndex + 1).padStart(3, "0")}`;
}

export function createSpawnEntityId(instanceId: string): string {
  return `entity.monster.${instanceId}`;
}

function isWalkableCell(
  floor: PreparedFloor,
  walkableByTileId: ReadonlyMap<string, boolean>,
  x: number,
  y: number,
): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= floor.width || y >= floor.height) return false;
  const tileId = floor.tiles[y * floor.width + x];
  return tileId !== undefined && walkableByTileId.get(tileId) === true;
}

function* placementCandidates(originX: number, originY: number, maximumRadius: number): Generator<readonly [number, number]> {
  const seen = new Set<string>();
  for (let radius = 0; radius <= maximumRadius; radius += 1) {
    const emit = function* (x: number, y: number): Generator<readonly [number, number]> {
      const key = `${x},${y}`;
      if (seen.has(key)) return;
      seen.add(key);
      yield [x, y] as const;
    };
    if (radius === 0) yield* emit(originX, originY);
    for (let offset = -radius; offset <= radius; offset += 1) {
      yield* emit(originX + offset, originY - radius);
      yield* emit(originX + radius, originY + offset);
      yield* emit(originX - offset, originY + radius);
      yield* emit(originX - radius, originY - offset);
    }
  }
}

function findPlacement(
  floor: PreparedFloor,
  walkableByTileId: ReadonlyMap<string, boolean>,
  occupied: ReadonlySet<string>,
  originX: number,
  originY: number,
): readonly [number, number] | undefined {
  for (const [x, y] of placementCandidates(originX, originY, Math.max(floor.width, floor.height))) {
    if (isWalkableCell(floor, walkableByTileId, x, y) && !occupied.has(`${x},${y}`)) return [x, y] as const;
  }
  return undefined;
}

/**
 * Expands authored definitions into stable runtime instances and resolves every
 * instance to a deterministic, walkable and globally unique tile on its floor.
 */
export function buildSpawnRuntimeStates(
  spawns: readonly SpawnDefinition[],
  monsters: readonly MonsterDefinition[],
  floors: ReadonlyMap<string, PreparedFloor>,
  tiles: readonly TileDefinition[],
): SpawnRuntimeState[] {
  const monsterById = new Map(monsters.map((monster) => [monster.id, monster]));
  const walkableByTileId = new Map(tiles.map((tile) => [tile.id, tile.walkable]));
  const occupiedByFloor = new Map<string, Set<string>>();
  const states: SpawnRuntimeState[] = [];

  for (const spawn of [...spawns].sort((left, right) => left.id.localeCompare(right.id))) {
    const floor = floors.get(spawn.floorId);
    if (!floor) throw new Error(`Spawn ${spawn.id} wskazuje nieistniejące piętro ${spawn.floorId}.`);
    const monster = monsterById.get(spawn.monsterId);
    if (!monster) throw new Error(`Spawn ${spawn.id} wskazuje nieistniejącego potwora ${spawn.monsterId}.`);
    const occupied = occupiedByFloor.get(floor.id) ?? new Set<string>();
    occupiedByFloor.set(floor.id, occupied);
    for (let instanceIndex = 0; instanceIndex < spawn.count; instanceIndex += 1) {
      const placement = findPlacement(floor, walkableByTileId, occupied, Math.floor(spawn.x), Math.floor(spawn.y));
      if (!placement) throw new Error(`Nie znaleziono unikalnego walkowalnego pola dla ${spawn.id}#${instanceIndex}.`);
      const [cellX, cellY] = placement;
      occupied.add(`${cellX},${cellY}`);
      const instanceId = createSpawnInstanceId(spawn.id, instanceIndex);
      const x = cellX + 0.5;
      const y = cellY + 0.5;
      states.push({
        instanceId,
        spawnId: spawn.id,
        instanceIndex,
        floorId: spawn.floorId,
        monsterId: spawn.monsterId,
        authoredX: spawn.x,
        authoredY: spawn.y,
        homeX: x,
        homeY: y,
        x,
        y,
        previousX: x,
        previousY: y,
        hp: monster.maxHp,
        cooldownUntilTick: 0,
        respawnAtTick: 0,
        targetPlayerId: null,
        threatByPlayer: [],
        status: "sleeping",
        activeEntityId: null,
      });
    }
  }
  return states.sort((left, right) => left.instanceId.localeCompare(right.instanceId));
}

export function cloneSpawnRuntimeState(state: SpawnRuntimeState): SpawnRuntimeState {
  return {
    ...state,
    threatByPlayer: state.threatByPlayer.map(([playerId, threat]) => [playerId, threat] as const),
  };
}
