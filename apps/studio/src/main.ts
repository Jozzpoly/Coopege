import type { CoopegeProject } from "../../../packages/schema/src/types.js";
import {
  BRIDGE_TYPES,
  createBridgeEnvelope,
  createSessionNonce,
  isBridgeEnvelope,
  type BridgeEnvelope,
  type BridgeMessageType,
  type BridgePayloadByType,
  type ProjectAppliedPayload,
  type ProjectRejectedPayload,
  type RuntimeReadyPayload,
  type GameplayTestResultPayload,
} from "../../../packages/dev-protocol/src/index.js";
import {
  CommandBus,
  ProjectStore,
  createProjectCommand,
  type ProjectCommand,
} from "../../../packages/project-store/src/index.js";
import { stableChecksum, stableStringify, validateProject, type ValidationIssue, type ValidationResult } from "../../../packages/validation/src/index.js";
import { AssetBrowser } from "./asset-browser.js";
import type { AssetVaultBaselineEntry } from "./asset-pack.js";
import { AbilityComposer } from "./ability-composer.js";
import { CheckpointStore, type StudioCheckpoint } from "./checkpoint-store.js";
import { ContentBrowser } from "./content-browser.js";
import { MapEditor } from "./map-editor.js";

declare global {
  interface Window {
    __COOPEGE_PROJECT__?: unknown;
    __COOPEGE_PREVIEW_HTML__?: string;
    __COOPEGE_RUNTIME_EXPORT_TEMPLATE__?: string;
    __COOPEGE_ASSET_VAULT_BASELINE__?: AssetVaultBaselineEntry[];
    __COOPEGE_STUDIO_DIAGNOSTICS__?: StudioDiagnostics;
    __COOPEGE_STUDIO_DEBUG__?: {
      project(): CoopegeProject;
      history(): ReturnType<CommandBus<CoopegeProject, ValidationIssue>["history"]>;
      abilityDiagnostics(): AbilityComposer["diagnostics"];
      assetVaultDiagnostics(): AssetBrowser["diagnostics"];
      buildAssetPack(): ReturnType<AssetBrowser["debugBuildPack"]>;
      importAssetPngFiles(files: readonly File[]): ReturnType<AssetBrowser["debugImportPngFiles"]>;
      importAssetPack(file: File): ReturnType<AssetBrowser["debugImportPack"]>;
    };
  }
}

interface StudioDiagnostics {
  ready: boolean;
  bridgeReady: boolean;
  storeRevision: number;
  previewRevision: number;
  previewStudioRevision: number;
  undoDepth: number;
  redoDepth: number;
  projectName: string;
  projectChecksum: string;
  lastBridgeError: string;
  runtimeCapabilities: string[];
  activePage: string;
  assetCount: number;
  embeddedAssetCount: number;
  assetVaultBaselineCount: number;
  legacyPlaceholderAssetCount: number;
  customAssetCount: number;
  assetPackExportReady: boolean;
  mapFloorId: string;
  mapTool: string;
  mapZoom: number;
  mapTransitionCount: number;
  contentKind: string;
  checkpointCount: number;
  standaloneExportReady: boolean;
  deltaHistoryDepth: number;
  abilityGraphId: string;
  abilityNodeId: string;
  abilityGraphCount: number;
  abilityGraphValid: boolean;
  abilityLastPlanOk: boolean | null;
}

interface RecoveryRecord {
  format: "coopege-studio-recovery";
  savedAt: string;
  project: CoopegeProject;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Brak wymaganego elementu Studia: ${selector}.`);
  return element;
}

function safeEmbeddedJson(value: unknown): string {
  return stableStringify(value, 0).replaceAll("<", "\\u003c");
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const initialValidation = validateProject(window.__COOPEGE_PROJECT__);
if (!initialValidation.ok) throw new Error(`Wbudowany projekt Studia jest niepoprawny: ${stableStringify(initialValidation.issues)}`);
if (typeof window.__COOPEGE_PREVIEW_HTML__ !== "string") throw new Error("Brak wbudowanego dokumentu preview runtime.");
if (typeof window.__COOPEGE_RUNTIME_EXPORT_TEMPLATE__ !== "string") throw new Error("Brak szablonu eksportu standalone runtime.");
if (!Array.isArray(window.__COOPEGE_ASSET_VAULT_BASELINE__)) throw new Error("Brak baseline Asset Vault.");

const initialProject = window.__COOPEGE_PROJECT__ as CoopegeProject;
const store = new ProjectStore(initialProject);
const commands = new CommandBus<CoopegeProject, ValidationIssue>(store, validateProject, 120);
const checkpoints = new CheckpointStore();
function recoveryKey(projectId: string): string { return `coopege.studio.recovery.${projectId}`; }

const fileInput = requiredElement<HTMLInputElement>("#projectFile");
const validateButton = requiredElement<HTMLButtonElement>("#validateButton");
const exportButton = requiredElement<HTMLButtonElement>("#exportButton");
const standaloneButton = requiredElement<HTMLButtonElement>("#standaloneButton");
const undoButton = requiredElement<HTMLButtonElement>("#undoButton");
const redoButton = requiredElement<HTMLButtonElement>("#redoButton");
const checkpointButton = requiredElement<HTMLButtonElement>("#checkpointButton");
const restoreButton = requiredElement<HTMLButtonElement>("#restoreButton");
const summary = requiredElement<HTMLElement>("#summary");
const issues = requiredElement<HTMLElement>("#issues");
const validationIssues = requiredElement<HTMLElement>("#validationIssues");
const validationSummary = requiredElement<HTMLElement>("#validationSummary");
const validationDetails = requiredElement<HTMLElement>("#validationDetails");
const tree = requiredElement<HTMLElement>("#tree");
const history = requiredElement<HTMLElement>("#history");
const bridgeStatus = requiredElement<HTMLElement>("#bridgeStatus");
const revisionBadge = requiredElement<HTMLElement>("#revisionBadge");
const dirtyBadge = requiredElement<HTMLElement>("#dirtyBadge");
const previewFrame = requiredElement<HTMLIFrameElement>("#previewFrame");
const projectNameInput = requiredElement<HTMLInputElement>("#projectNameInput");
const startFloorSelect = requiredElement<HTMLSelectElement>("#startFloorSelect");
const startXInput = requiredElement<HTMLInputElement>("#startXInput");
const startYInput = requiredElement<HTMLInputElement>("#startYInput");
const previewDetails = requiredElement<HTMLElement>("#previewDetails");
const checkpointList = requiredElement<HTMLElement>("#checkpointList");
const assetCount = requiredElement<HTMLElement>("#assetCount");
const mapFocusStartButton = requiredElement<HTMLButtonElement>("#mapFocusStartButton");
const pageButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-page]")];
const pagePanels = [...document.querySelectorAll<HTMLElement>("[data-page-panel]")];

const diagnostics: StudioDiagnostics = {
  ready: false,
  bridgeReady: false,
  storeRevision: 0,
  previewRevision: 0,
  previewStudioRevision: 0,
  undoDepth: 0,
  redoDepth: 0,
  projectName: "",
  projectChecksum: "",
  lastBridgeError: "",
  runtimeCapabilities: [],
  activePage: "project",
  assetCount: 0,
  embeddedAssetCount: 0,
  assetVaultBaselineCount: 0,
  legacyPlaceholderAssetCount: 0,
  customAssetCount: 0,
  assetPackExportReady: false,
  mapFloorId: "",
  mapTool: "brush",
  mapZoom: 22,
  mapTransitionCount: 0,
  contentKind: "classes",
  checkpointCount: 0,
  standaloneExportReady: true,
  deltaHistoryDepth: 0,
  abilityGraphId: "",
  abilityNodeId: "",
  abilityGraphCount: 0,
  abilityGraphValid: false,
  abilityLastPlanOk: null,
};
window.__COOPEGE_STUDIO_DIAGNOSTICS__ = diagnostics;

class PreviewBridgeClient {
  private readonly nonce = createSessionNonce();
  private sequence = 0;
  private pending = new Map<string, {
    resolve: (message: BridgeEnvelope) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>();

  constructor(
    private readonly frame: HTMLIFrameElement,
    previewHtml: string,
  ) {
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (event.source !== this.frame.contentWindow || !isBridgeEnvelope(event.data, this.nonce)) return;
      const message = event.data as BridgeEnvelope;
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      this.pending.delete(message.requestId);
      pending.resolve(message);
    });
    this.frame.srcdoc = previewHtml.replaceAll("__COOPEGE_SESSION_NONCE__", this.nonce);
  }

  async connect(): Promise<RuntimeReadyPayload> {
    if (!this.frame.contentWindow) throw new Error("Preview iframe nie ma contentWindow.");
    await new Promise<void>((resolve) => this.frame.addEventListener("load", () => resolve(), { once: true }));
    const response = await this.request(BRIDGE_TYPES.studioHello, {
      studioVersion: "0.1.0-m7-owner-accepted",
      schemaVersion: 2,
      capabilities: [
        "project.store",
        "command.undo-redo",
        "command.map-delta",
        "asset.import.png",
        "map.editor.rle",
        "map.transitions.visible",
        "content.browser",
        "project.preview.atomic",
        "runtime.export.standalone",
        "gameplay-language.v1",
        "ability-composer.v1",
        "gameplay.test-plan",
        "project.schema.v2",
      ],
    });
    if (response.type !== BRIDGE_TYPES.runtimeReady) throw new Error(`Oczekiwano runtime.ready, otrzymano ${response.type}.`);
    return response.payload as RuntimeReadyPayload;
  }

  async applyProject(project: CoopegeProject, studioRevision: number): Promise<ProjectAppliedPayload> {
    const response = await this.request(BRIDGE_TYPES.projectApply, { project, studioRevision });
    if (response.type === BRIDGE_TYPES.projectApplied) return response.payload as ProjectAppliedPayload;
    if (response.type === BRIDGE_TYPES.projectRejected) {
      const rejected = response.payload as ProjectRejectedPayload;
      throw new Error(rejected.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    }
    throw new Error(`Nieoczekiwana odpowiedź preview: ${response.type}.`);
  }

  async testGameplay(graphId: string, playerId: string) {
    const response = await this.request(BRIDGE_TYPES.gameplayTest, { graphId, playerId });
    if (response.type === BRIDGE_TYPES.gameplayTestResult) return (response.payload as GameplayTestResultPayload).result;
    if (response.type === BRIDGE_TYPES.error) throw new Error((response.payload as { message: string }).message);
    throw new Error(`Nieoczekiwana odpowiedź testu gameplayu: ${response.type}.`);
  }

  private request<TType extends BridgeMessageType>(
    type: TType,
    payload: BridgePayloadByType[TType],
  ): Promise<BridgeEnvelope> {
    const target = this.frame.contentWindow;
    if (!target) return Promise.reject(new Error("Preview iframe nie jest gotowy."));
    this.sequence += 1;
    const requestId = `studio.${this.sequence}`;
    const envelope = createBridgeEnvelope(this.nonce, requestId, type, payload);
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timeout mostu dla ${type}.`));
      }, 7000);
      this.pending.set(requestId, { resolve, reject, timeout });
      target.postMessage(envelope, "*");
    });
  }
}

let bridge: PreviewBridgeClient | undefined;
let previewQueue = Promise.resolve();
let lastPreviewRequestedRevision = -1;
let checkpointRecords: StudioCheckpoint[] = [];

function setBridgeState(text: string, state: "good" | "bad" | "warn"): void {
  bridgeStatus.textContent = text;
  bridgeStatus.dataset.state = state;
}

function persistRecovery(project: CoopegeProject): void {
  const record: RecoveryRecord = {
    format: "coopege-studio-recovery",
    savedAt: new Date().toISOString(),
    project,
  };
  try {
    localStorage.setItem(recoveryKey(project.manifest.projectId), stableStringify(record, 0));
  } catch (error) {
    diagnostics.lastBridgeError = `Recovery lokalne pominięte: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function readRecovery(): CoopegeProject | undefined {
  try {
    const projectId = (store.read() as CoopegeProject).manifest.projectId;
    const raw = localStorage.getItem(recoveryKey(projectId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<RecoveryRecord>;
    const validation = validateProject(parsed.project);
    return validation.ok ? parsed.project as CoopegeProject : undefined;
  } catch {
    return undefined;
  }
}

function renderIssueList(target: HTMLElement, result: ValidationResult): void {
  target.innerHTML = "";
  if (result.issues.length === 0) {
    const item = document.createElement("li");
    const code = document.createElement("code");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    code.textContent = "$";
    strong.textContent = "OK";
    span.textContent = "Brak błędów walidacji.";
    item.append(code, strong, span);
    target.append(item);
    return;
  }
  for (const issue of result.issues) {
    const item = document.createElement("li");
    const code = document.createElement("code");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    code.textContent = issue.path;
    strong.textContent = issue.code;
    span.textContent = issue.message;
    item.append(code, strong, span);
    target.append(item);
  }
}

function executeCommand(command: ProjectCommand<CoopegeProject>): boolean {
  const result = commands.execute(command);
  if (!result.ok) {
    summary.dataset.state = "bad";
    summary.textContent = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ");
    return false;
  }
  return true;
}

function executeEdit(label: string, mutate: (draft: CoopegeProject) => void): boolean {
  return executeCommand(createProjectCommand(label, mutate));
}

const assetBrowser = new AssetBrowser(executeEdit, window.__COOPEGE_ASSET_VAULT_BASELINE__);
const mapEditor = new MapEditor(executeCommand);
const contentBrowser = new ContentBrowser(executeCommand);
const abilityComposer = new AbilityComposer(executeCommand, async (graphId, playerId) => {
  if (!bridge || !diagnostics.bridgeReady) throw new Error("Preview runtime nie jest połączony.");
  return bridge.testGameplay(graphId, playerId);
});
window.__COOPEGE_STUDIO_DEBUG__ = {
  project: () => store.read() as CoopegeProject,
  history: () => commands.history(),
  abilityDiagnostics: () => abilityComposer.diagnostics,
  assetVaultDiagnostics: () => assetBrowser.diagnostics,
  buildAssetPack: () => assetBrowser.debugBuildPack(),
  importAssetPngFiles: (files) => assetBrowser.debugImportPngFiles(files),
  importAssetPack: (file) => assetBrowser.debugImportPack(file),
};

function render(): void {
  const project = store.read() as CoopegeProject;
  const result = validateProject(project);
  summary.textContent = result.ok
    ? "Projekt poprawny. Assety, mapa, content, preview i eksport korzystają z jednego snapshotu."
    : `Projekt ma ${result.issues.length} problemów.`;
  summary.dataset.state = result.ok ? "good" : "bad";
  validationSummary.textContent = result.ok
    ? `PASS — schema v${project.schemaVersion}, checksum ${stableChecksum(project)}`
    : `FAIL — ${result.issues.length} problemów blokujących preview i eksport.`;
  validationSummary.dataset.state = result.ok ? "good" : "bad";
  renderIssueList(issues, result);
  renderIssueList(validationIssues, result);

  tree.textContent = [
    `${project.manifest.name} (${project.manifest.projectVersion})`,
    `├─ floors: ${project.world.floors.length}`,
    `├─ tiles: ${project.world.tiles.length}`,
    `├─ classes: ${project.content.classes.length}`,
    `├─ abilities: ${project.content.abilities.length}`,
    `├─ monsters: ${project.content.monsters.length}`,
    `├─ spawns: ${project.content.spawns.length}`,
    `└─ assets: ${project.assets.entries.length}`,
  ].join("\n");

  projectNameInput.value = project.manifest.name;
  const currentFloorOptions = Array.from(startFloorSelect.options).map((option) => option.value);
  const desiredFloorOptions = project.world.floors.map((floor) => floor.id);
  if (currentFloorOptions.join("|") !== desiredFloorOptions.join("|")) {
    startFloorSelect.innerHTML = "";
    for (const floor of project.world.floors) {
      const option = document.createElement("option");
      option.value = floor.id;
      option.textContent = `${floor.name} · ${floor.id}`;
      startFloorSelect.append(option);
    }
  }
  startFloorSelect.value = project.manifest.playerStart.floorId;
  startXInput.value = String(project.manifest.playerStart.x);
  startYInput.value = String(project.manifest.playerStart.y);

  const commandHistory = commands.history();
  history.innerHTML = "";
  const visible = [...commandHistory.undo].slice(-10).reverse();
  if (visible.length === 0) {
    const item = document.createElement("div");
    item.className = "history-empty";
    item.textContent = "Brak operacji do cofnięcia.";
    history.append(item);
  } else {
    visible.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "history-item";
      const marker = document.createElement("b");
      marker.textContent = index === 0 ? "AKTUALNA" : `-${index}`;
      const label = document.createElement("span");
      label.textContent = entry.label;
      const storage = document.createElement("em");
      storage.textContent = entry.storage;
      item.append(marker, label, storage);
      history.append(item);
    });
  }

  undoButton.disabled = !commands.canUndo;
  redoButton.disabled = !commands.canRedo;
  exportButton.disabled = !result.ok;
  standaloneButton.disabled = !result.ok;
  revisionBadge.textContent = `rev ${store.revision}`;
  dirtyBadge.textContent = store.dirty ? "niezapisane" : "zapisane";
  dirtyBadge.dataset.state = store.dirty ? "warn" : "good";
  restoreButton.disabled = checkpointRecords.length === 0 && !readRecovery();

  assetBrowser.setProject(project);
  const embeddedCount = project.assets.entries.filter((entry) => entry.source.startsWith("data:image/png;base64,")).length;
  assetCount.textContent = `${project.assets.entries.length} · osadzone ${embeddedCount}`;
  validationDetails.textContent = [
    `schema: coopege-project v${project.schemaVersion}`,
    `project checksum: ${stableChecksum(project)}`,
    `store revision: ${store.revision}`,
    `undo/redo: ${commands.undoDepth}/${commands.redoDepth}`,
    `historia delta: ${commandHistory.undo.filter((entry) => entry.storage === "delta").length}`,
    `asset PNG: ${project.assets.entries.length}, osadzone: ${embeddedCount}`,
    `Asset Vault: placeholder ${assetBrowser.diagnostics.legacyPlaceholderCount}, custom ${assetBrowser.diagnostics.customCount}, baseline ${assetBrowser.diagnostics.baselineCount}`,
    `mapa: ${project.world.floors.length} pięter, ${project.world.tiles.length} kafli`,
    `content: ${project.content.classes.length} klas, ${project.content.abilities.length} umiejętności, ${project.content.monsters.length} potworów`,
    `spawny: ${project.content.spawns.length}`,
    `preview: ${diagnostics.bridgeReady ? `runtime rev ${diagnostics.previewRevision}` : "oczekiwanie"}`,
  ].join("\n");

  mapEditor.setProject(project);
  contentBrowser.setProject(project);
  abilityComposer.setProject(project);

  diagnostics.storeRevision = store.revision;
  diagnostics.undoDepth = commands.undoDepth;
  diagnostics.redoDepth = commands.redoDepth;
  diagnostics.projectName = project.manifest.name;
  diagnostics.projectChecksum = stableChecksum(project);
  diagnostics.assetCount = project.assets.entries.length;
  diagnostics.embeddedAssetCount = embeddedCount;
  const assetVaultDiagnostics = assetBrowser.diagnostics;
  diagnostics.assetVaultBaselineCount = assetVaultDiagnostics.baselineCount;
  diagnostics.legacyPlaceholderAssetCount = assetVaultDiagnostics.legacyPlaceholderCount;
  diagnostics.customAssetCount = assetVaultDiagnostics.customCount;
  diagnostics.assetPackExportReady = assetVaultDiagnostics.exportReady;
  diagnostics.mapFloorId = mapEditor.diagnostics.floorId;
  diagnostics.mapTool = mapEditor.diagnostics.tool;
  diagnostics.mapZoom = mapEditor.diagnostics.zoom;
  diagnostics.mapTransitionCount = mapEditor.diagnostics.transitionCount;
  diagnostics.contentKind = contentBrowser.diagnostics.kind;
  const abilityDiagnostics = abilityComposer.diagnostics;
  diagnostics.abilityGraphId = abilityDiagnostics.graphId;
  diagnostics.abilityNodeId = abilityDiagnostics.nodeId;
  diagnostics.abilityGraphCount = abilityDiagnostics.graphCount;
  diagnostics.abilityGraphValid = abilityDiagnostics.valid;
  diagnostics.abilityLastPlanOk = abilityDiagnostics.lastPlanOk;
  diagnostics.checkpointCount = checkpointRecords.length;
  diagnostics.deltaHistoryDepth = commandHistory.undo.filter((entry) => entry.storage === "delta").length;
  diagnostics.ready = true;
}

function queuePreview(): void {
  if (!bridge || !diagnostics.bridgeReady || lastPreviewRequestedRevision === store.revision) return;
  const requestedRevision = store.revision;
  const project = store.read() as CoopegeProject;
  lastPreviewRequestedRevision = requestedRevision;
  setBridgeState(`Wysyłanie snapshotu rev ${requestedRevision}…`, "warn");
  previewQueue = previewQueue
    .catch(() => undefined)
    .then(async () => {
      const applied = await bridge!.applyProject(project, requestedRevision);
      diagnostics.previewRevision = applied.runtimeRevision;
      diagnostics.previewStudioRevision = applied.studioRevision;
      diagnostics.lastBridgeError = "";
      previewDetails.textContent = [
        `runtime revision: ${applied.runtimeRevision}`,
        `studio revision: ${applied.studioRevision}`,
        `checksum: ${applied.checksum}`,
        `projekt: ${applied.summary.name}`,
        `piętra: ${applied.summary.floorCount}, spawny: ${applied.summary.spawnCount}`,
        `assety: ${applied.summary.assetCount}`,
      ].join("\n");
      setBridgeState(`Preview zsynchronizowany · runtime rev ${applied.runtimeRevision}`, "good");
      render();
    })
    .catch((error: unknown) => {
      diagnostics.lastBridgeError = error instanceof Error ? error.message : String(error);
      setBridgeState("Preview odrzucił aktualizację — aktywny stan nie został zmieniony", "bad");
      previewDetails.textContent = diagnostics.lastBridgeError;
    });
}

async function refreshCheckpoints(): Promise<void> {
  const project = store.read() as CoopegeProject;
  checkpointRecords = await checkpoints.list(project.manifest.projectId);
  checkpointList.innerHTML = "";
  if (checkpointRecords.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-message";
    empty.textContent = "Brak checkpointów. Recovery bieżącej sesji działa niezależnie.";
    checkpointList.append(empty);
  } else {
    checkpointRecords.forEach((record) => {
      const row = document.createElement("div");
      row.className = "checkpoint-row";
      const text = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = record.label;
      const small = document.createElement("div");
      small.style.color = "#888";
      small.style.marginTop = "3px";
      small.textContent = new Date(record.savedAt).toLocaleString("pl-PL");
      text.append(strong, small);
      const button = document.createElement("button");
      button.className = "btn";
      button.textContent = "Przywróć";
      button.addEventListener("click", () => { void restoreCheckpoint(record.id); });
      row.append(text, button);
      checkpointList.append(row);
    });
  }
  diagnostics.checkpointCount = checkpointRecords.length;
  restoreButton.disabled = checkpointRecords.length === 0 && !readRecovery();
}

async function restoreCheckpoint(id?: string): Promise<void> {
  const record = id ? await checkpoints.get(id) : checkpointRecords[0];
  const recovered = record?.project ?? readRecovery();
  if (!recovered) return;
  const result = commands.replaceProject(recovered, record ? `Przywróć checkpoint ${record.label}` : "Przywróć recovery");
  if (!result.ok) {
    summary.dataset.state = "bad";
    summary.textContent = `Checkpoint odrzucony: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")}`;
  }
  render();
  queuePreview();
}

store.subscribe((change) => {
  persistRecovery(change.snapshot as CoopegeProject);
  render();
  queuePreview();
});

pageButtons.forEach((button) => button.addEventListener("click", () => {
  const page = button.dataset.page ?? "project";
  diagnostics.activePage = page;
  pageButtons.forEach((candidate) => candidate.classList.toggle("active", candidate === button));
  pagePanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.pagePanel === page));
  if (page === "map") {
    window.setTimeout(() => mapEditor.render(), 0);
  }
}));

projectNameInput.addEventListener("change", () => {
  const value = projectNameInput.value.trim();
  executeEdit("Zmień nazwę projektu", (draft) => {
    draft.manifest.name = value;
    draft.manifest.updatedAt = new Date().toISOString();
  });
});

function editStart(): void {
  const floorId = startFloorSelect.value;
  const x = Number(startXInput.value);
  const y = Number(startYInput.value);
  executeEdit("Zmień punkt startowy", (draft) => {
    draft.manifest.playerStart = { floorId, x, y };
    draft.manifest.entryFloorId = floorId;
    draft.manifest.updatedAt = new Date().toISOString();
  });
}
startFloorSelect.addEventListener("change", editStart);
startXInput.addEventListener("change", editStart);
startYInput.addEventListener("change", editStart);
mapFocusStartButton.addEventListener("click", () => mapEditor.focusStart());

undoButton.addEventListener("click", () => {
  commands.undo();
  render();
  queuePreview();
});
redoButton.addEventListener("click", () => {
  commands.redo();
  render();
  queuePreview();
});
validateButton.addEventListener("click", render);

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files ?? [];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as CoopegeProject;
    const result = commands.replaceProject(parsed, `Otwórz ${file.name}`);
    if (!result.ok) {
      summary.dataset.state = "bad";
      summary.textContent = `Import odrzucony: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")}`;
    } else {
      await refreshCheckpoints();
    }
  } catch (error) {
    summary.dataset.state = "bad";
    summary.textContent = `Nie udało się odczytać JSON: ${error instanceof Error ? error.message : String(error)}`;
  }
  render();
  queuePreview();
  fileInput.value = "";
});

exportButton.addEventListener("click", () => {
  const project = store.read();
  const result = validateProject(project);
  if (!result.ok) return;
  downloadBlob("coopege-project-v1.json", new Blob([stableStringify(project, 2) + "\n"], { type: "application/json" }));
  store.markSaved();
  render();
});

standaloneButton.addEventListener("click", () => {
  const project = store.read();
  const result = validateProject(project);
  if (!result.ok) return;
  const token = "__COOPEGE_EXPORTED_PROJECT_JSON__";
  const template = window.__COOPEGE_RUNTIME_EXPORT_TEMPLATE__!;
  if (!template.includes(token)) throw new Error("Szablon standalone nie zawiera tokenu projektu.");
  const html = template.replace(token, safeEmbeddedJson(project));
  downloadBlob("Coopege_v0.01.html", new Blob([html], { type: "text/html;charset=utf-8" }));
  store.markSaved();
  render();
});

checkpointButton.addEventListener("click", async () => {
  const project = store.read() as CoopegeProject;
  const label = `Checkpoint rev ${store.revision}`;
  await checkpoints.save(project, label);
  checkpointButton.textContent = "Checkpoint zapisany ✓";
  window.setTimeout(() => { checkpointButton.textContent = "Checkpoint"; }, 1200);
  await refreshCheckpoints();
  render();
});
restoreButton.addEventListener("click", () => { void restoreCheckpoint(); });

render();
void refreshCheckpoints().then(render);
setBridgeState("Uruchamianie odizolowanego runtime…", "warn");
bridge = new PreviewBridgeClient(previewFrame, window.__COOPEGE_PREVIEW_HTML__);
bridge.connect()
  .then((runtimeReady) => {
    diagnostics.bridgeReady = true;
    diagnostics.runtimeCapabilities = [...runtimeReady.capabilities];
    setBridgeState("Handshake Runtime–Studio zakończony", "good");
    queuePreview();
  })
  .catch((error: unknown) => {
    diagnostics.lastBridgeError = error instanceof Error ? error.message : String(error);
    setBridgeState(`Błąd mostu: ${diagnostics.lastBridgeError}`, "bad");
  });
