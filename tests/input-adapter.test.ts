import test from "node:test";
import assert from "node:assert/strict";
import { resolvePointerAim, selectConnectedGamepad } from "../apps/runtime/src/input-adapter.js";

function gamepad(index: number, connected = true): Gamepad {
  return { index, connected } as Gamepad;
}

test("P2 wybiera pierwszy faktycznie podłączony gamepad, także gdy index 0 jest pusty", () => {
  const selected = selectConnectedGamepad([null, null, gamepad(2)]);
  assert.equal(selected?.index, 2);
});

test("zapisany deviceIndex nie jest zastępowany innym padem i rozłączenie daje bezpieczny fallback", () => {
  const pads = [gamepad(0), null, gamepad(2)] as const;
  assert.equal(selectConnectedGamepad(pads, 2)?.index, 2);
  assert.equal(selectConnectedGamepad(pads, 1), null);
  assert.equal(selectConnectedGamepad([gamepad(0, false), gamepad(1)], null)?.index, 1);
});


test("celowanie myszą przelicza stałą pozycję kursora względem aktualnej kamery zamiast przechowywać stary punkt świata", () => {
  const pointer = { x: 400, y: 300 };
  const player = { x: 10, y: 10 };
  let cameraOffset = 0;
  const convert = (clientX: number, clientY: number) => ({ x: clientX / 100 + cameraOffset, y: clientY / 100 });
  const first = resolvePointerAim(pointer, player, { x: 1, y: 0 }, convert);
  cameraOffset = 5;
  const afterCameraMove = resolvePointerAim(pointer, player, { x: 1, y: 0 }, convert);
  assert.deepEqual(first, { x: -6, y: -7 });
  assert.deepEqual(afterCameraMove, { x: -1, y: -7 });
  assert.deepEqual(resolvePointerAim(undefined, player, { x: 0, y: -1 }, convert), { x: 0, y: -1 });
});
