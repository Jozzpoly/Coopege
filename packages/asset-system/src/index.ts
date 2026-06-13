import type { AssetEntry, StableId } from "../../schema/src/types.js";

export type AssetLoadState = "idle" | "loading" | "ready" | "error";

export interface AssetTextureRecord {
  entry: AssetEntry;
  state: AssetLoadState;
  image?: HTMLImageElement;
  error?: string;
}

export interface AssetResolverStats {
  totalTextures: number;
  readyTextures: number;
  failedTextures: number;
  loadingTextures: number;
}

export function isPngDataUrl(source: string): boolean {
  return /^data:image\/png;base64,[a-z0-9+/=\r\n]+$/i.test(source);
}

export function isSafeProjectAssetSource(source: string, kind: AssetEntry["kind"]): boolean {
  if (/^(?:https?:|javascript:|vbscript:|file:)/i.test(source.trim())) return false;
  if (/^procedural:\/\/[a-z0-9_./-]+$/i.test(source)) return true;
  if (source.startsWith("data:")) {
    return kind === "texture" && isPngDataUrl(source);
  }
  if (source.includes("\\") || source.includes("..") || source.startsWith("/")) return false;
  if (kind === "texture") return /^assets\/[a-z0-9_./-]+\.png$/i.test(source);
  return /^[a-z0-9_./-]+$/i.test(source);
}

export function textureLayoutDimensionIssues(entry: AssetEntry, width: number, height: number): string[] {
  const layout = entry.texture;
  if (!layout) return [];
  const issues: string[] = [];
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) return ["PNG ma nieprawidłowe wymiary."];
  if (width % layout.frameWidth !== 0) issues.push(`szerokość ${width}px nie jest wielokrotnością frameWidth ${layout.frameWidth}px`);
  if (height % layout.frameHeight !== 0) issues.push(`wysokość ${height}px nie jest wielokrotnością frameHeight ${layout.frameHeight}px`);
  const columns = Math.floor(width / layout.frameWidth);
  const rows = Math.floor(height / layout.frameHeight);
  if (columns < 1 || rows < 1) issues.push("atlas nie zawiera ani jednej pełnej klatki");
  if ((layout.idleFrame ?? 0) >= columns) issues.push(`idleFrame ${layout.idleFrame ?? 0} wykracza poza ${columns} kolumn`);
  for (const frame of layout.animationFrames ?? []) if (frame >= columns) issues.push(`animationFrame ${frame} wykracza poza ${columns} kolumn`);
  if (layout.directionRows) {
    for (const [direction, row] of Object.entries(layout.directionRows)) if (row >= rows) issues.push(`wiersz kierunku ${direction}=${row} wykracza poza ${rows} rzędów`);
  }
  return [...new Set(issues)];
}

export function assertTextureLayoutDimensions(entry: AssetEntry, width: number, height: number): void {
  const issues = textureLayoutDimensionIssues(entry, width, height);
  if (issues.length > 0) throw new Error(`${entry.id}: PNG ${width}×${height} nie pasuje do layoutu atlasu — ${issues.join("; ")}.`);
}

export class AssetResolver {
  private records = new Map<StableId, AssetTextureRecord>();

  constructor(entries: readonly AssetEntry[] = []) {
    this.setEntries(entries);
  }

  setEntries(entries: readonly AssetEntry[]): void {
    const previous = this.records;
    this.records = new Map();
    for (const entry of entries) {
      if (entry.kind !== "texture") continue;
      const old = previous.get(entry.id);
      if (old?.entry.source === entry.source) {
        this.records.set(entry.id, { ...old, entry });
      } else {
        this.records.set(entry.id, { entry, state: "idle" });
      }
    }
  }

  get(assetId: StableId | undefined): AssetTextureRecord | undefined {
    if (!assetId) return undefined;
    return this.records.get(assetId);
  }

  image(assetId: StableId | undefined): HTMLImageElement | undefined {
    const record = this.get(assetId);
    return record?.state === "ready" ? record.image : undefined;
  }

  async preloadAll(): Promise<AssetResolverStats> {
    await Promise.all([...this.records.keys()].map((id) => this.load(id)));
    return this.stats();
  }

  async load(assetId: StableId): Promise<AssetTextureRecord | undefined> {
    const record = this.records.get(assetId);
    if (!record || record.state === "ready" || record.state === "error") return record;
    if (record.state === "loading") {
      await new Promise<void>((resolve) => {
        const timer = window.setInterval(() => {
          const current = this.records.get(assetId);
          if (!current || current.state === "ready" || current.state === "error") {
            window.clearInterval(timer);
            resolve();
          }
        }, 8);
      });
      return this.records.get(assetId);
    }
    record.state = "loading";
    const image = new Image();
    image.decoding = "async";
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Nie udało się wczytać tekstury ${assetId}.`));
        image.src = record.entry.source;
      });
      record.state = "ready";
      record.image = image;
      delete record.error;
    } catch (error) {
      record.state = "error";
      record.error = error instanceof Error ? error.message : String(error);
      delete record.image;
    }
    return record;
  }

  stats(): AssetResolverStats {
    let readyTextures = 0;
    let failedTextures = 0;
    let loadingTextures = 0;
    for (const record of this.records.values()) {
      if (record.state === "ready") readyTextures += 1;
      else if (record.state === "error") failedTextures += 1;
      else if (record.state === "loading") loadingTextures += 1;
    }
    return {
      totalTextures: this.records.size,
      readyTextures,
      failedTextures,
      loadingTextures,
    };
  }
}
