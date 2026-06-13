import type { Vec2 } from "./types.js";

export interface SharedCameraFrameOptions {
  marginTiles?: number;
  minimumTilePixels?: number;
  maximumTilePixels?: number;
}

export interface SharedCameraFrame {
  center: Vec2;
  tilePixels: number;
  spreadTiles: number;
  widthTiles: number;
  heightTiles: number;
}

export function computeSharedCameraFrame(
  positions: readonly Vec2[],
  viewportWidth: number,
  viewportHeight: number,
  options: SharedCameraFrameOptions = {},
): SharedCameraFrame {
  const marginTiles = Math.max(0, options.marginTiles ?? 4);
  const minimumTilePixels = Math.max(8, options.minimumTilePixels ?? 24);
  const maximumTilePixels = Math.max(minimumTilePixels, options.maximumTilePixels ?? 56);
  const safePositions = positions.length > 0 ? positions : [{ x: 0, y: 0 }];
  let minX = safePositions[0]!.x;
  let maxX = minX;
  let minY = safePositions[0]!.y;
  let maxY = minY;
  for (const position of safePositions.slice(1)) {
    minX = Math.min(minX, position.x);
    maxX = Math.max(maxX, position.x);
    minY = Math.min(minY, position.y);
    maxY = Math.max(maxY, position.y);
  }
  const widthTiles = Math.max(1, maxX - minX + marginTiles * 2);
  const heightTiles = Math.max(1, maxY - minY + marginTiles * 2);
  const fitX = Math.max(1, viewportWidth) / widthTiles;
  const fitY = Math.max(1, viewportHeight) / heightTiles;
  const tilePixels = Math.max(minimumTilePixels, Math.min(maximumTilePixels, Math.min(fitX, fitY)));
  let spreadTiles = 0;
  for (let left = 0; left < safePositions.length; left += 1) {
    for (let right = left + 1; right < safePositions.length; right += 1) {
      const a = safePositions[left]!;
      const b = safePositions[right]!;
      spreadTiles = Math.max(spreadTiles, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    tilePixels,
    spreadTiles,
    widthTiles,
    heightTiles,
  };
}
