import { assertTextureLayoutDimensions } from "../../../packages/asset-system/src/index.js";
import type { AssetEntry, CoopegeProject, TextureFrameLayout } from "../../../packages/schema/src/types.js";

export interface AssetVaultBaselineEntry {
  id: string;
  category: string;
  source: string;
  sha256: string;
  width: number;
  height: number;
  texture?: TextureFrameLayout;
}

export type AssetPackStatus = "legacy-placeholder" | "custom";

export interface AssetPackManifestEntry {
  id: string;
  kind: "texture";
  category: string;
  status: AssetPackStatus;
  filename: string;
  width: number;
  height: number;
  sha256: string;
  source: string;
  texture?: TextureFrameLayout;
}

export interface AssetPackManifest {
  format: "coopege-asset-pack";
  schemaVersion: 1;
  projectId: string;
  projectVersion: string;
  exportedAt: string;
  assetCount: number;
  assets: AssetPackManifestEntry[];
}

export interface BuiltAssetPack {
  manifest: AssetPackManifest;
  zipBytes: Uint8Array;
  fileNames: string[];
}

export interface ValidatedTextureReplacement {
  assetId: string;
  filename: string;
  source: string;
  sha256: string;
  width: number;
  height: number;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const MAX_PNG_BYTES = 4 * 1024 * 1024;
const MAX_ZIP_BYTES = 64 * 1024 * 1024;
const MAX_ZIP_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 256;

function writeU16(view: DataView, offset: number, value: number): void { view.setUint16(offset, value, true); }
function writeU32(view: DataView, offset: number, value: number): void { view.setUint32(offset, value >>> 0, true); }
function readU16(view: DataView, offset: number): number { return view.getUint16(offset, true); }
function readU32(view: DataView, offset: number): number { return view.getUint32(offset, true); }

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function sha256Fallback(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  const words: number[] = [];
  const bitLength = bytes.length * 8;
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >> 2] = (words[index >> 2] ?? 0) | bytes[index]! << (24 - (index % 4) * 8);
  }
  words[bitLength >> 5] = (words[bitLength >> 5] ?? 0) | 0x80 << (24 - bitLength % 32);
  words[((bitLength + 64 >> 9) << 4) + 15] = bitLength;
  const constants = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const rotate=(value:number,bits:number)=>(value>>>bits)|(value<<(32-bits));
  for (let offset = 0; offset < words.length; offset += 16) {
    const schedule = new Array<number>(64);
    for (let index = 0; index < 16; index += 1) schedule[index] = words[offset + index] ?? 0;
    for (let index = 16; index < 64; index += 1) {
      const a = schedule[index - 15]!; const b = schedule[index - 2]!;
      const s0 = rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3);
      const s1 = rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10);
      schedule[index] = (schedule[index - 16]! + s0 + schedule[index - 7]! + s1) | 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotate(e,6)^rotate(e,11)^rotate(e,25);
      const choose = (e&f)^(~e&g);
      const temp1 = (h+s1+choose+constants[index]!+schedule[index]!)|0;
      const s0 = rotate(a,2)^rotate(a,13)^rotate(a,22);
      const majority = (a&b)^(a&c)^(b&c);
      const temp2 = (s0+majority)|0;
      h=g;g=f;f=e;e=(d+temp1)|0;d=c;c=b;b=a;a=(temp1+temp2)|0;
    }
    h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0;
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(data);
}

export function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) throw new Error("Plik nie ma prawidłowej sygnatury PNG.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ihdr = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
  if (ihdr !== "IHDR") throw new Error("PNG nie zaczyna się od chunku IHDR.");
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error("Wymiary PNG muszą należeć do zakresu 1–4096 px.");
  return { width, height };
}

export function dataUrlToBytes(source: string): Uint8Array {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(source);
  if (!match) throw new Error("Asset nie jest osadzonym PNG data URL.");
  const binary = atob(match[1]!.replaceAll(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function bytesToPngDataUrl(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize)));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

export function inferAssetCategory(id: string): string {
  const parts = id.split(".");
  if (parts[0] === "texture" && parts[1] === "legacy" && parts.length >= 4) return parts[2]!;
  if (parts[0] === "texture" && parts.length >= 3) return parts[1]!;
  return "uncategorized";
}

export function safeAssetFilename(id: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(id) || id.includes("..")) throw new Error(`Niebezpieczne ID assetu: ${id}`);
  return `${id}.png`;
}

function normalizeZipPath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Niebezpieczna ścieżka w ZIP: ${path}`);
  }
  return normalized;
}

export function createStoreZip(files: ReadonlyMap<string, Uint8Array>): Uint8Array {
  if (files.size < 1 || files.size > MAX_ZIP_ENTRIES) throw new Error(`ZIP musi zawierać 1–${MAX_ZIP_ENTRIES} plików.`);
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  const sorted = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [rawPath, bytes] of sorted) {
    const path = normalizeZipPath(rawPath);
    if (bytes.length > MAX_ZIP_ENTRY_BYTES) throw new Error(`Plik ${path} przekracza limit 8 MB.`);
    const name = encoder.encode(path);
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    writeU32(localView, 0, 0x04034b50);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0x0800);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, 0);
    writeU16(localView, 12, 0);
    writeU32(localView, 14, crc);
    writeU32(localView, 18, bytes.length);
    writeU32(localView, 22, bytes.length);
    writeU16(localView, 26, name.length);
    writeU16(localView, 28, 0);
    local.set(name, 30);
    localParts.push(local, bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    writeU32(centralView, 0, 0x02014b50);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0x0800);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, 0);
    writeU16(centralView, 14, 0);
    writeU32(centralView, 16, crc);
    writeU32(centralView, 20, bytes.length);
    writeU32(centralView, 24, bytes.length);
    writeU16(centralView, 28, name.length);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + bytes.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, sorted.length);
  writeU16(endView, 10, sorted.length);
  writeU32(endView, 12, centralDirectory.length);
  writeU32(endView, 16, localOffset);
  writeU16(endView, 20, 0);
  const archive = concatBytes([...localParts, centralDirectory, end]);
  if (archive.length > MAX_ZIP_BYTES) throw new Error("Paczka ZIP przekracza limit 64 MB.");
  return archive;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") throw new Error("Ta przeglądarka nie obsługuje importu skompresowanego ZIP (deflate).");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZipEntries(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  if (bytes.length < 22 || bytes.length > MAX_ZIP_BYTES) throw new Error("Nieprawidłowy rozmiar paczki ZIP.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimum = Math.max(0, bytes.length - 65557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (readU32(view, offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("Nie znaleziono katalogu centralnego ZIP.");
  const disk = readU16(view, eocd + 4);
  const centralDisk = readU16(view, eocd + 6);
  const entriesOnDisk = readU16(view, eocd + 8);
  const entryCount = readU16(view, eocd + 10);
  const centralSize = readU32(view, eocd + 12);
  const centralOffset = readU32(view, eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) throw new Error("Wieloczęściowe archiwa ZIP nie są obsługiwane.");
  if (entryCount < 1 || entryCount > MAX_ZIP_ENTRIES) throw new Error(`ZIP musi zawierać 1–${MAX_ZIP_ENTRIES} plików.`);
  if (centralOffset + centralSize > eocd) throw new Error("Katalog centralny ZIP wychodzi poza plik.");

  const decoder = new TextDecoder();
  const output = new Map<string, Uint8Array>();
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || readU32(view, offset) !== 0x02014b50) throw new Error("Uszkodzony wpis katalogu centralnego ZIP.");
    const flags = readU16(view, offset + 8);
    const method = readU16(view, offset + 10);
    const expectedCrc = readU32(view, offset + 16);
    const compressedSize = readU32(view, offset + 20);
    const uncompressedSize = readU32(view, offset + 24);
    const nameLength = readU16(view, offset + 28);
    const extraLength = readU16(view, offset + 30);
    const commentLength = readU16(view, offset + 32);
    const localOffset = readU32(view, offset + 42);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > bytes.length) throw new Error("Nazwa wpisu ZIP wychodzi poza plik.");
    const rawPath = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const directoryEntry = rawPath.replaceAll("\\", "/").endsWith("/");
    const path = normalizeZipPath(directoryEntry ? rawPath.replaceAll("\\", "/").slice(0, -1) : rawPath);
    offset = nextOffset;
    if (directoryEntry) continue;
    if ((flags & 0x0001) !== 0) throw new Error(`Zaszyfrowany wpis ZIP nie jest obsługiwany: ${path}`);
    if (method !== 0 && method !== 8) throw new Error(`Nieobsługiwana metoda kompresji ZIP (${method}) dla ${path}.`);
    if (compressedSize > MAX_ZIP_ENTRY_BYTES || uncompressedSize > MAX_ZIP_ENTRY_BYTES) throw new Error(`Wpis ${path} przekracza limit 8 MB.`);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_ZIP_BYTES) throw new Error("Rozpakowana paczka ZIP przekracza limit 64 MB.");
    if (localOffset + 30 > bytes.length || readU32(view, localOffset) !== 0x04034b50) throw new Error(`Brak nagłówka lokalnego ZIP dla ${path}.`);
    const localNameLength = readU16(view, localOffset + 26);
    const localExtraLength = readU16(view, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > bytes.length) throw new Error(`Dane wpisu ${path} wychodzą poza ZIP.`);
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    const decoded = method === 0 ? new Uint8Array(compressed) : await inflateRaw(compressed);
    if (decoded.length !== uncompressedSize) throw new Error(`Rozmiar po rozpakowaniu nie zgadza się dla ${path}.`);
    if (crc32(decoded) !== expectedCrc) throw new Error(`CRC-32 nie zgadza się dla ${path}.`);
    if (output.has(path)) throw new Error(`Duplikat ścieżki w ZIP: ${path}`);
    output.set(path, decoded);
  }
  return output;
}

function baselineMap(baseline: readonly AssetVaultBaselineEntry[]): Map<string, AssetVaultBaselineEntry> {
  return new Map(baseline.map((entry) => [entry.id, entry]));
}

function statusFor(entry: AssetEntry, sha256: string, baseline: Map<string, AssetVaultBaselineEntry>): AssetPackStatus {
  return baseline.get(entry.id)?.sha256 === sha256 ? "legacy-placeholder" : "custom";
}

function htmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function createContactSheetHtml(manifest: AssetPackManifest, sources: ReadonlyMap<string, string>): string {
  const cards = manifest.assets.map((entry) => `<figure data-status="${entry.status}"><div><img src="${sources.get(entry.id) ?? ""}" alt=""></div><figcaption><b>${htmlEscape(entry.id)}</b><small>${entry.width}×${entry.height} · ${entry.status}</small></figcaption></figure>`).join("");
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Coopege Asset Vault — Contact Sheet</title><style>body{margin:0;background:#0a0b10;color:#eee;font:12px Consolas,monospace}header{position:sticky;top:0;padding:14px 18px;background:#11131beF;border-bottom:1px solid #474b58;z-index:2}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:10px}figure{margin:0;border:1px solid #343844;background:#131620;border-radius:7px;overflow:hidden}figure[data-status=custom]{border-color:#a36ec0}figure>div{height:150px;display:grid;place-items:center;background-image:linear-gradient(45deg,#20242d 25%,transparent 25%),linear-gradient(-45deg,#20242d 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#20242d 75%),linear-gradient(-45deg,transparent 75%,#20242d 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}img{max-width:95%;max-height:95%;image-rendering:pixelated}figcaption{padding:8px}b,small{display:block;overflow-wrap:anywhere}small{color:#999;margin-top:5px}</style><header><b>Coopege Asset Vault</b> · ${manifest.assetCount} tekstur · ${htmlEscape(manifest.projectVersion)}</header><main>${cards}</main></html>`;
}

export async function validateTextureBytes(assetId: string, filename: string, bytes: Uint8Array): Promise<ValidatedTextureReplacement> {
  if (bytes.length < 24 || bytes.length > MAX_PNG_BYTES) throw new Error(`${filename}: PNG musi mieć od 24 B do 4 MB.`);
  const dimensions = parsePngDimensions(bytes);
  const sha256 = await sha256Hex(bytes);
  return { assetId, filename, source: bytesToPngDataUrl(bytes), sha256, ...dimensions };
}

export async function buildAssetPack(project: CoopegeProject, baselineEntries: readonly AssetVaultBaselineEntry[]): Promise<BuiltAssetPack> {
  const baseline = baselineMap(baselineEntries);
  const files = new Map<string, Uint8Array>();
  const sources = new Map<string, string>();
  const manifestAssets: AssetPackManifestEntry[] = [];
  for (const entry of project.assets.entries.filter((candidate) => candidate.kind === "texture").sort((a, b) => a.id.localeCompare(b.id))) {
    const bytes = dataUrlToBytes(entry.source);
    if (bytes.length > MAX_PNG_BYTES) throw new Error(`${entry.id}: PNG przekracza limit 4 MB.`);
    const dimensions = parsePngDimensions(bytes);
    const sha256 = await sha256Hex(bytes);
    const filename = `textures/${safeAssetFilename(entry.id)}`;
    const original = baseline.get(entry.id);
    manifestAssets.push({
      id: entry.id,
      kind: "texture",
      category: original?.category ?? inferAssetCategory(entry.id),
      status: statusFor(entry, sha256, baseline),
      filename,
      width: dimensions.width,
      height: dimensions.height,
      sha256,
      source: original?.source ?? "embedded-project",
      ...(entry.texture ? { texture: structuredClone(entry.texture) } : {}),
    });
    files.set(filename, bytes);
    sources.set(entry.id, entry.source);
  }
  const manifest: AssetPackManifest = {
    format: "coopege-asset-pack",
    schemaVersion: 1,
    projectId: project.manifest.projectId,
    projectVersion: project.manifest.projectVersion,
    exportedAt: new Date().toISOString(),
    assetCount: manifestAssets.length,
    assets: manifestAssets,
  };
  files.set("manifest.json", new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`));
  files.set("contact-sheet.html", new TextEncoder().encode(createContactSheetHtml(manifest, sources)));
  files.set("README.txt", new TextEncoder().encode("Coopege Asset Vault v1\n\nEdytuj pliki PNG w katalogu textures bez zmiany nazw lub przygotuj nowy manifest. Import ZIP w Coopege Studio waliduje ID, wymiary, SHA-256 i wykonuje całą podmianę atomowo.\n"));
  const zipBytes = createStoreZip(files);
  return { manifest, zipBytes, fileNames: [...files.keys()].sort() };
}

function parseManifest(value: unknown): AssetPackManifest {
  if (!value || typeof value !== "object") throw new Error("manifest.json nie jest obiektem.");
  const manifest = value as Partial<AssetPackManifest>;
  if (manifest.format !== "coopege-asset-pack" || manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error("Nieobsługiwany format manifestu Asset Pack.");
  if (typeof manifest.projectId !== "string" || typeof manifest.projectVersion !== "string" || typeof manifest.exportedAt !== "string" || typeof manifest.assetCount !== "number") throw new Error("Manifest Asset Pack ma niepełny nagłówek.");
  if (manifest.assetCount !== manifest.assets.length) throw new Error("assetCount manifestu nie zgadza się z listą assetów.");
  return manifest as AssetPackManifest;
}

export async function replacementsFromAssetPack(zipBytes: Uint8Array, project: CoopegeProject): Promise<ValidatedTextureReplacement[]> {
  const files = await readZipEntries(zipBytes);
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) throw new Error("Paczka nie zawiera manifest.json.");
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(manifestBytes)); }
  catch { throw new Error("manifest.json nie jest prawidłowym JSON-em."); }
  const manifest = parseManifest(parsed);
  const knownIds = new Set(project.assets.entries.filter((entry) => entry.kind === "texture").map((entry) => entry.id));
  const seen = new Set<string>();
  const replacements: ValidatedTextureReplacement[] = [];
  for (const entry of manifest.assets) {
    if (!entry || entry.kind !== "texture" || typeof entry.id !== "string" || typeof entry.filename !== "string") throw new Error("Manifest zawiera nieprawidłowy wpis tekstury.");
    safeAssetFilename(entry.id);
    if (!knownIds.has(entry.id)) throw new Error(`Paczka odwołuje się do nieznanego assetu: ${entry.id}`);
    if (seen.has(entry.id)) throw new Error(`Manifest zawiera duplikat assetu: ${entry.id}`);
    seen.add(entry.id);
    const path = normalizeZipPath(entry.filename);
    const bytes = files.get(path);
    if (!bytes) throw new Error(`Brak pliku ${path} dla ${entry.id}.`);
    const replacement = await validateTextureBytes(entry.id, path, bytes);
    const target = project.assets.entries.find((candidate) => candidate.id === entry.id && candidate.kind === "texture");
    if (!target) throw new Error(`Nieznany asset tekstury ${entry.id}.`);
    assertTextureLayoutDimensions(target, replacement.width, replacement.height);
    if (typeof entry.width === "number" && replacement.width !== entry.width) throw new Error(`${entry.id}: szerokość PNG nie zgadza się z manifestem.`);
    if (typeof entry.height === "number" && replacement.height !== entry.height) throw new Error(`${entry.id}: wysokość PNG nie zgadza się z manifestem.`);
    if (typeof entry.sha256 === "string" && replacement.sha256 !== entry.sha256) throw new Error(`${entry.id}: SHA-256 PNG nie zgadza się z manifestem.`);
    replacements.push(replacement);
  }
  if (replacements.length === 0) throw new Error("Paczka nie zawiera żadnych tekstur do importu.");
  return replacements;
}

export async function replacementsFromPngFiles(
  files: readonly { name: string; bytes: Uint8Array }[],
  project: CoopegeProject,
  baselineEntries: readonly AssetVaultBaselineEntry[],
): Promise<ValidatedTextureReplacement[]> {
  if (files.length < 1 || files.length > MAX_ZIP_ENTRIES) throw new Error(`Import musi zawierać 1–${MAX_ZIP_ENTRIES} plików PNG.`);
  const knownIds = new Set(project.assets.entries.filter((entry) => entry.kind === "texture").map((entry) => entry.id));
  const sourceNames = new Map<string, string>();
  for (const entry of baselineEntries) {
    const basename = entry.source.replaceAll("\\", "/").split("/").at(-1)?.toLowerCase();
    if (basename) sourceNames.set(basename, entry.id);
  }
  const seen = new Set<string>();
  const replacements: ValidatedTextureReplacement[] = [];
  for (const file of files) {
    const basename = file.name.replaceAll("\\", "/").split("/").at(-1) ?? file.name;
    if (!basename.toLowerCase().endsWith(".png")) throw new Error(`${file.name}: wymagane rozszerzenie .png.`);
    const stem = basename.slice(0, -4);
    const assetId = knownIds.has(stem) ? stem : sourceNames.get(basename.toLowerCase());
    if (!assetId) throw new Error(`${file.name}: nazwa nie pasuje do ID ani oryginalnej nazwy żadnego assetu.`);
    if (seen.has(assetId)) throw new Error(`Kilka plików mapuje się na ${assetId}.`);
    seen.add(assetId);
    const replacement = await validateTextureBytes(assetId, file.name, file.bytes);
    const target = project.assets.entries.find((candidate) => candidate.id === assetId && candidate.kind === "texture");
    if (!target) throw new Error(`Nieznany asset tekstury ${assetId}.`);
    assertTextureLayoutDimensions(target, replacement.width, replacement.height);
    replacements.push(replacement);
  }
  return replacements;
}
