import test from "node:test";
import assert from "node:assert/strict";
import { EntityIdAllocator, EntityStore } from "../packages/gameplay/src/index.js";

test("EntityIdAllocator generuje deterministyczne, niezależne od definicji ID runtime", () => {
  const allocator = new EntityIdAllocator();
  assert.equal(allocator.allocate("player"), "entity.player.000001");
  assert.equal(allocator.allocate("monster"), "entity.monster.000002");
  const checkpoint = allocator.snapshot();
  assert.equal(allocator.allocate("projectile"), "entity.projectile.000003");
  allocator.restore(checkpoint);
  assert.equal(allocator.allocate("item"), "entity.item.000003");
});

test("EntityStore odrzuca kolizję ID i zwraca stabilną kolejność", () => {
  const store = new EntityStore<{ entityId: string; value: number }>();
  store.add({ entityId: "entity.monster.000002", value: 2 });
  store.add({ entityId: "entity.player.000001", value: 1 });
  assert.deepEqual(store.values().map((item) => item.entityId), ["entity.monster.000002", "entity.player.000001"]);
  assert.throws(() => store.add({ entityId: "entity.player.000001", value: 9 }), /już istnieje/);
});
