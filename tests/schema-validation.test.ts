import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateProject } from "../packages/validation/src/index.js";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(process.cwd(), "project", "fixtures", name), "utf8")) as unknown;
}

test("schema v1 akceptuje minimalny fixture", async () => {
  const result = validateProject(await fixture("minimal.project.json"));
  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
});

test("walidator odrzuca spawn z nieznanym potworem i podaje ścieżkę", async () => {
  const result = validateProject(await fixture("invalid-unknown-monster.project.json"));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "unknown_monster_reference" && issue.path === "$.content.spawns[0].monsterId"));
});

test("walidator wykrywa nieprawidłową długość RLE", async () => {
  const project = await fixture("minimal.project.json") as { world: { floors: Array<{ tiles: Array<[string, number]> }> } };
  project.world.floors[0]!.tiles[0]![1] -= 1;
  const result = validateProject(project);
  assert.ok(result.issues.some((issue) => issue.code === "invalid_rle_length"));
});

test("walidator odrzuca zdalne i wykonywalne źródła assetów", async () => {
  const project = await fixture("minimal.project.json") as { assets: { entries: Array<{ source: string }> } };
  project.assets.entries[0]!.source = "https://example.com/evil.png";
  const result = validateProject(project);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "unsafe_asset_source" && issue.path === "$.assets.entries[0].source"));
});

test("walidator akceptuje osadzony PNG data URL", async () => {
  const project = await fixture("minimal.project.json") as { assets: { entries: Array<{ source: string }> } };
  project.assets.entries[0]!.source = "data:image/png;base64,iVBORw0KGgo=";
  const result = validateProject(project);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

test("walidator odrzuca punkt startowy na niewalkowalnym kaflu", async () => {
  const project = await fixture("minimal.project.json") as {
    manifest: { playerStart: { floorId: string; x: number; y: number } };
  };
  project.manifest.playerStart.x = 0;
  project.manifest.playerStart.y = 0;
  const result = validateProject(project);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "start_not_walkable" && issue.path === "$.manifest.playerStart"));
});

test("walidator wymaga tekstury dla referencji graficznych", async () => {
  const project = await fixture("minimal.project.json") as {
    assets: { entries: Array<{ id: string; kind: string; source: string }> };
  };
  project.assets.entries[0]!.kind = "audio";
  const result = validateProject(project);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "wrong_asset_kind" && issue.path === "$.world.tiles[0].assetId"));
});

test("walidator nie pozwala usunąć ostatniej klasy gracza", async () => {
  const project = await fixture("minimal.project.json") as { content: { classes: unknown[] } };
  project.content.classes = [];
  const result = validateProject(project);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "empty_collection" && issue.path === "$.content.classes"));
});
