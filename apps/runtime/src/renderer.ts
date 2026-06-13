import { AssetResolver, type AssetResolverStats } from "../../../packages/asset-system/src/index.js";
import {
  computeSharedCameraFrame,
  type GameWorld,
  type GameplayEvent,
  type PlayerActor,
  type RuntimeActor,
  type Vec2,
} from "../../../packages/gameplay/src/index.js";
import type { AssetEntry } from "../../../packages/schema/src/index.js";
import type { PreparedRuntimeProject } from "../../../packages/runtime-core/src/index.js";
import { computeSpriteDrawRect, resolveTextureLayout, selectSpriteFrame, type SpriteDirection } from "./sprite-layout.js";

interface VisualEffect {
  kind: "hit" | "death" | "respawn" | "reward";
  x: number;
  y: number;
  floorId: string;
  startedAt: number;
  durationMs: number;
}

export interface RuntimeCameraStats {
  x: number;
  y: number;
  tilePixels: number;
  spreadTiles: number;
}

const TILE_COLORS = new Map<string, string>([
  ["tile.floor", "#2e3943"], ["tile.wall", "#5c465d"], ["tile.grass", "#31523a"],
  ["tile.legacy.0", "#416a36"], ["tile.legacy.1", "#77736d"], ["tile.legacy.2", "#51494f"],
  ["tile.legacy.3", "#286986"], ["tile.legacy.4", "#73533a"], ["tile.legacy.5", "#87633d"],
  ["tile.legacy.6", "#275932"], ["tile.legacy.7", "#625958"], ["tile.legacy.8", "#c09452"],
  ["tile.legacy.9", "#496a58"], ["tile.legacy.10", "#c7e0e6"], ["tile.legacy.11", "#625460"],
  ["tile.legacy.12", "#ac9169"], ["tile.legacy.13", "#8a7458"], ["tile.legacy.14", "#b4452b"],
  ["tile.legacy.15", "#171922"], ["tile.legacy.16", "#6b6663"], ["tile.legacy.17", "#342e39"],
]);
const PLAYER_COLORS = ["#70cfff", "#ffd36f", "#8ff0a4", "#dc8cff"] as const;

type DirectionKey = SpriteDirection;

function interpolate(previous: number, current: number, alpha: number): number {
  return previous + (current - previous) * alpha;
}

function actorPosition(actor: RuntimeActor, alpha: number): Vec2 {
  return {
    x: interpolate(actor.previousPosition.x, actor.position.x, alpha),
    y: interpolate(actor.previousPosition.y, actor.position.y, alpha),
  };
}

function actorDirection(actor: RuntimeActor): DirectionKey {
  const direction = actor.kind === "player"
    ? actor.facing
    : { x: actor.position.x - actor.previousPosition.x, y: actor.position.y - actor.previousPosition.y };
  if (Math.abs(direction.x) > Math.abs(direction.y)) return direction.x >= 0 ? "right" : "left";
  return direction.y >= 0 ? "down" : "up";
}

export class RuntimeRenderer {
  private project: PreparedRuntimeProject | undefined;
  private assets = new AssetResolver();
  private assetEntries = new Map<string, AssetEntry>();
  private assetStats: AssetResolverStats = { totalTextures: 0, readyTextures: 0, failedTextures: 0, loadingTextures: 0 };
  private camera = { x: 0, y: 0 };
  private tilePixels = 48;
  private maximumTilePixels = 48;
  private spreadTiles = 0;
  private readonly effects: VisualEffect[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {
    this.resize();
    this.context.imageSmoothingEnabled = false;
    window.addEventListener("resize", () => this.resize());
  }

  setProject(project: PreparedRuntimeProject): void {
    this.project = project;
    this.assetEntries = new Map(project.project.assets.entries.map((entry) => [entry.id, entry]));
    this.assets.setEntries(project.project.assets.entries);
    this.assetStats = this.assets.stats();
    void this.assets.preloadAll().then((stats) => { this.assetStats = stats; });
  }

  getAssetStats(): AssetResolverStats {
    return { ...this.assetStats };
  }

  getCameraStats(): RuntimeCameraStats {
    return { x: this.camera.x, y: this.camera.y, tilePixels: this.tilePixels, spreadTiles: this.spreadTiles };
  }

  pushEvent(event: GameplayEvent, world: GameWorld, now: number): void {
    if (event.type === "damage.applied") {
      const target = world.actors.get(event.context.targetEntityId);
      if (target) this.effects.push({ kind: "hit", x: target.position.x, y: target.position.y, floorId: target.floorId, startedAt: now, durationMs: 210 });
    } else if (event.type === "actor.died") {
      const target = world.actors.get(event.entityId);
      if (target) this.effects.push({ kind: "death", x: target.position.x, y: target.position.y, floorId: target.floorId, startedAt: now, durationMs: 620 });
    } else if (event.type === "actor.respawned") {
      const target = world.actors.get(event.entityId);
      if (target) this.effects.push({ kind: "respawn", x: target.position.x, y: target.position.y, floorId: target.floorId, startedAt: now, durationMs: 450 });
    } else if (event.type === "rewards.awarded") {
      const defeated = world.actors.get(event.defeatedEntityId);
      if (defeated) this.effects.push({ kind: "reward", x: defeated.position.x, y: defeated.position.y, floorId: defeated.floorId, startedAt: now, durationMs: 720 });
    }
  }

  screenToWorld(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / Math.max(1, rect.width);
    const scaleY = this.canvas.height / Math.max(1, rect.height);
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    return {
      x: this.camera.x + (canvasX - this.canvas.width / 2) / this.tilePixels,
      y: this.camera.y + (canvasY - this.canvas.height / 2) / this.tilePixels,
    };
  }

  render(world: GameWorld, alpha: number, now: number): void {
    const project = this.project;
    if (!project) return;
    const floor = world.preparedFloor;
    const playerPositions = world.players
      .filter((player) => player.floorId === world.activeFloorId)
      .map((player) => actorPosition(player, alpha));
    const frame = computeSharedCameraFrame(playerPositions, this.canvas.width, this.canvas.height, {
      marginTiles: 4.4,
      minimumTilePixels: 24,
      maximumTilePixels: this.maximumTilePixels,
    });
    this.camera.x = frame.center.x;
    this.camera.y = frame.center.y;
    this.tilePixels = frame.tilePixels;
    this.spreadTiles = frame.spreadTiles;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const halfTilesX = this.canvas.width / this.tilePixels / 2;
    const halfTilesY = this.canvas.height / this.tilePixels / 2;
    const startX = Math.max(0, Math.floor(this.camera.x - halfTilesX) - 1);
    const endX = Math.min(floor.width - 1, Math.ceil(this.camera.x + halfTilesX) + 1);
    const startY = Math.max(0, Math.floor(this.camera.y - halfTilesY) - 1);
    const endY = Math.min(floor.height - 1, Math.ceil(this.camera.y + halfTilesY) + 1);
    const tileDefinitions = new Map(project.project.world.tiles.map((tile) => [tile.id, tile]));

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tileId = floor.tiles[y * floor.width + x];
        if (!tileId) continue;
        const screen = this.worldToScreen({ x, y });
        const definition = tileDefinitions.get(tileId);
        const image = this.assets.image(definition?.assetId);
        if (image) this.drawTileImage(image, definition?.assetId, screen, now);
        else {
          this.context.fillStyle = TILE_COLORS.get(tileId) ?? (definition?.walkable ? "#304249" : "#554452");
          this.context.fillRect(Math.floor(screen.x), Math.floor(screen.y), this.tilePixels + 1, this.tilePixels + 1);
        }
        this.context.strokeStyle = definition?.walkable ? "#ffffff08" : "#00000022";
        this.context.strokeRect(Math.floor(screen.x) + 0.5, Math.floor(screen.y) + 0.5, this.tilePixels - 1, this.tilePixels - 1);
      }
    }

    this.drawTransitions(world.activeFloorId, startX, endX, startY, endY, now);
    const actors = world.actors.values()
      .filter((actor) => actor.floorId === world.activeFloorId)
      .sort((left, right) => actorPosition(left, alpha).y - actorPosition(right, alpha).y || left.entityId.localeCompare(right.entityId));
    for (const actor of actors) this.drawActor(actor, world.players, alpha, world.tick, world.tickRate);
    this.drawEffects(world.activeFloorId, now);
    this.drawVignette();
  }

  private drawTileImage(image: HTMLImageElement, assetId: string | undefined, screen: Vec2, now: number): void {
    const layout = resolveTextureLayout(this.assetEntries.get(assetId ?? "")?.texture, image.width, image.height, "tile");
    const frameSelection = selectSpriteFrame(layout, image.width, image.height, "down", true, Math.floor(now / 1000 * 30), 30);
    this.context.drawImage(
      image,
      frameSelection.sourceX,
      frameSelection.sourceY,
      frameSelection.sourceWidth,
      frameSelection.sourceHeight,
      Math.floor(screen.x),
      Math.floor(screen.y),
      this.tilePixels + 1,
      this.tilePixels + 1,
    );
  }

  private drawTransitions(activeFloorId: string, startX: number, endX: number, startY: number, endY: number, now: number): void {
    const transitions = this.project?.project.world.transitions ?? [];
    const pulse = 0.58 + Math.sin(now / 240) * 0.18;
    for (const transition of transitions) {
      if (transition.source.floorId !== activeFloorId) continue;
      const { x, y } = transition.source;
      if (x < startX || x > endX || y < startY || y > endY) continue;
      const screen = this.worldToScreen({ x, y });
      this.context.save();
      this.context.globalAlpha = pulse;
      this.context.strokeStyle = "#ffe29a";
      this.context.lineWidth = Math.max(2, this.tilePixels * 0.055);
      this.context.strokeRect(screen.x + 3, screen.y + 3, this.tilePixels - 6, this.tilePixels - 6);
      this.context.fillStyle = "#fff0b9";
      this.context.font = `bold ${Math.max(11, Math.floor(this.tilePixels * 0.3))}px Consolas, monospace`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText("↕", screen.x + this.tilePixels / 2, screen.y + this.tilePixels / 2);
      this.context.restore();
    }
  }

  private drawActor(actor: RuntimeActor, players: readonly PlayerActor[], alpha: number, tick: number, tickRate: number): void {
    if (!actor.alive || !this.project) return;
    const position = actorPosition(actor, alpha);
    const screen = this.worldToScreen(position);
    const radius = Math.max(8, actor.radius * this.tilePixels);
    const definition = actor.kind === "player"
      ? this.project.project.content.classes.find((entry) => entry.id === actor.classId)
      : this.project.project.content.monsters.find((entry) => entry.id === actor.definitionId);
    const image = this.assets.image(definition?.assetId);
    const playerIndex = actor.kind === "player" ? Math.max(0, players.findIndex((player) => player.playerId === actor.playerId)) : -1;
    const actorColor = actor.kind === "player" ? PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]! : "#e66376";
    let visualTop = screen.y - radius;

    if (image) {
      const layout = resolveTextureLayout(this.assetEntries.get(definition?.assetId ?? "")?.texture, image.width, image.height, actor.kind);
      const moving = Math.hypot(actor.position.x - actor.previousPosition.x, actor.position.y - actor.previousPosition.y) > 0.001;
      const frame = selectSpriteFrame(layout, image.width, image.height, actorDirection(actor), moving, tick, tickRate);
      const rect = computeSpriteDrawRect(screen.x, screen.y, this.tilePixels, layout);
      visualTop = rect.y;
      this.context.save();
      this.context.shadowBlur = 13;
      this.context.shadowColor = `${actorColor}88`;
      this.context.drawImage(image, frame.sourceX, frame.sourceY, frame.sourceWidth, frame.sourceHeight, Math.floor(rect.x), Math.floor(rect.y), rect.width, rect.height);
      this.context.restore();
    } else {
      this.context.save();
      this.context.translate(screen.x, screen.y);
      this.context.shadowBlur = 15;
      this.context.shadowColor = actorColor;
      this.context.fillStyle = actorColor;
      this.context.beginPath();
      this.context.arc(0, 0, radius, 0, Math.PI * 2);
      this.context.fill();
      this.context.shadowBlur = 0;
      this.context.lineWidth = 2;
      this.context.strokeStyle = "#f7f4ff";
      this.context.stroke();
      this.context.restore();
    }

    if (actor.kind === "player") {
      this.context.strokeStyle = actorColor;
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(screen.x, screen.y);
      this.context.lineTo(screen.x + actor.facing.x * radius * 1.55, screen.y + actor.facing.y * radius * 1.55);
      this.context.stroke();
      this.context.font = "bold 11px Consolas, monospace";
      this.context.textAlign = "center";
      this.context.fillStyle = actorColor;
      this.context.fillText(`P${playerIndex + 1}`, screen.x, visualTop - 18);
    }

    const barWidth = Math.max(30, radius * 2.3);
    const barX = screen.x - barWidth / 2;
    const barY = visualTop - 11;
    this.context.fillStyle = "#090b10dd";
    this.context.fillRect(barX, barY, barWidth, 6);
    this.context.fillStyle = actor.kind === "player" ? actorColor : "#ff7789";
    this.context.fillRect(barX + 1, barY + 1, Math.max(0, (barWidth - 2) * actor.hp / actor.maxHp), 4);
  }

  private drawEffects(activeFloorId: string, now: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      const progress = (now - effect.startedAt) / effect.durationMs;
      if (progress >= 1) {
        this.effects.splice(index, 1);
        continue;
      }
      if (effect.floorId !== activeFloorId) continue;
      const screen = this.worldToScreen(effect);
      this.context.save();
      this.context.globalAlpha = 1 - progress;
      this.context.strokeStyle = effect.kind === "hit" ? "#fff1a3" : effect.kind === "death" ? "#ff6680" : effect.kind === "reward" ? "#ffd86f" : "#75ffd1";
      this.context.lineWidth = 5 - progress * 3;
      this.context.beginPath();
      this.context.arc(screen.x, screen.y, 12 + progress * 42, 0, Math.PI * 2);
      this.context.stroke();
      this.context.restore();
    }
  }

  private drawVignette(): void {
    const gradient = this.context.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.min(this.canvas.width, this.canvas.height) * 0.24,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) * 0.66,
    );
    gradient.addColorStop(0, "#00000000");
    gradient.addColorStop(1, "#00000088");
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private worldToScreen(position: Vec2): Vec2 {
    return {
      x: (position.x - this.camera.x) * this.tilePixels + this.canvas.width / 2,
      y: (position.y - this.camera.y) * this.tilePixels + this.canvas.height / 2,
    };
  }

  private resize(): void {
    const width = Math.max(640, Math.min(1152, Math.floor(window.innerWidth * 0.72)));
    const height = Math.max(420, Math.min(720, Math.floor(window.innerHeight * 0.78)));
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.imageSmoothingEnabled = false;
    this.maximumTilePixels = Math.max(34, Math.min(56, Math.floor(Math.min(width / 20, height / 13))));
    this.tilePixels = this.maximumTilePixels;
  }
}
