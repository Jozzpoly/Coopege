import type { PlayerCommand } from "../../../packages/gameplay/src/index.js";
import {
  LAN_MESSAGE_TYPES,
  LanSnapshotBuffer,
  createLanEnvelope,
  decodeLanMessage,
  encodeLanMessage,
  type HostDisconnectPayload,
  type HostPongPayload,
  type HostRejectPayload,
  type HostSnapshotPayload,
  type HostWelcomePayload,
  type LanPresentationEvent,
} from "../../../packages/lan-protocol/src/index.js";
import { prepareRuntimeProject } from "../../../packages/runtime-core/src/index.js";
import { LanClientInputAdapter } from "./lan-input-adapter.js";
import { RuntimeRenderer } from "./renderer.js";

interface LanClientConfig {
  mode: "lan-client";
  runtimeVersion: string;
  engineVersion: string;
  projectId: string;
  projectChecksum: string;
  websocketPath: string;
}

interface LanClientDiagnostics {
  ready: boolean;
  connectionState: "connecting" | "connected" | "rejected" | "disconnected" | "error";
  playerId: string;
  slotId: string;
  sessionId: string;
  hostTick: number;
  inputSeq: number;
  acknowledgedInputSeq: number;
  inputAge: number;
  tickDrift: number;
  rttMs: number;
  snapshotRateHz: number;
  snapshotSeq: number;
  bufferedSnapshots: number;
  interpolationAlpha: number;
  connectedPlayers: number;
  rejectedInputs: number;
  activeFloorId: string;
  lastEventType: string;
  lastError: string;
}

interface LanClientDebugApi {
  diagnostics(): LanClientDiagnostics;
  latestSnapshot(): HostSnapshotPayload | null;
  setVirtualCommand(command: PlayerCommand | null): void;
  queueAttack(): void;
}

declare global {
  interface Window {
    __COOPEGE_PROJECT__?: unknown;
    __COOPEGE_LAN_CONFIG__?: LanClientConfig;
    __COOPEGE_LAN_DIAGNOSTICS__?: LanClientDiagnostics;
    __COOPEGE_LAN_DEBUG__?: LanClientDebugApi;
  }
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Niekompletny shell klienta LAN: ${selector}.`);
  return element;
}

function clientNonce(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2).padEnd(20, "0")}`;
}

const embeddedConfig = window.__COOPEGE_LAN_CONFIG__;
if (!embeddedConfig || embeddedConfig.mode !== "lan-client") throw new Error("Brak konfiguracji klienta LAN.");
const config: LanClientConfig = embeddedConfig;
const preparedResult = prepareRuntimeProject(window.__COOPEGE_PROJECT__);
if (!preparedResult.ok) throw new Error(`Projekt klienta LAN jest nieprawidłowy: ${JSON.stringify(preparedResult.issues)}`);
const prepared = preparedResult.prepared;
if (prepared.project.manifest.projectId !== config.projectId) throw new Error("Osadzony projekt klienta nie zgadza się z konfiguracją LAN.");

const canvas = requiredElement<HTMLCanvasElement>("#world");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D jest niedostępny.");
const status = requiredElement<HTMLElement>("#status");
const identity = requiredElement<HTMLElement>("#identity");
const floorLabel = requiredElement<HTMLElement>("#floorLabel");
const network = requiredElement<HTMLElement>("#network");
const eventLog = requiredElement<HTMLElement>("#eventLog");
const hpText = requiredElement<HTMLElement>("#hpText");
const hpFill = requiredElement<HTMLElement>("#hpFill");
const peerText = requiredElement<HTMLElement>("#peerText");
const attackButton = requiredElement<HTMLButtonElement>("#attackButton");

const renderer = new RuntimeRenderer(canvas, context);
renderer.setProject(prepared);
const input = new LanClientInputAdapter(canvas, renderer);
const snapshots = new LanSnapshotBuffer({ interpolationDelayMs: 110, maximumSnapshots: 12 });
const token = new URLSearchParams(location.search).get("token") ?? "";
const reconnectStorageKey = `coopege.m8.lan.reconnect.${config.projectId}`;
const diagnostics: LanClientDiagnostics = {
  ready: false,
  connectionState: "connecting",
  playerId: "",
  slotId: "",
  sessionId: "",
  hostTick: 0,
  inputSeq: 0,
  acknowledgedInputSeq: 0,
  inputAge: 0,
  tickDrift: 0,
  rttMs: 0,
  snapshotRateHz: 0,
  snapshotSeq: 0,
  bufferedSnapshots: 0,
  interpolationAlpha: 0,
  connectedPlayers: 0,
  rejectedInputs: 0,
  activeFloorId: "",
  lastEventType: "",
  lastError: "",
};
window.__COOPEGE_LAN_DIAGNOSTICS__ = diagnostics;

let socket: WebSocket | null = null;
let welcome: HostWelcomePayload | null = null;
let latestSnapshot: HostSnapshotPayload | null = null;
let recentEvents: string[] = [];
let pingSequence = 0;

function setStatus(message: string, state: "good" | "warn" | "bad"): void {
  status.textContent = message;
  status.dataset.state = state;
}

function reconnectToken(): string | null {
  try { return localStorage.getItem(reconnectStorageKey); }
  catch { return null; }
}

function storeReconnectToken(value: string | null): void {
  try {
    if (value) localStorage.setItem(reconnectStorageKey, value);
    else localStorage.removeItem(reconnectStorageKey);
  } catch {
    // Private browsing may disable storage. The active connection still works.
  }
}

function updateHud(): void {
  const own = latestSnapshot?.players.find((player) => player.playerId === diagnostics.playerId);
  const peer = latestSnapshot?.players.find((player) => player.playerId !== diagnostics.playerId);
  if (own) {
    hpText.textContent = `${Math.ceil(own.hp)} / ${own.maxHp} HP`;
    hpFill.style.width = `${Math.max(0, Math.min(100, own.hp / own.maxHp * 100))}%`;
  }
  peerText.textContent = peer ? `Partner ${peer.alive ? "aktywny" : "odradza się"} · ${Math.ceil(peer.hp)}/${peer.maxHp} HP` : "Oczekiwanie na partnera";
  identity.textContent = diagnostics.playerId ? `${diagnostics.playerId} · ${diagnostics.slotId}` : "Oczekiwanie na przydział gracza";
  floorLabel.textContent = diagnostics.activeFloorId || "—";
  network.textContent = [
    `RTT ${diagnostics.rttMs.toFixed(0)} ms · snapshoty ${diagnostics.snapshotRateHz.toFixed(1)} Hz`,
    `host tick ${diagnostics.hostTick} · drift ${diagnostics.tickDrift} · input age ${diagnostics.inputAge}`,
    `ACK ${diagnostics.acknowledgedInputSeq}/${diagnostics.inputSeq} · bufor ${diagnostics.bufferedSnapshots} · alpha ${diagnostics.interpolationAlpha.toFixed(2)}`,
    `połączeni ${diagnostics.connectedPlayers}/2 · odrzucone inputy ${diagnostics.rejectedInputs}`,
  ].join("\n");
  eventLog.textContent = recentEvents.length ? recentEvents.join("\n") : "Brak zdarzeń gameplayowych.";
}

function recordEvents(events: readonly LanPresentationEvent[]): void {
  for (const event of events) {
    diagnostics.lastEventType = event.type;
    recentEvents.unshift(`[${event.tick}] ${event.type}${event.entityId ? ` · ${event.entityId}` : ""}`);
  }
  recentEvents = recentEvents.slice(0, 12);
}

function handleWelcome(payload: HostWelcomePayload): void {
  welcome = payload;
  diagnostics.connectionState = "connected";
  diagnostics.playerId = payload.playerId;
  diagnostics.slotId = payload.slotId;
  diagnostics.sessionId = payload.sessionId;
  diagnostics.hostTick = payload.hostTick;
  storeReconnectToken(payload.reconnectToken);
  setStatus(`Połączono jako ${payload.playerId}. Oczekiwanie na snapshot świata…`, "good");
}

function handleSnapshot(payload: HostSnapshotPayload): void {
  const receivedAt = performance.now();
  if (!snapshots.push(payload, receivedAt)) return;
  latestSnapshot = payload;
  diagnostics.ready = snapshots.size() >= 2;
  diagnostics.hostTick = payload.hostTick;
  diagnostics.acknowledgedInputSeq = payload.acknowledgedInputSeq;
  diagnostics.inputAge = diagnostics.inputSeq - payload.acknowledgedInputSeq;
  diagnostics.snapshotSeq = payload.diagnostics.snapshotSeq;
  diagnostics.snapshotRateHz = snapshots.snapshotRateHz();
  diagnostics.bufferedSnapshots = snapshots.size();
  diagnostics.connectedPlayers = payload.diagnostics.connectedPlayers;
  diagnostics.rejectedInputs = payload.diagnostics.rejectedInputs;
  diagnostics.activeFloorId = payload.activeFloorId;
  recordEvents(payload.events);
  setStatus(diagnostics.ready ? "Klient LAN zsynchronizowany z autorytatywnym hostem." : "Połączono. Napełnianie bufora interpolacji…", diagnostics.ready ? "good" : "warn");
  updateHud();
}

function handleReject(payload: HostRejectPayload): void {
  diagnostics.connectionState = "rejected";
  diagnostics.lastError = `${payload.code}: ${payload.message}`;
  if (payload.code === "reconnect_rejected") storeReconnectToken(null);
  setStatus(`Host odrzucił klienta: ${payload.message}`, "bad");
}

function handleDisconnect(payload: HostDisconnectPayload): void {
  diagnostics.connectionState = "disconnected";
  diagnostics.lastError = payload.message;
  setStatus(payload.message, payload.reconnectAllowed ? "warn" : "bad");
}

function connect(): void {
  if (token.length < 16) {
    diagnostics.connectionState = "error";
    diagnostics.lastError = "Brak tokenu sesji w adresie URL.";
    setStatus("Brak poprawnego tokenu sesji LAN w adresie.", "bad");
    return;
  }
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${scheme}://${location.host}${config.websocketPath}`);
  socket.addEventListener("open", () => {
    const hello = createLanEnvelope(LAN_MESSAGE_TYPES.clientHello, {
      engineVersion: config.engineVersion,
      projectId: config.projectId,
      projectChecksum: config.projectChecksum,
      sessionToken: token,
      clientNonce: clientNonce(),
      reconnectToken: reconnectToken(),
    });
    socket?.send(encodeLanMessage(hello));
  });
  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    const decoded = decodeLanMessage(event.data);
    if (!decoded.ok) {
      diagnostics.lastError = decoded.message;
      return;
    }
    const message = decoded.envelope;
    if (message.type === LAN_MESSAGE_TYPES.hostWelcome) handleWelcome(message.payload as HostWelcomePayload);
    else if (message.type === LAN_MESSAGE_TYPES.hostSnapshot) handleSnapshot(message.payload as HostSnapshotPayload);
    else if (message.type === LAN_MESSAGE_TYPES.hostReject) handleReject(message.payload as HostRejectPayload);
    else if (message.type === LAN_MESSAGE_TYPES.hostPong) diagnostics.rttMs = Math.max(0, Date.now() - (message.payload as HostPongPayload).clientSentAtMs);
    else if (message.type === LAN_MESSAGE_TYPES.hostDisconnect) handleDisconnect(message.payload as HostDisconnectPayload);
  });
  socket.addEventListener("close", () => {
    if (diagnostics.connectionState !== "rejected") diagnostics.connectionState = "disconnected";
    if (!diagnostics.lastError) setStatus("Połączenie z hostem zostało zamknięte.", "warn");
  });
  socket.addEventListener("error", () => {
    diagnostics.connectionState = "error";
    diagnostics.lastError = "Błąd transportu WebSocket.";
    setStatus(diagnostics.lastError, "bad");
  });
}

function sendInput(): void {
  if (!welcome || !latestSnapshot || !socket || socket.readyState !== WebSocket.OPEN) return;
  const player = latestSnapshot.players.find((entry) => entry.playerId === welcome?.playerId);
  if (!player) return;
  diagnostics.inputSeq += 1;
  const envelope = createLanEnvelope(LAN_MESSAGE_TYPES.clientInput, {
    sessionId: welcome.sessionId,
    playerId: welcome.playerId,
    inputSeq: diagnostics.inputSeq,
    clientTick: latestSnapshot.hostTick,
    sampledAtMs: Date.now(),
    command: input.capture(player),
  });
  socket.send(encodeLanMessage(envelope));
}

function sendPing(): void {
  if (!welcome || !socket || socket.readyState !== WebSocket.OPEN) return;
  pingSequence += 1;
  const envelope = createLanEnvelope(LAN_MESSAGE_TYPES.clientPing, {
    sessionId: welcome.sessionId,
    pingId: `ping.${pingSequence}`,
    sentAtMs: Date.now(),
  });
  socket.send(encodeLanMessage(envelope));
}

function animationLoop(now: number): void {
  const sample = snapshots.sample(now);
  if (sample && welcome) {
    renderer.renderLan(sample.snapshot, welcome.tickRate, now);
    diagnostics.interpolationAlpha = sample.alpha;
    diagnostics.bufferedSnapshots = sample.bufferedSnapshots;
    diagnostics.tickDrift = latestSnapshot ? latestSnapshot.hostTick - sample.snapshot.hostTick : 0;
  }
  updateHud();
  requestAnimationFrame(animationLoop);
}

attackButton.addEventListener("click", () => input.queueAttack());
window.__COOPEGE_LAN_DEBUG__ = {
  diagnostics: () => ({ ...diagnostics }),
  latestSnapshot: () => latestSnapshot ? structuredClone(latestSnapshot) : null,
  setVirtualCommand: (command) => input.setVirtualCommand(command),
  queueAttack: () => input.queueAttack(),
};
window.addEventListener("beforeunload", () => {
  if (welcome && socket?.readyState === WebSocket.OPEN) {
    socket.send(encodeLanMessage(createLanEnvelope(LAN_MESSAGE_TYPES.clientDisconnect, { sessionId: welcome.sessionId, reason: "client_exit" })));
  }
});

setStatus("Łączenie z autorytatywnym hostem LAN…", "warn");
connect();
setInterval(sendInput, 1000 / 30);
setInterval(sendPing, 1000);
requestAnimationFrame(animationLoop);
