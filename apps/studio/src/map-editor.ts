import { AssetResolver } from "../../../packages/asset-system/src/index.js";
import { applyTileChanges, decodeRleTiles, type TileChange } from "../../../packages/map-core/src/index.js";
import { createProjectCommand, createReversibleProjectCommand, type ProjectCommand } from "../../../packages/project-store/src/index.js";
import type { CoopegeProject, FloorDefinition, SpawnDefinition, TileDefinition } from "../../../packages/schema/src/types.js";

export type MapTool = "brush" | "eraser" | "picker" | "start" | "spawn" | "delete-spawn" | "pan";
export type StudioCommandExecutor = (command: ProjectCommand<CoopegeProject>) => boolean;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Brak elementu Map Editor: ${selector}.`);
  return element;
}

function floorById(project: CoopegeProject, id: string): FloorDefinition | undefined {
  return project.world.floors.find((floor) => floor.id === id);
}

function replaceFloor(project: CoopegeProject, floor: FloorDefinition): void {
  const index = project.world.floors.findIndex((entry) => entry.id === floor.id);
  if (index < 0) throw new Error(`Nie znaleziono piętra ${floor.id}.`);
  project.world.floors[index] = floor;
}

function nextSpawnId(project: CoopegeProject): string {
  const used = new Set(project.content.spawns.map((spawn) => spawn.id));
  for (let sequence = 1; sequence < 1_000_000; sequence += 1) {
    const id = `spawn.editor.${sequence}`;
    if (!used.has(id)) return id;
  }
  throw new Error("Nie można przydzielić ID spawnu.");
}

export class MapEditor {
  private project: CoopegeProject | undefined;
  private readonly assets = new AssetResolver();
  private selectedFloorId = "";
  private selectedTileId = "";
  private tool: MapTool = "brush";
  private center = { x: 0, y: 0 };
  private zoom = 22;
  private panning = false;
  private panPointer = { x: 0, y: 0 };
  private panCenter = { x: 0, y: 0 };
  private strokeTiles: string[] | undefined;
  private strokeChanges = new Map<number, TileChange>();
  private pointerDown = false;
  private lastPointerTile = { x: -1, y: -1 };

  private readonly floorSelect = requiredElement<HTMLSelectElement>("#mapFloorSelect");
  private readonly eraseSelect = requiredElement<HTMLSelectElement>("#mapEraseTileSelect");
  private readonly monsterSelect = requiredElement<HTMLSelectElement>("#mapMonsterSelect");
  private readonly tilePalette = requiredElement<HTMLElement>("#tilePalette");
  private readonly canvas = requiredElement<HTMLCanvasElement>("#mapCanvas");
  private readonly context: CanvasRenderingContext2D;
  private readonly coordinate = requiredElement<HTMLElement>("#mapCoordinate");
  private readonly zoomLabel = requiredElement<HTMLElement>("#mapZoomLabel");
  private readonly status = requiredElement<HTMLElement>("#mapStatus");
  private readonly selection = requiredElement<HTMLElement>("#mapSelection");
  private readonly toolButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-map-tool]")];

  constructor(private readonly execute: StudioCommandExecutor) {
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D mapy jest niedostępny.");
    this.context = context;
    this.context.imageSmoothingEnabled = false;
    this.floorSelect.addEventListener("change", () => {
      this.selectedFloorId = this.floorSelect.value;
      this.focusStart(false);
      this.render();
    });
    this.eraseSelect.addEventListener("change", () => this.renderSelection());
    this.toolButtons.forEach((button) => button.addEventListener("click", () => {
      this.setTool(button.dataset.mapTool as MapTool);
    }));
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("pointerdown", (event) => this.pointerStart(event));
    this.canvas.addEventListener("pointermove", (event) => this.pointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.pointerEnd(event));
    this.canvas.addEventListener("pointercancel", (event) => this.pointerEnd(event));
    this.canvas.addEventListener("wheel", (event) => this.wheel(event), { passive: false });
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? this.canvas);
    this.resize();
  }

  setProject(project: CoopegeProject): void {
    const previousProjectId = this.project?.manifest.projectId;
    this.project = project;
    this.assets.setEntries(project.assets.entries);
    void this.assets.preloadAll().then(() => {
      this.renderPalette();
      this.render();
    });
    if (!project.world.floors.some((floor) => floor.id === this.selectedFloorId)) {
      this.selectedFloorId = project.manifest.playerStart.floorId;
    }
    if (!project.world.tiles.some((tile) => tile.id === this.selectedTileId)) {
      this.selectedTileId = project.world.tiles.find((tile) => tile.walkable)?.id ?? project.world.tiles[0]?.id ?? "";
    }
    this.populateControls();
    if (previousProjectId !== project.manifest.projectId || this.center.x === 0 && this.center.y === 0) this.focusStart(false);
    this.renderPalette();
    this.renderSelection();
    this.render();
  }

  get diagnostics(): { floorId: string; tool: MapTool; selectedTileId: string; zoom: number; transitionCount: number } {
    const transitionCount = this.project?.world.transitions?.filter((entry) => entry.source.floorId === this.selectedFloorId).length ?? 0;
    return { floorId: this.selectedFloorId, tool: this.tool, selectedTileId: this.selectedTileId, zoom: this.zoom, transitionCount };
  }

  focusStart(render = true): void {
    if (!this.project) return;
    const start = this.project.manifest.playerStart;
    if (start.floorId === this.selectedFloorId) {
      this.center = { x: start.x + 0.5, y: start.y + 0.5 };
    } else {
      const floor = floorById(this.project, this.selectedFloorId);
      if (floor) this.center = { x: floor.width / 2, y: floor.height / 2 };
    }
    if (render) this.render();
  }

  private populateControls(): void {
    if (!this.project) return;
    const floorValues = [...this.floorSelect.options].map((option) => option.value).join("|");
    const desiredFloors = this.project.world.floors.map((floor) => floor.id).join("|");
    if (floorValues !== desiredFloors) {
      this.floorSelect.innerHTML = "";
      this.project.world.floors.forEach((floor) => {
        const option = document.createElement("option");
        option.value = floor.id;
        option.textContent = `${floor.name} · ${floor.width}×${floor.height}`;
        this.floorSelect.append(option);
      });
    }
    this.floorSelect.value = this.selectedFloorId;

    const tileValues = [...this.eraseSelect.options].map((option) => option.value).join("|");
    const desiredTiles = this.project.world.tiles.map((tile) => tile.id).join("|");
    if (tileValues !== desiredTiles) {
      this.eraseSelect.innerHTML = "";
      this.project.world.tiles.forEach((tile) => {
        const option = document.createElement("option");
        option.value = tile.id;
        option.textContent = tile.name;
        this.eraseSelect.append(option);
      });
      this.eraseSelect.value = this.project.world.tiles.find((tile) => /pust|void/i.test(tile.name))?.id
        ?? this.project.world.tiles.find((tile) => !tile.walkable)?.id
        ?? this.project.world.tiles[0]?.id
        ?? "";
    }

    const monsterValues = [...this.monsterSelect.options].map((option) => option.value).join("|");
    const desiredMonsters = this.project.content.monsters.map((monster) => monster.id).join("|");
    if (monsterValues !== desiredMonsters) {
      this.monsterSelect.innerHTML = "";
      this.project.content.monsters.forEach((monster) => {
        const option = document.createElement("option");
        option.value = monster.id;
        option.textContent = monster.name;
        this.monsterSelect.append(option);
      });
    }
  }

  private setTool(tool: MapTool): void {
    this.tool = tool;
    this.toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.mapTool === tool));
    this.canvas.style.cursor = tool === "pan" ? "grab" : tool === "picker" ? "copy" : "crosshair";
    this.renderSelection();
  }

  private firstFrameSource(assetId: string | undefined, image: HTMLImageElement): { x: number; y: number; width: number; height: number } {
    const layout = this.project?.assets.entries.find((entry) => entry.id === assetId)?.texture;
    const width = Math.max(1, Math.min(image.width, Math.floor(layout?.frameWidth ?? image.width)));
    const height = Math.max(1, Math.min(image.height, Math.floor(layout?.frameHeight ?? image.height)));
    const columns = Math.max(1, Math.floor(image.width / width));
    const rows = Math.max(1, Math.floor(image.height / height));
    const frame = Math.max(0, Math.min(columns - 1, Math.floor(layout?.idleFrame ?? 0)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(layout?.directionRows?.down ?? 0)));
    return { x: frame * width, y: row * height, width, height };
  }

  private drawAssetFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, assetId: string | undefined, x: number, y: number, width: number, height: number): void {
    const source = this.firstFrameSource(assetId, image);
    context.drawImage(image, source.x, source.y, source.width, source.height, x, y, width, height);
  }

  private renderPalette(): void {
    if (!this.project) return;
    this.tilePalette.innerHTML = "";
    this.project.world.tiles.forEach((tile) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tile-choice${tile.id === this.selectedTileId ? " active" : ""}`;
      const image = this.assets.image(tile.assetId);
      if (image) {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          this.drawAssetFrame(ctx, image, tile.assetId, 0, 0, 32, 32);
        }
        button.append(canvas);
      } else {
        const swatch = document.createElement("span");
        swatch.className = `tile-swatch walkable-${tile.walkable}`;
        button.append(swatch);
      }
      const label = document.createElement("span");
      label.textContent = tile.name;
      button.append(label);
      button.title = `${tile.id}\nwalkable: ${tile.walkable}`;
      button.addEventListener("click", () => {
        this.selectedTileId = tile.id;
        this.setTool("brush");
        this.renderPalette();
        this.renderSelection();
      });
      this.tilePalette.append(button);
    });
  }

  private pointerStart(event: PointerEvent): void {
    if (!this.project) return;
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* synthetic test pointer or unsupported capture */ }
    this.pointerDown = true;
    this.lastPointerTile = { x: -1, y: -1 };
    if (event.button === 1 || event.button === 2 || this.tool === "pan") {
      this.panning = true;
      this.panPointer = { x: event.clientX, y: event.clientY };
      this.panCenter = { ...this.center };
      this.canvas.style.cursor = "grabbing";
      return;
    }
    const tile = this.pointerTile(event);
    if (!tile) return;
    if (this.tool === "picker") {
      const id = this.tileAt(tile.x, tile.y);
      if (id) {
        this.selectedTileId = id;
        this.setTool("brush");
        this.renderPalette();
      }
      return;
    }
    if (this.tool === "start") {
      this.placeStart(tile.x, tile.y);
      return;
    }
    if (this.tool === "spawn") {
      this.addSpawn(tile.x, tile.y);
      return;
    }
    if (this.tool === "delete-spawn") {
      this.deleteSpawn(tile.x, tile.y);
      return;
    }
    if (this.tool === "brush" || this.tool === "eraser") {
      const floor = this.currentFloor();
      if (!floor) return;
      this.strokeTiles = decodeRleTiles(floor);
      this.strokeChanges.clear();
      this.paintTile(tile.x, tile.y);
    }
  }

  private pointerMove(event: PointerEvent): void {
    const tile = this.pointerTile(event);
    if (tile) {
      const transition = this.project?.world.transitions?.find((entry) => entry.source.floorId === this.selectedFloorId && entry.source.x === tile.x && entry.source.y === tile.y);
      const transitionText = transition ? ` · SCHODY → ${transition.destination.floorId} (${transition.destination.x}, ${transition.destination.y})` : "";
      this.coordinate.textContent = `X ${tile.x} · Y ${tile.y} · ${this.selectedFloorId}${transitionText}`;
    }
    if (this.panning) {
      this.center.x = this.panCenter.x - (event.clientX - this.panPointer.x) / this.zoom;
      this.center.y = this.panCenter.y - (event.clientY - this.panPointer.y) / this.zoom;
      this.render();
      return;
    }
    if (this.pointerDown && this.strokeTiles && tile) this.paintTile(tile.x, tile.y);
  }

  private pointerEnd(event: PointerEvent): void {
    try { if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); } catch { /* noop */ }
    this.pointerDown = false;
    if (this.panning) {
      this.panning = false;
      this.canvas.style.cursor = this.tool === "pan" ? "grab" : "crosshair";
    }
    if (this.strokeTiles && this.strokeChanges.size > 0 && this.project) {
      const changes = [...this.strokeChanges.values()].sort((left, right) => left.index - right.index);
      const floorId = this.selectedFloorId;
      const previousUpdatedAt = this.project.manifest.updatedAt;
      const nextUpdatedAt = new Date().toISOString();
      const command = createReversibleProjectCommand<CoopegeProject>(
        `Mapa: ${this.tool === "eraser" ? "gumka" : "pędzel"} (${changes.length} pól)`,
        (draft) => {
          const floor = floorById(draft, floorId);
          if (!floor) throw new Error(`Brak piętra ${floorId}.`);
          replaceFloor(draft, applyTileChanges(floor, changes, "forward"));
          draft.manifest.updatedAt = nextUpdatedAt;
        },
        (draft) => {
          const floor = floorById(draft, floorId);
          if (!floor) throw new Error(`Brak piętra ${floorId}.`);
          replaceFloor(draft, applyTileChanges(floor, changes, "reverse"));
          draft.manifest.updatedAt = previousUpdatedAt;
        },
      );
      const accepted = this.execute(command);
      this.status.dataset.state = accepted ? "good" : "bad";
      this.status.textContent = accepted ? `Zastosowano stroke: ${changes.length} pól.` : "Stroke został odrzucony przez walidator.";
    }
    this.strokeTiles = undefined;
    this.strokeChanges.clear();
    this.render();
  }

  private paintTile(x: number, y: number): void {
    const floor = this.currentFloor();
    if (!floor || !this.strokeTiles || x < 0 || y < 0 || x >= floor.width || y >= floor.height) return;
    if (this.lastPointerTile.x === x && this.lastPointerTile.y === y) return;
    this.lastPointerTile = { x, y };
    const index = y * floor.width + x;
    const before = this.strokeChanges.get(index)?.before ?? this.strokeTiles[index];
    if (!before) return;
    const after = this.tool === "eraser" ? this.eraseSelect.value : this.selectedTileId;
    if (!after || before === after) return;
    this.strokeTiles[index] = after;
    this.strokeChanges.set(index, { index, before, after });
    this.render();
  }

  private placeStart(x: number, y: number): void {
    if (!this.project) return;
    const floor = this.currentFloor();
    const tiles = floor ? decodeRleTiles(floor) : [];
    const tileId = floor ? tiles[y * floor.width + x] : undefined;
    const definition = this.project.world.tiles.find((tile) => tile.id === tileId);
    if (!definition?.walkable) {
      this.status.dataset.state = "bad";
      this.status.textContent = "Punkt startowy musi znajdować się na walkowalnym kaflu.";
      return;
    }
    const previous = structuredClone(this.project.manifest.playerStart);
    const floorId = this.selectedFloorId;
    const command = createReversibleProjectCommand<CoopegeProject>(
      `Ustaw start ${floorId} (${x}, ${y})`,
      (draft) => {
        draft.manifest.playerStart = { floorId, x, y };
        draft.manifest.entryFloorId = floorId;
      },
      (draft) => {
        draft.manifest.playerStart = previous;
        draft.manifest.entryFloorId = previous.floorId;
      },
    );
    const accepted = this.execute(command);
    this.status.dataset.state = accepted ? "good" : "bad";
    this.status.textContent = accepted ? `Punkt startowy ustawiony: ${x}, ${y}.` : "Nie udało się ustawić startu.";
  }

  private addSpawn(x: number, y: number): void {
    if (!this.project || !this.monsterSelect.value) return;
    const id = nextSpawnId(this.project);
    const floorId = this.selectedFloorId;
    const monsterId = this.monsterSelect.value;
    const spawn: SpawnDefinition = { id, floorId, monsterId, x, y, count: 1, respawnTicks: 180 };
    const accepted = this.execute(createProjectCommand<CoopegeProject>(`Dodaj spawn ${id}`, (draft) => {
      draft.content.spawns.push(spawn);
      draft.manifest.updatedAt = new Date().toISOString();
    }));
    this.status.dataset.state = accepted ? "good" : "bad";
    this.status.textContent = accepted ? `Dodano ${id} na ${x}, ${y}.` : "Spawn został odrzucony.";
  }

  private deleteSpawn(x: number, y: number): void {
    if (!this.project) return;
    const spawn = this.project.content.spawns.find((entry) => entry.floorId === this.selectedFloorId && entry.x === x && entry.y === y);
    if (!spawn) {
      this.status.dataset.state = "warn";
      this.status.textContent = "Na tym polu nie ma spawnu.";
      return;
    }
    const accepted = this.execute(createProjectCommand<CoopegeProject>(`Usuń spawn ${spawn.id}`, (draft) => {
      draft.content.spawns = draft.content.spawns.filter((entry) => entry.id !== spawn.id);
      draft.manifest.updatedAt = new Date().toISOString();
    }));
    this.status.dataset.state = accepted ? "good" : "bad";
    this.status.textContent = accepted ? `Usunięto ${spawn.id}.` : "Usunięcie zostało odrzucone.";
  }

  private tileAt(x: number, y: number): string | undefined {
    const floor = this.currentFloor();
    if (!floor || x < 0 || y < 0 || x >= floor.width || y >= floor.height) return undefined;
    const tiles = this.strokeTiles ?? decodeRleTiles(floor);
    return tiles[y * floor.width + x];
  }

  private currentFloor(): FloorDefinition | undefined {
    return this.project ? floorById(this.project, this.selectedFloorId) : undefined;
  }

  private pointerTile(event: PointerEvent | WheelEvent): { x: number; y: number } | undefined {
    const floor = this.currentFloor();
    if (!floor) return undefined;
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor(this.center.x + (event.clientX - rect.left - rect.width / 2) / this.zoom);
    const y = Math.floor(this.center.y + (event.clientY - rect.top - rect.height / 2) / this.zoom);
    if (x < 0 || y < 0 || x >= floor.width || y >= floor.height) return undefined;
    return { x, y };
  }

  private wheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const before = {
      x: this.center.x + (event.clientX - rect.left - rect.width / 2) / this.zoom,
      y: this.center.y + (event.clientY - rect.top - rect.height / 2) / this.zoom,
    };
    this.zoom = Math.max(4, Math.min(72, this.zoom * Math.exp(-event.deltaY * 0.0015)));
    const after = {
      x: this.center.x + (event.clientX - rect.left - rect.width / 2) / this.zoom,
      y: this.center.y + (event.clientY - rect.top - rect.height / 2) / this.zoom,
    };
    this.center.x += before.x - after.x;
    this.center.y += before.y - after.y;
    this.render();
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(320, Math.floor(rect.width * dpr));
    const height = Math.max(240, Math.floor(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.render();
  }

  private renderSelection(): void {
    const tile = this.project?.world.tiles.find((entry) => entry.id === this.selectedTileId);
    this.selection.textContent = [
      `narzędzie: ${this.tool}`,
      `kafel: ${tile?.name ?? "—"}`,
      `tileId: ${tile?.id ?? "—"}`,
      `walkable: ${tile?.walkable ?? "—"}`,
      `gumka: ${this.eraseSelect.selectedOptions[0]?.textContent ?? "—"}`,
      `przejścia na piętrze: ${this.project?.world.transitions?.filter((entry) => entry.source.floorId === this.selectedFloorId).length ?? 0}`,
    ].join("\n");
  }

  render(): void {
    const project = this.project;
    const floor = this.currentFloor();
    if (!project || !floor) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.canvas.width / Math.max(1, rect.width);
    const ctx = this.context;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const tiles = this.strokeTiles ?? decodeRleTiles(floor);
    const startX = Math.max(0, Math.floor(this.center.x - rect.width / this.zoom / 2) - 1);
    const endX = Math.min(floor.width - 1, Math.ceil(this.center.x + rect.width / this.zoom / 2) + 1);
    const startY = Math.max(0, Math.floor(this.center.y - rect.height / this.zoom / 2) - 1);
    const endY = Math.min(floor.height - 1, Math.ceil(this.center.y + rect.height / this.zoom / 2) + 1);
    const definitions = new Map(project.world.tiles.map((tile) => [tile.id, tile]));

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tileId = tiles[y * floor.width + x];
        const definition = tileId ? definitions.get(tileId) : undefined;
        const screenX = (x - this.center.x) * this.zoom + rect.width / 2;
        const screenY = (y - this.center.y) * this.zoom + rect.height / 2;
        const image = this.assets.image(definition?.assetId);
        if (image) {
          this.drawAssetFrame(ctx, image, definition?.assetId, Math.floor(screenX), Math.floor(screenY), Math.ceil(this.zoom + 0.5), Math.ceil(this.zoom + 0.5));
        } else {
          ctx.fillStyle = definition?.walkable ? "#3b5644" : "#4c394c";
          ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.ceil(this.zoom + 0.5), Math.ceil(this.zoom + 0.5));
        }
        if (this.zoom >= 12) {
          ctx.strokeStyle = "#ffffff10";
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.floor(screenX) + 0.5, Math.floor(screenY) + 0.5, Math.max(1, this.zoom - 1), Math.max(1, this.zoom - 1));
        }
      }
    }

    const floorNames = new Map(project.world.floors.map((entry) => [entry.id, entry.name]));
    for (const transition of project.world.transitions ?? []) {
      if (transition.source.floorId !== floor.id
        || transition.source.x < startX || transition.source.x > endX
        || transition.source.y < startY || transition.source.y > endY) continue;
      const sx = (transition.source.x + 0.5 - this.center.x) * this.zoom + rect.width / 2;
      const sy = (transition.source.y + 0.5 - this.center.y) * this.zoom + rect.height / 2;
      const radius = Math.max(5, Math.min(14, this.zoom * 0.32));
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#35d6eacc";
      ctx.strokeStyle = "#e5fdff";
      ctx.lineWidth = 2;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
      ctx.fillStyle = "#06252a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.max(9, Math.min(16, this.zoom * 0.45))}px Consolas`;
      ctx.fillText("↕", sx, sy + 0.5);
      if (this.zoom >= 26) {
        const label = floorNames.get(transition.destination.floorId) ?? transition.destination.floorId;
        ctx.font = "9px Consolas";
        ctx.fillStyle = "#d8fbff";
        ctx.fillText(label, sx, sy - radius - 7);
      }
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    const start = project.manifest.playerStart;
    if (start.floorId === floor.id) {
      const sx = (start.x + 0.5 - this.center.x) * this.zoom + rect.width / 2;
      const sy = (start.y + 0.5 - this.center.y) * this.zoom + rect.height / 2;
      ctx.fillStyle = "#70e4af";
      ctx.strokeStyle = "#eafff5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(4, this.zoom * 0.28), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const monsterById = new Map(project.content.monsters.map((monster) => [monster.id, monster]));
    for (const spawn of project.content.spawns) {
      if (spawn.floorId !== floor.id || spawn.x < startX || spawn.x > endX || spawn.y < startY || spawn.y > endY) continue;
      const sx = (spawn.x + 0.5 - this.center.x) * this.zoom + rect.width / 2;
      const sy = (spawn.y + 0.5 - this.center.y) * this.zoom + rect.height / 2;
      const definition = monsterById.get(spawn.monsterId);
      const image = this.assets.image(definition?.assetId);
      const size = Math.max(7, Math.min(28, this.zoom * 0.72));
      if (image) {
        this.drawAssetFrame(ctx, image, definition?.assetId, sx - size / 2, sy - size / 2, size, size);
      } else {
        ctx.fillStyle = "#ff7185";
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.zoom >= 18) {
        ctx.fillStyle = "#0a0b0ddd";
        ctx.fillRect(sx + size * 0.32, sy - size * 0.6, 12, 10);
        ctx.fillStyle = "#ffd0d7";
        ctx.font = "8px Consolas";
        ctx.fillText(String(spawn.count), sx + size * 0.42, sy + 2);
      }
    }

    ctx.strokeStyle = "#c77df055";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, rect.width - 1, rect.height - 1);
    this.zoomLabel.textContent = `${Math.round(this.zoom)} px/kafel · widok ${startX},${startY}–${endX},${endY}`;
    this.renderSelection();
  }
}
