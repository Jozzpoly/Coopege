import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertTextureLayoutDimensions } from "../packages/asset-system/src/index.js";
import type { CoopegeProject } from "../packages/schema/src/index.js";
import {
  buildAssetPack,
  bytesToPngDataUrl,
  createStoreZip,
  parsePngDimensions,
  readZipEntries,
  replacementsFromAssetPack,
  replacementsFromPngFiles,
  sha256Hex,
  type AssetPackManifest,
  type AssetVaultBaselineEntry,
} from "../apps/studio/src/asset-pack.js";

const root = process.cwd();
const ONE_PIXEL_PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

function project(): CoopegeProject {
  return JSON.parse(readFileSync(resolve(root, "project/migration/legacy-v14.1/coopege.project.v2.json"), "utf8")) as CoopegeProject;
}

test("M7A parser PNG odczytuje IHDR i odrzuca fałszywą sygnaturę", () => {
  assert.deepEqual(parsePngDimensions(ONE_PIXEL_PNG), { width: 1, height: 1 });
  const damaged = new Uint8Array(ONE_PIXEL_PNG);
  damaged[0] = 0;
  assert.throws(() => parsePngDimensions(damaged), /sygnatury PNG/);
});

test("M7A czyta standardowy deflate ZIP z wpisem katalogu", async () => {
  const fixture = Uint8Array.from(Buffer.from("UEsDBAoAAAAAAB1szVwAAAAAAAAAAAAAAAAJABwAdGV4dHVyZXMvVVQJAAMJXC1qClwtanV4CwABBAAAAAAEAAAAAFBLAwQUAAAACAAdbM1c6GswHBwAAAB4BQAAEQAcAHRleHR1cmVzL3Rlc3QudHh0VVQJAAMJXC1qCVwtanV4CwABBAAAAAAEAAAAAMtIzcnJV0hJTctJLEnlyhjljfJGeaO8UR6NeQBQSwECHgMKAAAAAAAdbM1cAAAAAAAAAAAAAAAACQAYAAAAAAAAABAA7UEAAAAAdGV4dHVyZXMvVVQFAAMJXC1qdXgLAAEEAAAAAAQAAAAAUEsBAh4DFAAAAAgAHWzNXOhrMBwcAAAAeAUAABEAGAAAAAAAAQAAAKSBQwAAAHRleHR1cmVzL3Rlc3QudHh0VVQFAAMJXC1qdXgLAAEEAAAAAAQAAAAAUEsFBgAAAAACAAIApgAAAKoAAAAAAA==", "base64"));
  const files = await readZipEntries(fixture);
  assert.equal(new TextDecoder().decode(files.get("textures/test.txt")), "hello deflate\n".repeat(100));
});

test("M7A store ZIP zachowuje pliki, CRC i bezpieczne ścieżki", async () => {
  const files = new Map<string, Uint8Array>([
    ["manifest.json", new TextEncoder().encode('{"ok":true}')],
    ["textures/example.png", ONE_PIXEL_PNG],
  ]);
  const zip = createStoreZip(files);
  const restored = await readZipEntries(zip);
  assert.deepEqual([...restored.keys()].sort(), [...files.keys()].sort());
  assert.deepEqual(restored.get("textures/example.png"), ONE_PIXEL_PNG);
  assert.throws(() => createStoreZip(new Map([["../escape.png", ONE_PIXEL_PNG]])), /Niebezpieczna ścieżka/);
});

test("M7A import wielu PNG mapuje stabilne ID i stare nazwy źródłowe atomowego zestawu", async () => {
  const source = project();
  const first = source.assets.entries[0]!;
  delete first.texture;
  const baseline: AssetVaultBaselineEntry[] = [{
    id: first.id,
    category: "environment",
    source: first.source,
    sha256: first.sha256!,
    width: 128,
    height: 32,
  }];
  const byId = await replacementsFromPngFiles([{ name: `${first.id}.png`, bytes: ONE_PIXEL_PNG }], source, baseline);
  assert.equal(byId[0]?.assetId, first.id);
  const bySource = await replacementsFromPngFiles([{ name: first.source.split("/").at(-1)!, bytes: ONE_PIXEL_PNG }], source, baseline);
  assert.equal(bySource[0]?.assetId, first.id);
  await assert.rejects(() => replacementsFromPngFiles([{ name: "unknown.png", bytes: ONE_PIXEL_PNG }], source, baseline), /nie pasuje/);
});

test("M7A Asset Pack eksportuje manifest/contact sheet i importuje ZIP po SHA-256", async () => {
  const source = project();
  const first = source.assets.entries[0]!;
  delete first.texture;
  source.assets.entries = [{ ...first, source: bytesToPngDataUrl(ONE_PIXEL_PNG), sha256: await sha256Hex(ONE_PIXEL_PNG) }];
  const baseline: AssetVaultBaselineEntry[] = [{
    id: first.id,
    category: "environment",
    source: first.source,
    sha256: source.assets.entries[0]!.sha256!,
    width: 1,
    height: 1,
  }];
  const built = await buildAssetPack(source, baseline);
  assert.equal(built.manifest.assetCount, 1);
  assert.equal(built.manifest.assets[0]?.status, "legacy-placeholder");
  assert.ok(built.fileNames.includes("manifest.json"));
  assert.ok(built.fileNames.includes("contact-sheet.html"));
  const replacements = await replacementsFromAssetPack(built.zipBytes, source);
  assert.equal(replacements.length, 1);
  assert.equal(replacements[0]?.assetId, first.id);
  assert.equal(replacements[0]?.sha256, source.assets.entries[0]!.sha256);

  const badManifest = structuredClone(built.manifest) as AssetPackManifest;
  badManifest.assets[0]!.sha256 = "0".repeat(64);
  const entries = await readZipEntries(built.zipBytes);
  entries.set("manifest.json", new TextEncoder().encode(JSON.stringify(badManifest)));
  const badZip = createStoreZip(entries);
  await assert.rejects(() => replacementsFromAssetPack(badZip, source), /SHA-256 PNG nie zgadza/);
});


test("M7A odrzuca PNG, które łamie authored layout atlasu animacji", async () => {
  const source = project();
  const player = source.assets.entries.find((entry) => entry.id === "texture.legacy.player.warrior");
  assert.ok(player?.texture);
  await assert.rejects(
    () => replacementsFromPngFiles([{ name: `${player.id}.png`, bytes: ONE_PIXEL_PNG }], source, []),
    /nie pasuje do layoutu atlasu/,
  );
});


test("M7 Final wszystkie 45 źródłowych PNG są zgodne z authored layoutem", () => {
  const source = project();
  assert.equal(source.assets.entries.length, 45);
  for (const entry of source.assets.entries) {
    assert.equal(entry.kind, "texture");
    assert.ok(!entry.source.startsWith("data:"), `${entry.id} powinien wskazywać źródłowy PNG`);
    const bytes = new Uint8Array(readFileSync(resolve(root, "project/migration/legacy-v14.1", entry.source)));
    const dimensions = parsePngDimensions(bytes);
    assertTextureLayoutDimensions(entry, dimensions.width, dimensions.height);
  }
});
