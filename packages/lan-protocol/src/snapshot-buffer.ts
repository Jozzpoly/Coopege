import type { HostSnapshotPayload, LanActorSnapshot, LanPlayerSnapshot } from "./types.js";

export interface SnapshotBufferOptions {
  interpolationDelayMs?: number;
  maximumSnapshots?: number;
}

export interface SnapshotSample {
  snapshot: HostSnapshotPayload;
  alpha: number;
  previousHostTick: number;
  nextHostTick: number;
  bufferedSnapshots: number;
}

interface TimedSnapshot {
  receivedAtMs: number;
  snapshot: HostSnapshotPayload;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function interpolate(previous: number, next: number, alpha: number): number {
  return previous + (next - previous) * alpha;
}

function interpolatePlayer(previous: LanPlayerSnapshot | undefined, next: LanPlayerSnapshot, alpha: number): LanPlayerSnapshot {
  if (!previous || previous.floorId !== next.floorId) return structuredClone(next);
  return {
    ...next,
    previousX: previous.x,
    previousY: previous.y,
    x: interpolate(previous.x, next.x, alpha),
    y: interpolate(previous.y, next.y, alpha),
    facingX: interpolate(previous.facingX, next.facingX, alpha),
    facingY: interpolate(previous.facingY, next.facingY, alpha),
  };
}

function interpolateActor(previous: LanActorSnapshot | undefined, next: LanActorSnapshot, alpha: number): LanActorSnapshot {
  if (!previous || previous.floorId !== next.floorId) return structuredClone(next);
  return {
    ...next,
    previousX: previous.x,
    previousY: previous.y,
    x: interpolate(previous.x, next.x, alpha),
    y: interpolate(previous.y, next.y, alpha),
  };
}

export class LanSnapshotBuffer {
  readonly interpolationDelayMs: number;
  readonly maximumSnapshots: number;
  private snapshots: TimedSnapshot[] = [];

  constructor(options: SnapshotBufferOptions = {}) {
    this.interpolationDelayMs = options.interpolationDelayMs ?? 110;
    this.maximumSnapshots = options.maximumSnapshots ?? 8;
    if (!Number.isFinite(this.interpolationDelayMs) || this.interpolationDelayMs < 0) throw new Error("Interpolation delay musi być nieujemny.");
    if (!Number.isInteger(this.maximumSnapshots) || this.maximumSnapshots < 2 || this.maximumSnapshots > 64) throw new Error("Bufor snapshotów musi mieścić 2..64 wpisy.");
  }

  push(snapshot: HostSnapshotPayload, receivedAtMs: number): boolean {
    if (!Number.isFinite(receivedAtMs) || receivedAtMs < 0) throw new Error("Czas odebrania snapshotu jest nieprawidłowy.");
    const latest = this.snapshots[this.snapshots.length - 1];
    if (latest && snapshot.hostTick <= latest.snapshot.hostTick) return false;
    this.snapshots.push({ snapshot: structuredClone(snapshot), receivedAtMs });
    if (this.snapshots.length > this.maximumSnapshots) this.snapshots.splice(0, this.snapshots.length - this.maximumSnapshots);
    return true;
  }

  clear(): void {
    this.snapshots = [];
  }

  size(): number {
    return this.snapshots.length;
  }

  latest(): HostSnapshotPayload | null {
    const latest = this.snapshots[this.snapshots.length - 1];
    return latest ? structuredClone(latest.snapshot) : null;
  }

  snapshotRateHz(): number {
    if (this.snapshots.length < 2) return 0;
    const first = this.snapshots[0]!;
    const last = this.snapshots[this.snapshots.length - 1]!;
    const elapsedMs = last.receivedAtMs - first.receivedAtMs;
    return elapsedMs > 0 ? (this.snapshots.length - 1) * 1000 / elapsedMs : 0;
  }

  sample(nowMs: number): SnapshotSample | null {
    if (!Number.isFinite(nowMs) || this.snapshots.length === 0) return null;
    const renderAtMs = nowMs - this.interpolationDelayMs;
    let previous = this.snapshots[0]!;
    let next = previous;
    for (const candidate of this.snapshots) {
      if (candidate.receivedAtMs <= renderAtMs) previous = candidate;
      if (candidate.receivedAtMs >= renderAtMs) {
        next = candidate;
        break;
      }
      next = candidate;
    }
    if (previous.snapshot.activeFloorId !== next.snapshot.activeFloorId) previous = next;
    const durationMs = next.receivedAtMs - previous.receivedAtMs;
    const alpha = durationMs > 0 ? clamp01((renderAtMs - previous.receivedAtMs) / durationMs) : 1;
    const previousPlayers = new Map(previous.snapshot.players.map((player) => [player.entityId, player]));
    const previousActors = new Map(previous.snapshot.actors.map((actor) => [actor.entityId, actor]));
    const snapshot: HostSnapshotPayload = {
      ...structuredClone(next.snapshot),
      players: next.snapshot.players.map((player) => interpolatePlayer(previousPlayers.get(player.entityId), player, alpha)),
      actors: next.snapshot.actors.map((actor) => interpolateActor(previousActors.get(actor.entityId), actor, alpha)),
    };
    return {
      snapshot,
      alpha,
      previousHostTick: previous.snapshot.hostTick,
      nextHostTick: next.snapshot.hostTick,
      bufferedSnapshots: this.snapshots.length,
    };
  }
}
