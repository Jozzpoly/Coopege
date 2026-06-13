import type { PreparedRuntimeProject } from "../../runtime-core/src/index.js";
import { GameWorld, type GameWorldOptions } from "./game-world.js";
import type { InputFrame, ReplayResult } from "./types.js";

export interface ReplayRecordingV1 {
  format: "coopege-replay";
  schemaVersion: 1;
  projectChecksum: string;
  tickRate: number;
  frames: InputFrame[];
}

export function runReplay(
  project: PreparedRuntimeProject,
  frames: readonly InputFrame[],
  options: GameWorldOptions = {},
): ReplayResult {
  const world = new GameWorld(project, options);
  for (const frame of frames) world.step(frame);
  return { checksum: world.stateChecksum(), snapshot: world.createSaveSnapshot() };
}
