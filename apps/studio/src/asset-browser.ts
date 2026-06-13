import { assertTextureLayoutDimensions, isPngDataUrl } from "../../../packages/asset-system/src/index.js";
import type { AssetEntry, CoopegeProject } from "../../../packages/schema/src/types.js";
import {
  buildAssetPack,
  replacementsFromAssetPack,
  replacementsFromPngFiles,
  validateTextureBytes,
  type AssetVaultBaselineEntry,
  type BuiltAssetPack,
  type ValidatedTextureReplacement,
} from "./asset-pack.js";

export type StudioEditExecutor = (label: string, mutate: (draft: CoopegeProject) => void) => boolean;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Brak elementu Asset Browser: ${selector}.`);
  return element;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export class AssetBrowser {
  private project: CoopegeProject | undefined;
  private selectedAssetId = "";
  private readonly baselineById: Map<string, AssetVaultBaselineEntry>;
  private readonly search = requiredElement<HTMLInputElement>("#assetSearch");
  private readonly list = requiredElement<HTMLElement>("#assetList");
  private readonly preview = requiredElement<HTMLImageElement>("#assetPreview");
  private readonly empty = requiredElement<HTMLElement>("#assetEmpty");
  private readonly details = requiredElement<HTMLElement>("#assetDetails");
  private readonly file = requiredElement<HTMLInputElement>("#assetFile");
  private readonly batchFiles = requiredElement<HTMLInputElement>("#assetBatchFiles");
  private readonly packFile = requiredElement<HTMLInputElement>("#assetPackFile");
  private readonly importButton = requiredElement<HTMLButtonElement>("#assetImportButton");
  private readonly batchImportButton = requiredElement<HTMLButtonElement>("#assetBatchImportButton");
  private readonly packImportButton = requiredElement<HTMLButtonElement>("#assetPackImportButton");
  private readonly packExportButton = requiredElement<HTMLButtonElement>("#assetPackExportButton");
  private readonly downloadButton = requiredElement<HTMLButtonElement>("#assetDownloadButton");
  private readonly status = requiredElement<HTMLElement>("#assetStatus");

  constructor(
    private readonly execute: StudioEditExecutor,
    private readonly baselineEntries: readonly AssetVaultBaselineEntry[],
  ) {
    this.baselineById = new Map(baselineEntries.map((entry) => [entry.id, entry]));
    this.search.addEventListener("input", () => this.renderList());
    this.importButton.addEventListener("click", () => this.file.click());
    this.file.addEventListener("change", () => { void this.importSelected(); });
    this.batchImportButton.addEventListener("click", () => this.batchFiles.click());
    this.batchFiles.addEventListener("change", () => { void this.importBatchFiles(); });
    this.packImportButton.addEventListener("click", () => this.packFile.click());
    this.packFile.addEventListener("change", () => { void this.importPackFile(); });
    this.packExportButton.addEventListener("click", () => { void this.exportPack(true).catch(() => undefined); });
    this.downloadButton.addEventListener("click", () => this.downloadSelected());
  }

  setProject(project: CoopegeProject): void {
    this.project = project;
    if (!project.assets.entries.some((entry) => entry.id === this.selectedAssetId)) {
      this.selectedAssetId = project.assets.entries.find((entry) => entry.kind === "texture")?.id ?? "";
    }
    this.renderList();
    this.renderSelected();
  }

  get selectedId(): string { return this.selectedAssetId; }

  get diagnostics(): { baselineCount: number; legacyPlaceholderCount: number; customCount: number; exportReady: boolean } {
    const entries = this.project?.assets.entries.filter((entry) => entry.kind === "texture") ?? [];
    const legacyPlaceholderCount = entries.filter((entry) => this.baselineById.get(entry.id)?.sha256 === entry.sha256).length;
    return {
      baselineCount: this.baselineEntries.length,
      legacyPlaceholderCount,
      customCount: entries.length - legacyPlaceholderCount,
      exportReady: entries.length > 0 && entries.every((entry) => isPngDataUrl(entry.source)),
    };
  }

  async debugBuildPack(): Promise<{ manifest: BuiltAssetPack["manifest"]; zipByteLength: number; fileNames: string[] }> {
    const pack = await this.exportPack(false);
    return { manifest: pack.manifest, zipByteLength: pack.zipBytes.length, fileNames: pack.fileNames };
  }

  async debugImportPngFiles(files: readonly File[]): Promise<number> {
    return this.importFiles(files);
  }

  async debugImportPack(file: File): Promise<number> {
    if (!this.project) throw new Error("Brak projektu do importu Asset Pack.");
    const replacements = await replacementsFromAssetPack(new Uint8Array(await file.arrayBuffer()), this.project);
    this.applyReplacements(`Import Asset Pack (${replacements.length} PNG)`, replacements);
    return replacements.length;
  }

  private textureEntries(): AssetEntry[] {
    const query = this.search.value.trim().toLowerCase();
    return (this.project?.assets.entries ?? [])
      .filter((entry) => entry.kind === "texture")
      .filter((entry) => !query || entry.id.toLowerCase().includes(query) || entry.source.toLowerCase().includes(query));
  }

  private renderList(): void {
    this.list.innerHTML = "";
    const entries = this.textureEntries();
    for (const entry of entries) {
      const button = document.createElement("button");
      button.className = `asset-row${entry.id === this.selectedAssetId ? " active" : ""}`;
      button.type = "button";
      const image = document.createElement("img");
      image.src = entry.source;
      image.alt = "";
      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = entry.id;
      const small = document.createElement("small");
      const baseline = this.baselineById.get(entry.id);
      const state = baseline?.sha256 === entry.sha256 ? "placeholder legacy" : "custom";
      small.textContent = isPngDataUrl(entry.source) ? `PNG osadzony · ${state}` : entry.source;
      text.append(strong, small);
      button.append(image, text);
      button.addEventListener("click", () => {
        this.selectedAssetId = entry.id;
        this.renderList();
        this.renderSelected();
      });
      this.list.append(button);
    }
    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-message";
      empty.textContent = "Brak assetów pasujących do filtra.";
      this.list.append(empty);
    }
  }

  private selected(): AssetEntry | undefined {
    return this.project?.assets.entries.find((entry) => entry.id === this.selectedAssetId);
  }

  private renderSelected(): void {
    const entry = this.selected();
    if (!entry) {
      this.preview.removeAttribute("src");
      this.preview.classList.add("hidden");
      this.empty.classList.remove("hidden");
      this.details.textContent = "Nie wybrano assetu.";
      this.importButton.disabled = true;
      this.downloadButton.disabled = true;
      return;
    }
    const baseline = this.baselineById.get(entry.id);
    const state = baseline?.sha256 === entry.sha256 ? "legacy-placeholder" : "custom";
    this.preview.src = entry.source;
    this.preview.classList.remove("hidden");
    this.empty.classList.add("hidden");
    this.importButton.disabled = false;
    this.downloadButton.disabled = !isPngDataUrl(entry.source);
    this.details.textContent = [
      `id: ${entry.id}`,
      `kind: ${entry.kind}`,
      `status: ${state}`,
      `source: ${isPngDataUrl(entry.source) ? `data:image/png;base64… (${entry.source.length.toLocaleString("pl-PL")} znaków)` : entry.source}`,
      `sha256: ${entry.sha256 ?? "brak"}`,
      baseline ? `legacy source: ${baseline.source} · ${baseline.width}×${baseline.height}` : "legacy source: brak wpisu bazowego",
      entry.texture ? `atlas: klatka ${entry.texture.frameWidth}×${entry.texture.frameHeight} · animacja ${(entry.texture.animationFrames ?? [entry.texture.idleFrame ?? 0]).join(",")}` : "atlas: pojedynczy obraz / auto",
      "Import pojedynczy, paczkowy i ZIP jest atomowy oraz obsługuje undo/redo.",
    ].join("\n");
  }

  private applyReplacements(label: string, replacements: readonly ValidatedTextureReplacement[]): boolean {
    if (!this.project) throw new Error("Brak projektu do podmiany tekstur.");
    for (const replacement of replacements) {
      const target = this.project.assets.entries.find((candidate) => candidate.id === replacement.assetId && candidate.kind === "texture");
      if (!target) throw new Error(`Nieznany asset tekstury ${replacement.assetId}.`);
      assertTextureLayoutDimensions(target, replacement.width, replacement.height);
    }
    const accepted = this.execute(label, (draft) => {
      for (const replacement of replacements) {
        const target = draft.assets.entries.find((candidate) => candidate.id === replacement.assetId && candidate.kind === "texture");
        if (!target) throw new Error(`Asset ${replacement.assetId} zniknął podczas operacji.`);
        target.source = replacement.source;
        target.sha256 = replacement.sha256;
      }
      draft.manifest.updatedAt = new Date().toISOString();
    });
    if (accepted) {
      this.status.dataset.state = "good";
      this.status.textContent = `Zastosowano ${replacements.length} PNG jako jedną komendę undo/redo.`;
    }
    return accepted;
  }

  private async importSelected(): Promise<void> {
    const entry = this.selected();
    const [file] = this.file.files ?? [];
    this.file.value = "";
    if (!entry || !file) return;
    try {
      if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) throw new Error("Wybierz prawidłowy plik PNG.");
      const replacement = await validateTextureBytes(entry.id, file.name, new Uint8Array(await file.arrayBuffer()));
      if (this.applyReplacements(`Podmień PNG ${entry.id}`, [replacement])) {
        this.status.textContent = `PNG ${file.name} (${replacement.width}×${replacement.height}) został zastosowany.`;
      }
    } catch (error) {
      this.setError(error);
    }
  }

  private async importFiles(files: readonly File[]): Promise<number> {
    if (!this.project) throw new Error("Brak projektu do importu PNG.");
    const inputs = await Promise.all(files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
    const replacements = await replacementsFromPngFiles(inputs, this.project, this.baselineEntries);
    this.applyReplacements(`Import paczkowy (${replacements.length} PNG)`, replacements);
    return replacements.length;
  }

  private async importBatchFiles(): Promise<void> {
    const files = [...(this.batchFiles.files ?? [])];
    this.batchFiles.value = "";
    if (files.length === 0) return;
    try { await this.importFiles(files); }
    catch (error) { this.setError(error); }
  }

  private async importPackFile(): Promise<void> {
    const [file] = this.packFile.files ?? [];
    this.packFile.value = "";
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Wybierz paczkę ZIP Asset Vault.");
      const count = await this.debugImportPack(file);
      this.status.dataset.state = "good";
      this.status.textContent = `Paczka ${file.name}: zastosowano ${count} PNG atomowo.`;
    } catch (error) {
      this.setError(error);
    }
  }

  private async exportPack(download: boolean): Promise<BuiltAssetPack> {
    if (!this.project) throw new Error("Brak projektu do eksportu Asset Pack.");
    try {
      const pack = await buildAssetPack(this.project, this.baselineEntries);
      if (download) {
        const safeProjectId = this.project.manifest.projectId.replaceAll(/[^A-Za-z0-9._-]/g, "_");
        downloadBlob(`${safeProjectId}-asset-pack-v1.zip`, new Blob([pack.zipBytes], { type: "application/zip" }));
        this.status.dataset.state = "good";
        this.status.textContent = `Wyeksportowano Asset Pack: ${pack.manifest.assetCount} PNG, manifest i contact sheet.`;
      }
      return pack;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }

  private setError(error: unknown): void {
    this.status.dataset.state = "bad";
    this.status.textContent = error instanceof Error ? error.message : String(error);
  }

  private downloadSelected(): void {
    const entry = this.selected();
    if (!entry || !isPngDataUrl(entry.source)) return;
    const anchor = document.createElement("a");
    anchor.href = entry.source;
    anchor.download = `${entry.id}.png`;
    anchor.click();
  }
}
