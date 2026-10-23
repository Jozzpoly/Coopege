import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"../..");
const read=(p)=>JSON.parse(readFileSync(resolve(root,p),"utf8"));
test("C1 shipped world witness is the actual regenerated source, not a stale hand-picked map",()=>{
 const shipped=read("research/coopege-c1/src/witness.json");
 const regenerated=read(".build/coopege-b0/source-authored-witness.json");
 assert.equal(shipped.format,regenerated.format);
 // export timestamp is volatile metadata, never an authored gameplay difference.
 delete shipped.authored.world.exportedAt;
 delete regenerated.authored.world.exportedAt;
 assert.deepEqual(shipped,regenerated,"actual source-authored NPCs/map/encounters drifted from shipped runtime");
});
