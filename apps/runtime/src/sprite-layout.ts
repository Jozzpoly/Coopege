import type { TextureFrameLayout } from "../../../packages/schema/src/index.js";

export type SpriteKind = "tile" | "player" | "monster";
export type SpriteDirection = "down" | "left" | "right" | "up";

export interface ResolvedTextureFrameLayout extends TextureFrameLayout {
  frameWidth: number;
  frameHeight: number;
  directionRows: Record<SpriteDirection, number>;
  idleFrame: number;
  animationFrames: number[];
  frameMode: "animation" | "variant";
  frameDurationMs: number;
  pivotX: number;
  pivotY: number;
  worldWidthTiles: number;
  worldHeightTiles: number;
}

export interface SpriteFrameSelection {
  frame: number;
  row: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface SpriteDrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function fallbackLayout(imageWidth: number, imageHeight: number, kind: SpriteKind): TextureFrameLayout {
  if ((kind === "player" || kind === "monster") && imageWidth % 4 === 0 && imageHeight % 4 === 0) {
    const player = kind === "player";
    return {
      frameWidth: imageWidth / 4,
      frameHeight: imageHeight / 4,
      directionRows: { down: 0, left: 1, right: 2, up: 3 },
      idleFrame: 0,
      animationFrames: [0, 1, 2, 3],
      frameMode: "animation",
      frameDurationMs: 130,
      pivotX: 0.5,
      pivotY: player ? 0.78 : 0.72,
      worldWidthTiles: player ? 1.08 : 1.18,
      worldHeightTiles: player ? 1.26 : 1.18,
    };
  }
  const frameHeight = Math.max(1, imageHeight);
  const frameWidth = Math.max(1, imageWidth >= frameHeight ? frameHeight : imageWidth);
  const frameCount = Math.max(1, Math.floor(imageWidth / frameWidth));
  return {
    frameWidth,
    frameHeight,
    idleFrame: 0,
    animationFrames: Array.from({ length: frameCount }, (_, index) => index),
    frameMode: kind === "tile" ? "variant" : "animation",
    frameDurationMs: 360,
    pivotX: 0.5,
    pivotY: 0.5,
    worldWidthTiles: 1,
    worldHeightTiles: 1,
  };
}

/**
 * Resolves authored texture metadata into a safe, complete layout. It never
 * guesses 32px frames: fallback inference derives frame dimensions from the
 * actual image and actor kind, keeping legacy sheets usable during migration.
 */
export function resolveTextureLayout(
  authored: TextureFrameLayout | undefined,
  imageWidth: number,
  imageHeight: number,
  kind: SpriteKind,
): ResolvedTextureFrameLayout {
  if (!Number.isInteger(imageWidth) || imageWidth <= 0 || !Number.isInteger(imageHeight) || imageHeight <= 0) {
    throw new Error(`Niepoprawny rozmiar tekstury ${imageWidth}x${imageHeight}.`);
  }
  const source = authored ?? fallbackLayout(imageWidth, imageHeight, kind);
  const frameWidth = clampInteger(source.frameWidth, 1, imageWidth);
  const frameHeight = clampInteger(source.frameHeight, 1, imageHeight);
  const columns = Math.max(1, Math.floor(imageWidth / frameWidth));
  const rows = Math.max(1, Math.floor(imageHeight / frameHeight));
  const authoredFrames = source.animationFrames?.filter((frame) => Number.isInteger(frame) && frame >= 0 && frame < columns) ?? [];
  const animationFrames = authoredFrames.length > 0 ? [...authoredFrames] : [clampInteger(source.idleFrame ?? 0, 0, columns - 1)];
  const directionRows = source.directionRows
    ? {
      down: clampInteger(source.directionRows.down, 0, rows - 1),
      left: clampInteger(source.directionRows.left, 0, rows - 1),
      right: clampInteger(source.directionRows.right, 0, rows - 1),
      up: clampInteger(source.directionRows.up, 0, rows - 1),
    }
    : { down: 0, left: 0, right: 0, up: 0 };
  const worldWidthTiles = Number.isFinite(source.worldWidthTiles) && (source.worldWidthTiles ?? 0) > 0
    ? source.worldWidthTiles!
    : 1;
  const proportionalHeight = worldWidthTiles * frameHeight / frameWidth;
  return {
    ...source,
    frameWidth,
    frameHeight,
    directionRows,
    idleFrame: clampInteger(source.idleFrame ?? 0, 0, columns - 1),
    animationFrames,
    frameMode: source.frameMode ?? (kind === "tile" ? "variant" : "animation"),
    frameDurationMs: Math.max(16, Number.isFinite(source.frameDurationMs) ? source.frameDurationMs! : 130),
    pivotX: Math.max(0, Math.min(1, Number.isFinite(source.pivotX) ? source.pivotX! : 0.5)),
    pivotY: Math.max(0, Math.min(1, Number.isFinite(source.pivotY) ? source.pivotY! : 0.72)),
    worldWidthTiles,
    worldHeightTiles: Number.isFinite(source.worldHeightTiles) && (source.worldHeightTiles ?? 0) > 0
      ? source.worldHeightTiles!
      : proportionalHeight,
  };
}

function stableTileFrameIndex(x: number, y: number, seed: string, frameCount: number): number {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= Math.imul(Math.trunc(x), 374761393);
  hash = Math.imul(hash, 668265263);
  hash ^= Math.imul(Math.trunc(y), 1442695041);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash >>> 0) % Math.max(1, frameCount);
}

export function selectTileFrame(
  layout: ResolvedTextureFrameLayout,
  imageWidth: number,
  imageHeight: number,
  tileX: number,
  tileY: number,
  seed: string,
  nowMs: number,
): SpriteFrameSelection {
  const columns = Math.max(1, Math.floor(imageWidth / layout.frameWidth));
  const rows = Math.max(1, Math.floor(imageHeight / layout.frameHeight));
  const frames = layout.animationFrames.length > 0 ? layout.animationFrames : [layout.idleFrame];
  const selectedIndex = layout.frameMode === "variant"
    ? stableTileFrameIndex(tileX, tileY, seed, frames.length)
    : Math.floor(Math.max(0, nowMs) / layout.frameDurationMs) % frames.length;
  const frame = clampInteger(frames[selectedIndex] ?? layout.idleFrame, 0, columns - 1);
  return {
    frame,
    row: 0,
    sourceX: frame * layout.frameWidth,
    sourceY: 0,
    sourceWidth: layout.frameWidth,
    sourceHeight: Math.min(layout.frameHeight, rows * layout.frameHeight),
  };
}

export function selectSpriteFrame(
  layout: ResolvedTextureFrameLayout,
  imageWidth: number,
  imageHeight: number,
  direction: SpriteDirection,
  moving: boolean,
  simulationTick: number,
  tickRate: number,
): SpriteFrameSelection {
  const columns = Math.max(1, Math.floor(imageWidth / layout.frameWidth));
  const rows = Math.max(1, Math.floor(imageHeight / layout.frameHeight));
  const ticksPerFrame = Math.max(1, Math.round(layout.frameDurationMs / 1000 * Math.max(1, tickRate)));
  const selected = moving
    ? layout.animationFrames[Math.floor(Math.max(0, simulationTick) / ticksPerFrame) % layout.animationFrames.length]!
    : layout.idleFrame;
  const frame = clampInteger(selected, 0, columns - 1);
  const row = clampInteger(layout.directionRows?.[direction] ?? 0, 0, rows - 1);
  return {
    frame,
    row,
    sourceX: frame * layout.frameWidth,
    sourceY: row * layout.frameHeight,
    sourceWidth: layout.frameWidth,
    sourceHeight: layout.frameHeight,
  };
}

export function computeSpriteDrawRect(
  anchorX: number,
  anchorY: number,
  tilePixels: number,
  layout: ResolvedTextureFrameLayout,
): SpriteDrawRect {
  const width = tilePixels * layout.worldWidthTiles;
  const height = tilePixels * layout.worldHeightTiles;
  return {
    x: anchorX - width * layout.pivotX,
    y: anchorY - height * layout.pivotY,
    width,
    height,
  };
}
