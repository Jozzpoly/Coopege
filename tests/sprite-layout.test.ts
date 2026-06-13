import test from "node:test";
import assert from "node:assert/strict";
import { computeSpriteDrawRect, resolveTextureLayout, selectSpriteFrame, selectTileFrame } from "../apps/runtime/src/sprite-layout.js";

test("legacy player sheet fallback derives complete four-direction frames instead of hardcoded 32px fragments", () => {
  const layout = resolveTextureLayout(undefined, 192, 224, "player");
  assert.equal(layout.frameWidth, 48);
  assert.equal(layout.frameHeight, 56);
  assert.deepEqual(layout.directionRows, { down: 0, left: 1, right: 2, up: 3 });
  const frame = selectSpriteFrame(layout, 192, 224, "right", true, 5, 30);
  assert.equal(frame.sourceWidth, 48);
  assert.equal(frame.sourceHeight, 56);
  assert.equal(frame.sourceY, 112);
  assert.ok(frame.sourceX % 48 === 0);
});

test("padded player atlas preserves visual scale while adding room around weapons and feet", () => {
  const layout = resolveTextureLayout({
    frameWidth: 80,
    frameHeight: 80,
    directionRows: { down: 0, left: 1, right: 2, up: 3 },
    idleFrame: 0,
    animationFrames: [0, 1, 2, 3],
    frameMode: "animation",
    pivotX: 0.5,
    pivotY: 0.546,
    worldWidthTiles: 1.8,
    worldHeightTiles: 1.8,
  }, 320, 320, "player");
  const frame = selectSpriteFrame(layout, 320, 320, "up", true, 5, 30);
  assert.deepEqual({ width: frame.sourceWidth, height: frame.sourceHeight, row: frame.row }, { width: 80, height: 80, row: 3 });
  const rect = computeSpriteDrawRect(400, 300, 48, layout);
  assert.equal(rect.width, 86.4);
  assert.equal(rect.height, 86.4);
  assert.ok(Math.abs(rect.y - 252.8256) < 0.000001);
});

test("authored frame metadata clamps invalid animation cells without crossing atlas bounds", () => {
  const layout = resolveTextureLayout({
    frameWidth: 64,
    frameHeight: 64,
    directionRows: { down: 0, left: 1, right: 99, up: 3 },
    idleFrame: 99,
    animationFrames: [0, 3, 12, -1],
    pivotX: 0.5,
    pivotY: 0.75,
  }, 256, 256, "monster");
  assert.deepEqual(layout.animationFrames, [0, 3]);
  assert.equal(layout.idleFrame, 3);
  const idle = selectSpriteFrame(layout, 256, 256, "right", false, 0, 30);
  assert.deepEqual({ frame: idle.frame, row: idle.row }, { frame: 3, row: 3 });
});

test("sprite pivot stays attached to the same world anchor while animation frame changes", () => {
  const layout = resolveTextureLayout({
    frameWidth: 48,
    frameHeight: 56,
    directionRows: { down: 0, left: 1, right: 2, up: 3 },
    idleFrame: 0,
    animationFrames: [0, 1, 2, 3],
    pivotX: 0.5,
    pivotY: 0.78,
    worldWidthTiles: 1.08,
    worldHeightTiles: 1.26,
  }, 192, 224, "player");
  const rectA = computeSpriteDrawRect(400, 300, 48, layout);
  const rectB = computeSpriteDrawRect(400, 300, 48, layout);
  assert.deepEqual(rectA, rectB);
  assert.equal(rectA.x + rectA.width * layout.pivotX, 400);
  assert.equal(rectA.y + rectA.height * layout.pivotY, 300);
});

test("wariant kafla zależy od współrzędnych, ale nie zmienia się wraz z czasem", () => {
  const layout = resolveTextureLayout({
    frameWidth: 32,
    frameHeight: 32,
    idleFrame: 0,
    animationFrames: [0, 1, 2, 3],
    frameMode: "variant",
  }, 128, 32, "tile");
  const first = selectTileFrame(layout, 128, 32, 17, 29, "texture.terrain.grass", 0);
  const later = selectTileFrame(layout, 128, 32, 17, 29, "texture.terrain.grass", 60_000);
  assert.equal(first.frame, later.frame);
  const frames = new Set(Array.from({ length: 12 }, (_, x) => selectTileFrame(layout, 128, 32, x, 7, "texture.terrain.grass", 0).frame));
  assert.ok(frames.size > 1);
});

test("animowany kafel zmienia klatkę zgodnie z frameDurationMs", () => {
  const layout = resolveTextureLayout({
    frameWidth: 32,
    frameHeight: 32,
    idleFrame: 0,
    animationFrames: [0, 1, 2, 3],
    frameMode: "animation",
    frameDurationMs: 200,
  }, 128, 32, "tile");
  assert.equal(selectTileFrame(layout, 128, 32, 3, 4, "texture.terrain.water", 0).frame, 0);
  assert.equal(selectTileFrame(layout, 128, 32, 3, 4, "texture.terrain.water", 200).frame, 1);
});
