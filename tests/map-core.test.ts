import test from "node:test";
import assert from "node:assert/strict";
import { applyTileChanges, decodeRleTiles, encodeRleTiles } from "../packages/map-core/src/index.js";
import type { FloorDefinition } from "../packages/schema/src/types.js";

test("RLE mapy zachowuje identyczny raster po encode/decode", () => {
  const tiles = ["tile.a", "tile.a", "tile.b", "tile.b", "tile.a"];
  const runs = encodeRleTiles(tiles);
  const floor: FloorDefinition = { id: "floor.test", name: "Test", width: 5, height: 1, encoding: "rle-v1", tiles: runs };
  assert.deepEqual(decodeRleTiles(floor), tiles);
});

test("tile stroke stosuje i odwraca wyłącznie wskazane indeksy", () => {
  const floor: FloorDefinition = { id: "floor.test", name: "Test", width: 3, height: 1, encoding: "rle-v1", tiles: [["tile.a", 3]] };
  const changes = [{ index: 1, before: "tile.a", after: "tile.b" }];
  const changed = applyTileChanges(floor, changes, "forward");
  assert.deepEqual(decodeRleTiles(changed), ["tile.a", "tile.b", "tile.a"]);
  assert.deepEqual(decodeRleTiles(applyTileChanges(changed, changes, "reverse")), ["tile.a", "tile.a", "tile.a"]);
});
