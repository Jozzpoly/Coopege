import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadVerifier(): Promise<{ verifyManifest: (root: URL, manifest: { artifacts: Array<{ path: string; bytes: number; sha256: string }> }) => Array<{ ok: boolean }> }> {
  const url = pathToFileURL(join(process.cwd(), "tools", "verify", "verify-lib.mjs")).href;
  return await import(url) as { verifyManifest: (root: URL, manifest: { artifacts: Array<{ path: string; bytes: number; sha256: string }> }) => Array<{ ok: boolean }> };
}

test("received manifest pasuje do zarchiwizowanych plików", async () => {
  const manifest = JSON.parse(await readFile(join(process.cwd(), "legacy", "reference", "received-manifest.json"), "utf8")) as { artifacts: Array<{ path: string; bytes: number; sha256: string }> };
  const { verifyManifest } = await loadVerifier();
  const results = verifyManifest(pathToFileURL(process.cwd() + "/"), manifest);
  assert.ok(results.every((result: { ok: boolean }) => result.ok));
});

test("verifier wykrywa przypadkową zmianę pliku", async () => {
  const source = pathToFileURL(join(process.cwd(), "legacy", "reference", "Tibia_Enhanced_v14_1_DevAPI.html"));
  const temp = await mkdtemp(join(tmpdir(), "coopege-legacy-"));
  const target = join(temp, "runtime.html");
  await cp(source, target);
  const original = await readFile(target);
  await writeFile(target, Buffer.concat([original, Buffer.from("\nmutation")]))
  const manifest = { artifacts: [{ path: "runtime.html", bytes: original.length, sha256: "cd7d0d7527847ebd3f4ddb2c5a8c18d292517815c4989b8f4bd40b0fc5ce900c" }] };
  const { verifyManifest } = await loadVerifier();
  const results = verifyManifest(pathToFileURL(temp + "/"), manifest);
  assert.equal(results[0]?.ok, false);
});
