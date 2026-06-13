import type { FloorDefinition, RleRun, TileId } from "../../schema/src/types.js";

export interface TileChange {
  index: number;
  before: TileId;
  after: TileId;
}

export function decodeRleTiles(floor: Pick<FloorDefinition, "width" | "height" | "tiles" | "id">): TileId[] {
  const decoded: TileId[] = [];
  for (const [tileId, count] of floor.tiles) {
    for (let index = 0; index < count; index += 1) decoded.push(tileId);
  }
  const expected = floor.width * floor.height;
  if (decoded.length !== expected) {
    throw new Error(`Piętro ${floor.id} dekoduje ${decoded.length} kafli, oczekiwano ${expected}.`);
  }
  return decoded;
}

export function encodeRleTiles(tiles: readonly TileId[]): RleRun[] {
  if (tiles.length === 0) return [];
  const runs: RleRun[] = [];
  let current = tiles[0]!;
  let count = 1;
  for (let index = 1; index < tiles.length; index += 1) {
    const tile = tiles[index]!;
    if (tile === current) {
      count += 1;
    } else {
      runs.push([current, count]);
      current = tile;
      count = 1;
    }
  }
  runs.push([current, count]);
  return runs;
}

export function applyTileChanges(
  floor: FloorDefinition,
  changes: readonly TileChange[],
  direction: "forward" | "reverse" = "forward",
): FloorDefinition {
  const tiles = decodeRleTiles(floor);
  for (const change of changes) {
    if (!Number.isInteger(change.index) || change.index < 0 || change.index >= tiles.length) {
      throw new Error(`Indeks kafla ${change.index} jest poza piętrem ${floor.id}.`);
    }
    tiles[change.index] = direction === "forward" ? change.after : change.before;
  }
  return { ...floor, tiles: encodeRleTiles(tiles) };
}

export function tileIndex(width: number, x: number, y: number): number {
  return y * width + x;
}
