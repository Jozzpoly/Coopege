import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AtomicProjectHost } from "../packages/runtime-core/src/index.js";

async function fixture(): Promise<any> {
  return JSON.parse(await readFile(join(process.cwd(), "project", "fixtures", "minimal.project.json"), "utf8"));
}

test("AtomicProjectHost przygotowuje projekt i zwiększa revision dopiero po sukcesie", async () => {
  const host = new AtomicProjectHost();
  const project = await fixture();
  const applied = host.apply(project);
  assert.equal(applied.ok, true);
  assert.equal(host.revision, 1);
  assert.equal(host.current?.project.manifest.projectId, project.manifest.projectId);
  assert.match(host.current?.checksum ?? "", /^fnv1a64:[a-f0-9]{16}$/);
});

test("odrzucony snapshot nie narusza aktywnego projektu ani revision", async () => {
  const host = new AtomicProjectHost();
  const project = await fixture();
  assert.equal(host.apply(project).ok, true);
  const checksum = host.current?.checksum;
  const invalid = structuredClone(project);
  invalid.content.spawns[0].monsterId = "monster.ghost";
  const rejected = host.apply(invalid);
  assert.equal(rejected.ok, false);
  assert.equal(host.revision, 1);
  assert.equal(host.current?.checksum, checksum);
  assert.equal(host.current?.project.content.spawns[0]?.monsterId, project.content.spawns[0].monsterId);
});
