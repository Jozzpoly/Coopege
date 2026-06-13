import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicRng, FixedClock } from "../packages/core/src/index.js";
import { stableStringify } from "../packages/validation/src/index.js";

test("stabilna serializacja nie zależy od kolejności kluczy", () => {
  assert.equal(stableStringify({ b: 2, a: { d: 4, c: 3 } }), stableStringify({ a: { c: 3, d: 4 }, b: 2 }));
});

test("RNG daje identyczny strumień dla tego samego seeda", () => {
  const a = new DeterministicRng(1234), b = new DeterministicRng(1234);
  assert.deepEqual(Array.from({ length: 20 }, () => a.nextUint32()), Array.from({ length: 20 }, () => b.nextUint32()));
});

test("fixed clock wykonuje tyle samo ticków przy różnym podziale klatek", () => {
  const run = (frames: number[]) => {
    const clock = new FixedClock(20, 100);
    let ticks = 0;
    for (const frame of frames) clock.advance(frame, () => { ticks += 1; });
    return ticks;
  };
  assert.equal(run([50, 50, 50, 50]), 4);
  assert.equal(run([10, 15, 25, 80, 70]), 4);
});
