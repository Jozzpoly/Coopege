import { FixedClock } from "../../../packages/core/src/index.js";
import {
  BRIDGE_TYPES,
  createBridgeEnvelope,
  isBridgeEnvelope,
  type BridgeEnvelope,
  type ProjectApplyPayload,
  type GameplayTestPayload,
  type StudioHelloPayload,
} from "../../../packages/dev-protocol/src/index.js";
import {
  GameWorld,
  PRIMARY_SLOT_ID,
  SECONDARY_PLAYER_ID,
  SECONDARY_SLOT_ID,
  type GameSaveSnapshot,
  type GameSaveSnapshotV3,
  type GameplayEvent,
  type PlayerCommand,
  type PlayerSlotId,
  type Vec2,
} from "../../../packages/gameplay/src/index.js";
import { AtomicProjectHost } from "../../../packages/runtime-core/src/index.js";
import { LocalCoopInputAdapter } from "./input-adapter.js";
import { RuntimeRenderer } from "./renderer.js";

interface RuntimeConfig {
  mode: "standalone" | "preview";
  sessionNonce?: string;
  runtimeVersion: string;
}

interface RuntimeDiagnostics {
  ready: boolean;
  mode: RuntimeConfig["mode"];
  bridgeConnected: boolean;
  runtimeRevision: number;
  studioRevision: number;
  projectId: string;
  projectName: string;
  checksum: string;
  activeFloorId: string;
  lastError: string;
  gameplayReady: boolean;
  gameplayTick: number;
  gameplayChecksum: string;
  playerHp: number;
  playerMaxHp: number;
  playerCount: number;
  player1Xp: number;
  player1Gold: number;
  player1Loot: number;
  player2Hp: number;
  player2MaxHp: number;
  player2Xp: number;
  player2Gold: number;
  player2Loot: number;
  teamQuestKillCredits: number;
  maximumPlayerDistance: number;
  livingMonsters: number;
  authoredSpawnDefinitions: number;
  authoredSpawnInstances: number;
  activeSpawnInstances: number;
  sleepingSpawnInstances: number;
  respawningSpawnInstances: number;
  cappedSpawnInstances: number;
  activeMonsterLimit: number;
  lastEventType: string;
  assetTotal: number;
  assetReady: number;
  assetFailed: number;
  cameraTilePixels: number;
  cameraSpreadTiles: number;
  saveSchemaVersion: number;
  projectSchemaVersion: number;
  gameplayGraphCount: number;
  gameplayBindingCount: number;
  gameplayTriggerCount: number;
  gameplayDomains: string[];
  gameplayExecutionFailures: number;
  authoredTransitionCount: number;
  lastTransitionId: string;
  secondaryInputDevice: string;
  textureLayoutAssets: number;
}

interface RuntimeDebugApi {
  queueAttack(slotId?: PlayerSlotId): void;
  joinPlayer2(): void;
  leavePlayer2(): void;
  setVirtualCommand(slotId: PlayerSlotId, command: PlayerCommand | null): void;
  save(): GameSaveSnapshotV3 | null;
  load(snapshot: GameSaveSnapshot): void;
  transitionParty(floorId: string, anchor?: Vec2): void;
  diagnostics(): RuntimeDiagnostics;
}

declare global {
  interface Window {
    __COOPEGE_PROJECT__?: unknown;
    __COOPEGE_RUNTIME_CONFIG__?: RuntimeConfig;
    __COOPEGE_RUNTIME_DIAGNOSTICS__?: RuntimeDiagnostics;
    __COOPEGE_GAME_DEBUG__?: RuntimeDebugApi;
  }
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Niekompletny shell runtime: ${selector}.`);
  return element;
}

const status = requiredElement<HTMLElement>("#status");
const details = requiredElement<HTMLElement>("#details");
const canvas = requiredElement<HTMLCanvasElement>("#world");
const floorLabel = requiredElement<HTMLElement>("#floorLabel");
const hpText = requiredElement<HTMLElement>("#hpText");
const hpFill = requiredElement<HTMLElement>("#hpFill");
const hpText2 = requiredElement<HTMLElement>("#hpText2");
const hpFill2 = requiredElement<HTMLElement>("#hpFill2");
const player2Card = requiredElement<HTMLElement>("#player2Card");
const joinHint = requiredElement<HTMLElement>("#joinHint");
const player1Stats = requiredElement<HTMLElement>("#player1Stats");
const player2Stats = requiredElement<HTMLElement>("#player2Stats");
const abilityText = requiredElement<HTMLElement>("#abilityText");
const abilityText2 = requiredElement<HTMLElement>("#abilityText2");
const eventLog = requiredElement<HTMLElement>("#eventLog");
const saveButton = requiredElement<HTMLButtonElement>("#saveButton");
const loadButton = requiredElement<HTMLButtonElement>("#loadButton");
const resetButton = requiredElement<HTMLButtonElement>("#resetButton");
const attackButton = requiredElement<HTMLButtonElement>("#attackButton");
const joinButton = requiredElement<HTMLButtonElement>("#joinButton");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D jest niedostępny.");

const config: RuntimeConfig = window.__COOPEGE_RUNTIME_CONFIG__ ?? { mode: "standalone", runtimeVersion: "0.7.5-m7-owner-accepted" };
const host = new AtomicProjectHost();
const clock = new FixedClock(30);
const renderer = new RuntimeRenderer(canvas, context);
const input = new LocalCoopInputAdapter(canvas, renderer);
const SAVE_KEY_PREFIX = "coopege.m7.save.";
let game: GameWorld | undefined;
let lastFrame = performance.now();
let lastDetailsUpdate = 0;
let recentEvents: string[] = [];
let memorySave: GameSaveSnapshotV3 | null = null;

const diagnostics: RuntimeDiagnostics = {
  ready: false,
  mode: config.mode,
  bridgeConnected: false,
  runtimeRevision: 0,
  studioRevision: 0,
  projectId: "",
  projectName: "",
  checksum: "",
  activeFloorId: "",
  lastError: "",
  gameplayReady: false,
  gameplayTick: 0,
  gameplayChecksum: "",
  playerHp: 0,
  playerMaxHp: 0,
  playerCount: 0,
  player1Xp: 0,
  player1Gold: 0,
  player1Loot: 0,
  player2Hp: 0,
  player2MaxHp: 0,
  player2Xp: 0,
  player2Gold: 0,
  player2Loot: 0,
  teamQuestKillCredits: 0,
  maximumPlayerDistance: 0,
  livingMonsters: 0,
  authoredSpawnDefinitions: 0,
  authoredSpawnInstances: 0,
  activeSpawnInstances: 0,
  sleepingSpawnInstances: 0,
  respawningSpawnInstances: 0,
  cappedSpawnInstances: 0,
  activeMonsterLimit: 0,
  lastEventType: "",
  assetTotal: 0,
  assetReady: 0,
  assetFailed: 0,
  cameraTilePixels: 0,
  cameraSpreadTiles: 0,
  saveSchemaVersion: 3,
  projectSchemaVersion: 0,
  gameplayGraphCount: 0,
  gameplayBindingCount: 0,
  gameplayTriggerCount: 0,
  gameplayDomains: [],
  gameplayExecutionFailures: 0,
  authoredTransitionCount: 0,
  lastTransitionId: "",
  secondaryInputDevice: "—",
  textureLayoutAssets: 0,
};
window.__COOPEGE_RUNTIME_DIAGNOSTICS__ = diagnostics;

function setStatus(text: string, state: "good" | "bad" | "warn"): void {
  status.textContent = text;
  status.dataset.state = state;
}

function formatEvent(event: GameplayEvent): string {
  switch (event.type) {
    case "player.joined": return `T${event.tick}: ${event.playerId} dołączył (${event.slotId})`;
    case "player.left": return `T${event.tick}: ${event.playerId} opuścił sesję`;
    case "ability.used": return `T${event.tick}: ${event.sourceEntityId} → ${event.abilityId}`;
    case "damage.applied": return `T${event.context.tick}: ${event.context.ownerPlayerId ?? "AI"} zadaje ${event.context.amount} → ${event.remainingHp} HP`;
    case "threat.target_changed": return `T${event.tick}: AI celuje w ${event.targetPlayerId ?? "nikogo"}`;
    case "actor.died": return `T${event.tick}: pokonano ${event.entityId}`;
    case "rewards.awarded": return `T${event.tick}: nagrody → ${event.shares.map((share) => `${share.playerId} +${share.xp}XP +${share.gold}g`).join(" · ")}`;
    case "actor.respawned": return `T${event.tick}: odrodzenie ${event.entityId}`;
    case "party.floor_changed": return `T${event.tick}: drużyna ${event.fromFloorId} → ${event.toFloorId}${event.transitionId ? ` (${event.transitionId}; ${event.triggeringPlayerIds.join("+") || "system"})` : " [debug]"}`;
    case "party.transition_conflict": return `T${event.tick}: konflikt schodów ${event.candidateTransitionIds.join(" / ")} → ${event.chosenTransitionId}`;
    case "gameplay.execution_failed": return `T${event.tick}: błąd grafu ${event.graphId} [${event.code}]`;
  }
}

function consumeEvents(now: number): void {
  if (!game) return;
  for (const event of game.events.drain()) {
    diagnostics.lastEventType = event.type;
    if (event.type === "gameplay.execution_failed") diagnostics.gameplayExecutionFailures += 1;
    if (event.type === "party.floor_changed") diagnostics.lastTransitionId = event.transitionId ?? "debug";
    renderer.pushEvent(event, game, now);
    recentEvents.unshift(formatEvent(event));
    recentEvents = recentEvents.slice(0, 9);
  }
  eventLog.textContent = recentEvents.length > 0 ? recentEvents.join("\n") : "Brak zdarzeń — podejdź drużyną do przeciwnika i zaatakuj.";
}

function abilityDescription(playerIndex: number): string {
  if (!game || !host.current) return "—";
  const player = game.players[playerIndex];
  if (!player) return "—";
  const ability = host.current.project.content.abilities.find((item) => item.id === player.abilityId);
  return `${ability?.name ?? player.abilityId} · moc ${ability?.power ?? "?"} · CD ${ability?.cooldownTicks ?? "?"}`;
}

function rebuildGameWorld(): void {
  const current = host.current;
  if (!current) return;
  game = new GameWorld(current, {
    tickRate: 30,
    simulationSeed: 0xc00fee,
    dropSeed: 0xd09f00d,
    initialPlayerCount: config.mode === "preview" ? 2 : 1,
    softTetherTiles: 10,
    hardTetherTiles: 14,
    rewardRadiusTiles: 12,
  });
  renderer.setProject(current);
  recentEvents = [];
  diagnostics.gameplayReady = true;
  diagnostics.activeFloorId = game.activeFloorId;
  floorLabel.textContent = `${current.floors.get(game.activeFloorId)?.name ?? game.activeFloorId} · ${game.activeFloorId}`;
  abilityText.textContent = abilityDescription(0);
  abilityText2.textContent = "P2 jeszcze nie dołączył";
  updateDiagnostics(true);
}

function updateDiagnostics(force = false): void {
  if (!game || !host.current) return;
  const now = performance.now();
  if (!force && now - lastDetailsUpdate < 120) return;
  lastDetailsUpdate = now;
  const summary = game.summary();
  const p1 = summary.players[0];
  const p2 = summary.players[1];
  diagnostics.gameplayTick = summary.tick;
  diagnostics.gameplayChecksum = summary.stateChecksum;
  diagnostics.playerHp = p1?.hp ?? 0;
  diagnostics.playerMaxHp = p1?.maxHp ?? 0;
  diagnostics.playerCount = summary.players.length;
  diagnostics.player1Xp = p1?.xp ?? 0;
  diagnostics.player1Gold = p1?.gold ?? 0;
  diagnostics.player1Loot = p1?.lootCount ?? 0;
  diagnostics.player2Hp = p2?.hp ?? 0;
  diagnostics.player2MaxHp = p2?.maxHp ?? 0;
  diagnostics.player2Xp = p2?.xp ?? 0;
  diagnostics.player2Gold = p2?.gold ?? 0;
  diagnostics.player2Loot = p2?.lootCount ?? 0;
  diagnostics.teamQuestKillCredits = summary.teamQuestKillCredits;
  diagnostics.maximumPlayerDistance = summary.maximumPlayerDistance;
  diagnostics.livingMonsters = summary.livingMonsters;
  diagnostics.authoredSpawnDefinitions = summary.spawnDiagnostics.authoredDefinitions;
  diagnostics.authoredSpawnInstances = summary.spawnDiagnostics.authoredInstances;
  diagnostics.activeSpawnInstances = summary.spawnDiagnostics.active;
  diagnostics.sleepingSpawnInstances = summary.spawnDiagnostics.sleeping;
  diagnostics.respawningSpawnInstances = summary.spawnDiagnostics.respawning;
  diagnostics.cappedSpawnInstances = summary.spawnDiagnostics.capped;
  diagnostics.activeMonsterLimit = summary.spawnDiagnostics.activeMonsterLimit;
  diagnostics.activeFloorId = summary.activeFloorId;
  diagnostics.authoredTransitionCount = host.current.project.world.transitions?.length ?? 0;
  diagnostics.secondaryInputDevice = game.playerSlots.find((slot) => slot.slotId === SECONDARY_SLOT_ID)?.deviceKind ?? "—";
  diagnostics.textureLayoutAssets = host.current.project.assets.entries.filter((asset) => asset.texture !== undefined).length;
  const assetStats = renderer.getAssetStats();
  diagnostics.assetTotal = assetStats.totalTextures;
  diagnostics.assetReady = assetStats.readyTextures;
  diagnostics.assetFailed = assetStats.failedTextures;
  const camera = renderer.getCameraStats();
  diagnostics.cameraTilePixels = camera.tilePixels;
  diagnostics.cameraSpreadTiles = camera.spreadTiles;

  hpText.textContent = `${p1?.hp ?? 0} / ${p1?.maxHp ?? 0}`;
  hpFill.style.width = `${p1 ? Math.max(0, Math.min(100, p1.hp / p1.maxHp * 100)) : 0}%`;
  player1Stats.textContent = `XP ${p1?.xp ?? 0} · złoto ${p1?.gold ?? 0} · loot ${p1?.lootCount ?? 0} · kille ${p1?.kills ?? 0}`;
  const hasP2 = p2 !== undefined;
  player2Card.hidden = !hasP2;
  joinHint.hidden = hasP2;
  joinButton.textContent = hasP2 ? "Odłącz P2" : "Dołącz P2";
  if (p2) {
    hpText2.textContent = `${p2.hp} / ${p2.maxHp}`;
    hpFill2.style.width = `${Math.max(0, Math.min(100, p2.hp / p2.maxHp * 100))}%`;
    player2Stats.textContent = `XP ${p2.xp} · złoto ${p2.gold} · loot ${p2.lootCount} · kille ${p2.kills}`;
    abilityText2.textContent = abilityDescription(1);
  }
  floorLabel.textContent = `${host.current.floors.get(game.activeFloorId)?.name ?? game.activeFloorId} · ${game.activeFloorId}\n${summary.players.length} graczy · P2: ${diagnostics.secondaryInputDevice} · tether ${summary.maximumPlayerDistance.toFixed(2)} / ${game.hardTetherTiles}`;
  details.textContent = [
    `projekt: ${host.current.summary.name}`,
    `projectId: ${host.current.summary.projectId}`,
    `project checksum: ${host.current.checksum}`,
    `runtime revision: ${host.revision}`,
    `studio revision: ${diagnostics.studioRevision}`,
    `gameplay tick: ${summary.tick} @ ${game.tickRate} Hz`,
    `gameplay checksum: ${summary.stateChecksum}`,
    `gracze: ${summary.players.map((player) => `${player.playerId}=${player.entityId}/${player.slotId}`).join(" · ")}`,
    `nagrody: quest team ${summary.teamQuestKillCredits} · ${summary.players.map((player) => `${player.playerId} ${player.xp}XP/${player.gold}g/${player.lootCount}L`).join(" · ")}`,
    `potwory przy życiu: ${summary.livingMonsters}`,
    `spawny: ${summary.spawnDiagnostics.authoredDefinitions} definicji / ${summary.spawnDiagnostics.authoredInstances} instancji · aktywne ${summary.spawnDiagnostics.active} · śpiące ${summary.spawnDiagnostics.sleeping} · respawn ${summary.spawnDiagnostics.respawning} · cap ${summary.spawnDiagnostics.capped}/${summary.spawnDiagnostics.activeMonsterLimit}`,
    `przejścia świata: ${diagnostics.authoredTransitionCount} authored · ostatnie ${diagnostics.lastTransitionId || "brak"}`,
    `kamera: spread ${camera.spreadTiles.toFixed(2)} · tile ${camera.tilePixels.toFixed(1)}px`,
    `gameplay language: schema projektu v${diagnostics.projectSchemaVersion} · ${diagnostics.gameplayGraphCount} grafów · ${diagnostics.gameplayBindingCount} bindingów · ${diagnostics.gameplayTriggerCount} triggerów`,
    `domeny: ${diagnostics.gameplayDomains.join(" · ") || "brak"} · błędy wykonania: ${diagnostics.gameplayExecutionFailures}`,
    `assety tekstur: ${assetStats.readyTextures}/${assetStats.totalTextures} gotowe, błędy: ${assetStats.failedTextures} · layouty ${diagnostics.textureLayoutAssets}`,
    `bridge: ${diagnostics.bridgeConnected ? "połączony" : config.mode === "preview" ? "oczekiwanie" : "standalone"}`,
  ].join("\n");
}

function applyProject(inputProject: unknown, studioRevision = 0): ReturnType<AtomicProjectHost["apply"]> {
  const result = host.apply(inputProject);
  diagnostics.studioRevision = studioRevision;
  diagnostics.runtimeRevision = host.revision;
  if (!result.ok) {
    diagnostics.lastError = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    setStatus(host.current ? "Aktualizacja odrzucona — poprzednia gra działa dalej" : "Projekt odrzucony", host.current ? "warn" : "bad");
    if (!host.current) details.textContent = diagnostics.lastError;
    return result;
  }
  const current = host.current!;
  diagnostics.projectId = current.summary.projectId;
  diagnostics.projectName = current.summary.name;
  diagnostics.checksum = current.checksum;
  diagnostics.projectSchemaVersion = current.project.schemaVersion;
  diagnostics.gameplayGraphCount = current.project.gameplay.graphs.length;
  diagnostics.gameplayBindingCount = current.project.gameplay.bindings.length;
  diagnostics.gameplayTriggerCount = current.project.gameplay.triggers.length;
  diagnostics.gameplayDomains = [...new Set(current.project.gameplay.bindings.map((binding) => binding.domain))].sort();
  diagnostics.lastError = "";
  diagnostics.gameplayExecutionFailures = 0;
  try {
    rebuildGameWorld();
    setStatus(config.mode === "preview" ? "M7 OWNER ACCEPTED — sandbox Studio gotowy" : "M7 OWNER ACCEPTED WITH DEBT — fundament gotowy do wejścia w M8 LAN", "good");
    diagnostics.ready = true;
  } catch (error) {
    diagnostics.gameplayReady = false;
    diagnostics.lastError = error instanceof Error ? error.message : String(error);
    setStatus("Projekt poprawny, ale nie można uruchomić coopa", "bad");
    details.textContent = diagnostics.lastError;
  }
  return result;
}

function reply<TType extends Parameters<typeof createBridgeEnvelope>[2]>(
  requestId: string,
  type: TType,
  payload: Parameters<typeof createBridgeEnvelope<TType>>[3],
): void {
  if (!config.sessionNonce) return;
  parent.postMessage(createBridgeEnvelope(config.sessionNonce, requestId, type, payload), "*");
}

if (config.mode === "preview") {
  if (!config.sessionNonce || config.sessionNonce.length < 16) throw new Error("Preview runtime nie otrzymał poprawnego nonce sesji.");
  setStatus("Runtime M7 Owner Accepted gotowy — oczekiwanie na Studio", "warn");
  details.textContent = "Preview działa bez allow-same-origin.\nOczekiwanie na zwalidowany snapshot projektu.";
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== parent || !isBridgeEnvelope(event.data, config.sessionNonce)) return;
    const envelope = event.data as BridgeEnvelope;
    switch (envelope.type) {
      case BRIDGE_TYPES.studioHello: {
        const payload = envelope.payload as StudioHelloPayload;
        diagnostics.bridgeConnected = true;
        reply(envelope.requestId, BRIDGE_TYPES.runtimeReady, {
          runtimeVersion: config.runtimeVersion,
          schemaVersion: 2,
          capabilities: [
            "project.apply.atomic",
            "project.validate.shared",
            "runtime.inspect.summary",
            "gameworld.fixed-step",
            "gameworld.save.v3",
            "world.authored-spawns.v1",
            "world.spawn-lifecycle.lazy",
            "world.transitions.enter",
            "gameworld.local-coop.2p",
            "gameworld.local-coop.keyboard-p2",
            "gameworld.input-slots",
            "gameworld.shared-camera",
            "gameworld.party-rewards",
            "gameplay-language.v1",
            "gameplay.graphs.two-phase",
            "gameplay.triggers.data-driven",
            "gameplay.test-plan",
            "project.schema.v2",
            "assets.texture-resolver.v1",
            "assets.texture-layout.v1",
            "assets.embedded-png",
          ],
        });
        setStatus(`Handshake ze Studio ${payload.studioVersion} zakończony`, "good");
        diagnostics.ready = true;
        break;
      }
      case BRIDGE_TYPES.projectApply: {
        const payload = envelope.payload as ProjectApplyPayload;
        const result = applyProject(payload.project, payload.studioRevision);
        if (result.ok) {
          reply(envelope.requestId, BRIDGE_TYPES.projectApplied, {
            runtimeRevision: result.revision,
            studioRevision: payload.studioRevision,
            checksum: result.checksum,
            summary: result.summary,
          });
        } else {
          reply(envelope.requestId, BRIDGE_TYPES.projectRejected, {
            runtimeRevision: result.revision,
            studioRevision: payload.studioRevision,
            issues: result.issues,
          });
        }
        break;
      }
      case BRIDGE_TYPES.gameplayTest: {
        const payload = envelope.payload as GameplayTestPayload;
        if (!game) {
          reply(envelope.requestId, BRIDGE_TYPES.error, { code: "gameplay_not_ready", message: "GameWorld nie jest gotowy.", requestType: envelope.type });
          break;
        }
        const result = game.planGameplayGraph(payload.graphId, payload.playerId);
        reply(envelope.requestId, BRIDGE_TYPES.gameplayTestResult, { graphId: payload.graphId, playerId: payload.playerId, result });
        break;
      }
      case BRIDGE_TYPES.ping: {
        const payload = envelope.payload as { sentAt: number };
        reply(envelope.requestId, BRIDGE_TYPES.pong, { sentAt: payload.sentAt, receivedAt: performance.now() });
        break;
      }
      default:
        reply(envelope.requestId, BRIDGE_TYPES.error, { code: "unsupported_request", message: `Runtime nie obsługuje wiadomości ${envelope.type}.`, requestType: envelope.type });
    }
  });
} else {
  applyProject(window.__COOPEGE_PROJECT__);
}

function saveCurrent(): GameSaveSnapshotV3 | null {
  if (!game) return null;
  const snapshot = game.createSaveSnapshot();
  memorySave = structuredClone(snapshot);
  try {
    localStorage.setItem(`${SAVE_KEY_PREFIX}${game.projectChecksum}`, JSON.stringify(snapshot));
    setStatus(`Zapis v${snapshot.schemaVersion}: ${snapshot.playerSlots.filter((slot) => slot.joined).length} graczy`, "good");
  } catch {
    setStatus("Zapis coopa zachowany w pamięci sesji preview", "warn");
  }
  return snapshot;
}

function loadSnapshot(snapshot: GameSaveSnapshot): void {
  if (!game) throw new Error("GameWorld nie jest gotowy.");
  game.loadSaveSnapshot(snapshot);
  setStatus(`Zapis gry wczytany i zmigrowany do v${game.createSaveSnapshot().schemaVersion}`, "good");
  updateDiagnostics(true);
}

function togglePlayer2(): void {
  if (!game) return;
  if (game.getPlayer(SECONDARY_PLAYER_ID)) input.leaveSecondPlayer(game);
  else input.joinSecondPlayer(game, "keyboard");
  updateDiagnostics(true);
}

saveButton.addEventListener("click", () => saveCurrent());
loadButton.addEventListener("click", () => {
  if (!game) return;
  let text: string | null = null;
  try {
    text = localStorage.getItem(`${SAVE_KEY_PREFIX}${game.projectChecksum}`);
  } catch {
    // Sandbox preview może nie mieć dostępu do localStorage; używa fallbacku pamięciowego.
  }
  if (text) {
    try {
      loadSnapshot(JSON.parse(text) as GameSaveSnapshot);
      return;
    } catch (error) {
      setStatus(`Zapis odrzucony bez zmiany sesji: ${error instanceof Error ? error.message : String(error)}`, "warn");
      return;
    }
  }
  if (memorySave) {
    try { loadSnapshot(structuredClone(memorySave)); }
    catch (error) { setStatus(`Zapis pamięciowy odrzucony: ${error instanceof Error ? error.message : String(error)}`, "warn"); }
  } else setStatus("Brak zapisu dla tego projektu", "warn");
});
resetButton.addEventListener("click", () => {
  rebuildGameWorld();
  setStatus("Sesja zresetowana deterministycznie", "good");
});
attackButton.addEventListener("click", () => input.queueAttack(PRIMARY_SLOT_ID));
joinButton.addEventListener("click", togglePlayer2);

window.__COOPEGE_GAME_DEBUG__ = {
  queueAttack: (slotId = PRIMARY_SLOT_ID) => input.queueAttack(slotId),
  joinPlayer2: () => { if (game) input.joinSecondPlayer(game); },
  leavePlayer2: () => { if (game) input.leaveSecondPlayer(game); },
  setVirtualCommand: (slotId, command) => input.setVirtualCommand(slotId, command),
  save: () => game?.createSaveSnapshot() ?? null,
  load: (snapshot) => loadSnapshot(snapshot),
  transitionParty: (floorId, anchor) => { if (game) game.transitionParty(floorId, anchor); },
  diagnostics: () => ({ ...diagnostics }),
};

function animationLoop(now: number): void {
  const result = clock.advance(now - lastFrame, () => {
    if (game) game.step(input.capture(game));
  });
  lastFrame = now;
  if (game) {
    consumeEvents(now);
    renderer.render(game, result.alpha, now);
    updateDiagnostics();
  }
  requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);
