import type {
  InputFrame,
  PlayerCommand,
  PlayerId,
  PlayerSlotAssignment,
  PlayerSlotId,
} from "./types.js";

const INPUT_QUANTIZATION = 1024;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function quantize(value: number): number {
  return Math.round(value * INPUT_QUANTIZATION) / INPUT_QUANTIZATION;
}

export function neutralPlayerCommand(): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false };
}

export function normalizePlayerCommand(input: PlayerCommand): PlayerCommand {
  let moveX = Number.isFinite(input.moveX) ? clamp(input.moveX, -1, 1) : 0;
  let moveY = Number.isFinite(input.moveY) ? clamp(input.moveY, -1, 1) : 0;
  const moveLength = Math.hypot(moveX, moveY);
  if (moveLength > 1) {
    moveX /= moveLength;
    moveY /= moveLength;
  }

  let aimX = Number.isFinite(input.aimX) ? input.aimX : 1;
  let aimY = Number.isFinite(input.aimY) ? input.aimY : 0;
  const aimLength = Math.hypot(aimX, aimY);
  if (aimLength > 0.0001) {
    aimX /= aimLength;
    aimY /= aimLength;
  } else {
    aimX = 1;
    aimY = 0;
  }

  return {
    moveX: quantize(moveX),
    moveY: quantize(moveY),
    aimX: quantize(aimX),
    aimY: quantize(aimY),
    usePrimary: input.usePrimary === true,
  };
}

export function createInputFrame(tick: number, playerId: PlayerId, command: PlayerCommand): InputFrame {
  return createMultiPlayerInputFrame(tick, [{ playerId, command }]);
}

export function createMultiPlayerInputFrame(
  tick: number,
  players: readonly { playerId: PlayerId; command: PlayerCommand }[],
): InputFrame {
  if (!Number.isInteger(tick) || tick < 1) throw new Error("Tick InputFrame musi być dodatnią liczbą całkowitą.");
  const seen = new Set<PlayerId>();
  const normalized = players
    .map((entry) => {
      if (seen.has(entry.playerId)) throw new Error(`InputFrame zawiera duplikat gracza ${entry.playerId}.`);
      seen.add(entry.playerId);
      return { playerId: entry.playerId, command: normalizePlayerCommand(entry.command) };
    })
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  return { tick, players: normalized };
}

/**
 * Pure logical router. Physical adapters feed commands by slot; simulation sees only player IDs.
 */
export class InputRouter {
  private assignments = new Map<PlayerSlotId, PlayerSlotAssignment>();

  sync(assignments: readonly PlayerSlotAssignment[]): void {
    this.assignments.clear();
    for (const assignment of assignments) {
      if (this.assignments.has(assignment.slotId)) throw new Error(`Duplikat slotu wejścia ${assignment.slotId}.`);
      this.assignments.set(assignment.slotId, { ...assignment });
    }
  }

  createFrame(tick: number, commandBySlot: ReadonlyMap<PlayerSlotId, PlayerCommand>): InputFrame {
    const entries: Array<{ playerId: PlayerId; command: PlayerCommand }> = [];
    for (const assignment of [...this.assignments.values()].sort((a, b) => a.slotId.localeCompare(b.slotId))) {
      if (!assignment.joined) continue;
      entries.push({
        playerId: assignment.playerId,
        command: commandBySlot.get(assignment.slotId) ?? neutralPlayerCommand(),
      });
    }
    return createMultiPlayerInputFrame(tick, entries);
  }

  assignment(slotId: PlayerSlotId): PlayerSlotAssignment | undefined {
    const value = this.assignments.get(slotId);
    return value ? { ...value } : undefined;
  }
}
