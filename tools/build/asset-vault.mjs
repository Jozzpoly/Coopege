import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function pngDimensions(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) throw new Error("Nieprawidłowy PNG w Asset Vault.");
  if (bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("PNG Asset Vault nie zaczyna się od IHDR.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function inferAssetCategory(id) {
  const parts = id.split(".");
  if (parts[0] === "texture" && parts[1] === "legacy" && parts.length >= 4) return parts[2];
  if (parts[0] === "texture" && parts.length >= 3) return parts[1];
  return "uncategorized";
}

function safeAssetFilename(id) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(id) || id.includes("..")) throw new Error(`Niebezpieczne ID assetu: ${id}`);
  return `${id}.png`;
}

export function createAssetBaseline(project, projectDir) {
  return project.assets.entries
    .filter((entry) => entry.kind === "texture" && typeof entry.source === "string" && !entry.source.startsWith("data:") && !entry.source.startsWith("procedural://"))
    .map((entry) => {
      const bytes = readFileSync(resolve(projectDir, entry.source));
      const dimensions = pngDimensions(bytes);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (entry.sha256 && entry.sha256 !== sha256) throw new Error(`Baseline Asset Vault ma inne SHA dla ${entry.id}.`);
      return { id: entry.id, category: inferAssetCategory(entry.id), source: entry.source, sha256, ...dimensions, ...(entry.texture ? { texture: structuredClone(entry.texture) } : {}) };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoreZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  const sorted = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [nameText, bytes] of sorted) {
    const name = Buffer.from(nameText, "utf8");
    const crc = crc32(bytes);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    parts.push(local, bytes);

    const entry = Buffer.alloc(46 + name.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(bytes.length, 20);
    entry.writeUInt32LE(bytes.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    name.copy(entry, 46);
    central.push(entry);
    offset += local.length + bytes.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

function htmlEscape(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function exportAssetVault(sourceProject, projectDir, baseline, distDir) {
  const vaultDir = resolve(distDir, "Coopege_M7A_Asset_Vault");
  const textureDir = resolve(vaultDir, "textures");
  mkdirSync(textureDir, { recursive: true });
  const files = new Map();
  const assets = [];
  for (const entry of baseline) {
    const sourcePath = resolve(projectDir, entry.source);
    const filename = `textures/${safeAssetFilename(entry.id)}`;
    const bytes = readFileSync(sourcePath);
    copyFileSync(sourcePath, resolve(vaultDir, filename));
    files.set(filename, bytes);
    assets.push({
      id: entry.id,
      kind: "texture",
      category: entry.category,
      status: "legacy-placeholder",
      filename,
      width: entry.width,
      height: entry.height,
      sha256: entry.sha256,
      source: entry.source,
      ...(entry.texture ? { texture: structuredClone(entry.texture) } : {}),
    });
  }
  const manifest = {
    format: "coopege-asset-pack",
    schemaVersion: 1,
    projectId: sourceProject.manifest.projectId,
    projectVersion: sourceProject.manifest.projectVersion,
    exportedAt: new Date().toISOString(),
    assetCount: assets.length,
    assets,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(vaultDir, "manifest.json"), manifestBytes);
  files.set("manifest.json", manifestBytes);

  const cards = assets.map((entry) => `<figure><div><img src="${entry.filename}" alt=""></div><figcaption><b>${htmlEscape(entry.id)}</b><small>${entry.width}×${entry.height} · ${entry.texture ? `klatka ${entry.texture.frameWidth}×${entry.texture.frameHeight} · ` : ""}${entry.status}</small></figcaption></figure>`).join("");
  const contactSheet = `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Coopege Asset Vault — Contact Sheet</title><style>body{margin:0;background:#0a0b10;color:#eee;font:12px Consolas,monospace}header{position:sticky;top:0;padding:14px 18px;background:#11131bef;border-bottom:1px solid #474b58;z-index:2}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:10px}figure{margin:0;border:1px solid #343844;background:#131620;border-radius:7px;overflow:hidden}figure>div{height:150px;display:grid;place-items:center;background:#0d1017}img{max-width:95%;max-height:95%;image-rendering:pixelated}figcaption{padding:8px}b,small{display:block;overflow-wrap:anywhere}small{color:#999;margin-top:5px}</style><header><b>Coopege Asset Vault</b> · ${assets.length} placeholderów PNG</header><main>${cards}</main></html>`;
  const contactBytes = Buffer.from(contactSheet);
  writeFileSync(resolve(vaultDir, "contact-sheet.html"), contactBytes);
  files.set("contact-sheet.html", contactBytes);

  const readme = Buffer.from("Coopege M7A Asset Vault v1\n\n1. Otwórz contact-sheet.html.\n2. Edytuj PNG w textures, zachowując nazwy.\n3. Zaimportuj cały ZIP w Studio lub zaznacz wiele PNG.\n4. Studio waliduje ID, wymiary, layout klatek, SHA-256/CRC i stosuje paczkę atomowo z undo/redo.\n");
  writeFileSync(resolve(vaultDir, "README.txt"), readme);
  files.set("README.txt", readme);

  const zip = createStoreZip(files);
  writeFileSync(resolve(distDir, "Coopege_M7A_Asset_Vault.zip"), zip);
  return { count: assets.length, zipBytes: zip.length, manifest };
}
