import test from "node:test";
import assert from "node:assert/strict";
import { LanSnapshotBuffer, type HostSnapshotPayload } from "../packages/lan-protocol/src/index.js";

function snapshot(hostTick: number, x: number, snapshotSeq = hostTick): HostSnapshotPayload {
  return {
    sessionId: "session-test-0123456789abcdef",
    hostTick,
    activeFloorId: "floor.test",
    acknowledgedInputSeq: hostTick,
    players: [{
      playerId: "player.local.1",
      entityId: "entity.player.000001",
      slotId: "slot.keyboard-mouse.1",
      classId: "class.warrior",
      floorId: "floor.test",
      radius: 0.3,
      x,
      y: 4,
      previousX: x - 0.1,
      previousY: 4,
      facingX: 1,
      facingY: 0,
      alive: true,
      hp: 100,
      maxHp: 100,
    }],
    actors: [{
      entityId: "entity.monster.1",
      kind: "monster",
      definitionId: "monster.slime",
      floorId: "floor.test",
      radius: 0.3,
      x: x + 2,
      y: 4,
      previousX: x + 1.9,
      previousY: 4,
      alive: true,
      hp: 20,
      maxHp: 20,
    }],
    events: [],
    diagnostics: { snapshotSeq, connectedPlayers: 1, rejectedInputs: 0 },
  };
}

test("bufor klienta odrzuca duplicate i out-of-order snapshoty", () => {
  const buffer = new LanSnapshotBuffer({ interpolationDelayMs: 100 });
  assert.equal(buffer.push(snapshot(10, 1), 1000), true);
  assert.equal(buffer.push(snapshot(10, 2), 1010), false);
  assert.equal(buffer.push(snapshot(9, 0), 1020), false);
  assert.equal(buffer.push(snapshot(13, 4), 1100), true);
  assert.equal(buffer.size(), 2);
  assert.equal(buffer.latest()?.hostTick, 13);
});

test("bufor interpoluje graczy i aktorów między dwoma snapshotami", () => {
  const buffer = new LanSnapshotBuffer({ interpolationDelayMs: 100 });
  buffer.push(snapshot(10, 1), 1000);
  buffer.push(snapshot(13, 4), 1100);
  const sample = buffer.sample(1150);
  assert.ok(sample);
  assert.equal(sample.previousHostTick, 10);
  assert.equal(sample.nextHostTick, 13);
  assert.equal(sample.alpha, 0.5);
  assert.equal(sample.snapshot.players[0]?.x, 2.5);
  assert.equal(sample.snapshot.players[0]?.previousX, 1);
  assert.equal(sample.snapshot.actors[0]?.x, 4.5);
});

test("bufor nie interpoluje między różnymi piętrami", () => {
  const buffer = new LanSnapshotBuffer({ interpolationDelayMs: 100 });
  buffer.push(snapshot(10, 1), 1000);
  const changed = snapshot(13, 9);
  changed.activeFloorId = "floor.other";
  changed.players[0]!.floorId = "floor.other";
  changed.actors[0]!.floorId = "floor.other";
  buffer.push(changed, 1100);
  const sample = buffer.sample(1150);
  assert.equal(sample?.snapshot.players[0]?.x, 9);
  assert.equal(sample?.previousHostTick, 13);
});

test("bufor raportuje tempo snapshotów i ogranicza pamięć", () => {
  const buffer = new LanSnapshotBuffer({ maximumSnapshots: 3 });
  buffer.push(snapshot(1, 1), 1000);
  buffer.push(snapshot(2, 2), 1100);
  buffer.push(snapshot(3, 3), 1200);
  buffer.push(snapshot(4, 4), 1300);
  assert.equal(buffer.size(), 3);
  assert.equal(buffer.snapshotRateHz(), 10);
});
