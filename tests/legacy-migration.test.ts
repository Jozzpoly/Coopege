import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateProject } from "../packages/validation/src/index.js";

const migrationRoot = join(process.cwd(), "project", "migration", "legacy-v14.1");

async function json(name: string): Promise<any> {
  return JSON.parse(await readFile(join(migrationRoot, name), "utf8"));
}

test("golden migration fixture jest poprawnym projektem schema v1", async () => {
  const project = await json("coopege.project.json");
  const result = validateProject(project);
  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
  assert.equal(project.world.floors.length, 5);
  assert.equal(project.world.tiles.length, 18);
  assert.equal(project.content.classes.length, 3);
  assert.equal(project.content.monsters.length, 6);
  assert.equal(project.content.spawns.length, 338);
  assert.equal(project.assets.entries.length, 45);
});

test("surowy snapshot pochodzi z oficjalnych API i przeszedł walidację legacy", async () => {
  const snapshot = await json("raw/legacy-export.normalized.json");
  assert.equal(snapshot.source.runtimeSha256, "cd7d0d7527847ebd3f4ddb2c5a8c18d292517815c4989b8f4bd40b0fc5ce900c");
  assert.equal(snapshot.validation.mapSchema.ok, true);
  assert.equal(snapshot.validation.mapWorld.ok, true);
  assert.equal(snapshot.validation.content.ok, true);
  assert.equal(snapshot.validation.assets.ok, true);
  assert.equal(snapshot.assets.assetCount, 45);
});

test("golden manifest odtwarza sumy wszystkich artefaktów migracji", async () => {
  const manifest = await json("golden-manifest.json");
  assert.equal(manifest.artifacts.length, 52);
  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(join(process.cwd(), artifact.path));
    assert.equal(bytes.length, artifact.bytes, artifact.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256, artifact.path);
  }
});

test("raport migracji jawnie zachowuje braki schematu v1", async () => {
  const report = await json("migration-report.json");
  const unsupported = report.findings.filter((item: { status: string }) => item.status === "UNSUPPORTED");
  const review = report.findings.filter((item: { status: string }) => item.status === "MANUAL_REVIEW_REQUIRED");
  assert.ok(unsupported.some((item: { category: string }) => item.category === "content.quests"));
  assert.ok(unsupported.some((item: { category: string }) => item.category === "content.talents"));
  assert.ok(!review.some((item: { category: string }) => item.category === "world.links"));
  assert.ok(review.some((item: { category: string }) => item.category === "content.items"));
  assert.ok(report.findings.some((item: { category: string; status: string }) => item.category === "world.links" && item.status === "MIGRATED_WITH_TRANSFORM"));
});
