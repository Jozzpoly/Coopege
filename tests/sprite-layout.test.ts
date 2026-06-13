import test from "node:test";
import assert from "node:assert/strict";
import { computeSpriteDrawRect, resolveTextureLayout, selectSpriteFrame } from "../apps/runtime/src/sprite-layout.js";

test("legacy player sheet 192x224 resolves to 48x56 instead of hardcoded 32px fragments", () => {
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
