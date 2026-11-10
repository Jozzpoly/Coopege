/** Minimum domain-only lookup for the authoring UI. No project mutation or selection ownership. */
export interface SpawnLike {
  readonly id: string;
  readonly monsterId: string;
  readonly floorId: string;
  readonly x: number;
  readonly y: number;
}

/** Return every occurrence on a cell; never choose an arbitrary first. */
export function spawnsAtCell<T extends SpawnLike>(
  spawns: readonly T[], floorId: string, x: number, y: number,
): T[] {
  return spawns.filter((spawn) => spawn.floorId === floorId && spawn.x === x && spawn.y === y);
}

/** A deleted occurrence must never redirect to some other spawn. */
export function spawnById<T extends SpawnLike>(
  spawns: readonly T[], id: string,
): T | undefined {
  return spawns.find((spawn) => spawn.id === id);
}
