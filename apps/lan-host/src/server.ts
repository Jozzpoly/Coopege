import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { GameWorld } from "../../../packages/gameplay/src/index.js";
import {
  LAN_MAX_MESSAGE_BYTES,
  LAN_MESSAGE_TYPES,
  createLanEnvelope,
  decodeLanMessage,
  encodeLanMessage,
  type ClientHelloPayload,
  type ClientInputPayload,
  type ClientPingPayload,
  type LanEnvelope,
} from "../../../packages/lan-protocol/src/index.js";
import { prepareRuntimeProject } from "../../../packages/runtime-core/src/index.js";
import { LanHostSession } from "./session.js";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version: string };
const port = Number(process.env.PORT ?? 4174);
const bindAddress = process.env.COOPEGE_LAN_BIND ?? "0.0.0.0";
const projectPath = resolve(root, process.env.COOPEGE_LAN_PROJECT ?? "project/migration/legacy-v14.1/coopege.project.v2.json");
const clientPath = resolve(root, process.env.COOPEGE_LAN_CLIENT ?? "dist/Coopege_M8_LAN_Client.html");
const savePath = resolve(root, process.env.COOPEGE_LAN_SAVE_PATH ?? "data/m8-lan-host-save.json");
const autosaveSeconds = Number(process.env.COOPEGE_LAN_AUTOSAVE_SECONDS ?? 30);
const sessionToken = process.env.COOPEGE_LAN_TOKEN ?? randomBytes(18).toString("hex");

if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT musi być liczbą całkowitą 0..65535.");
if (!Number.isFinite(autosaveSeconds) || autosaveSeconds < 1) throw new Error("COOPEGE_LAN_AUTOSAVE_SECONDS musi wynosić co najmniej 1.");

const projectInput = JSON.parse(readFileSync(projectPath, "utf8")) as unknown;
const preparedResult = prepareRuntimeProject(projectInput);
if (!preparedResult.ok) throw new Error(`Projekt hosta nie przeszedł walidacji: ${JSON.stringify(preparedResult.issues)}`);
const prepared = preparedResult.prepared;
const projectChecksum = createHash("sha256").update(JSON.stringify(projectInput)).digest("hex");
if (!existsSync(clientPath)) throw new Error(`Brak zbudowanego klienta LAN: ${clientPath}. Uruchom npm run build.`);
const clientDocument = readFileSync(clientPath, "utf8");
const world = new GameWorld(prepared, { initialPlayerCount: 2, tickRate: 30 });
if (existsSync(savePath)) {
  const save = JSON.parse(readFileSync(savePath, "utf8")) as Parameters<typeof world.loadSaveSnapshot>[0];
  world.loadSaveSnapshot(save);
}

const session = new LanHostSession({
  world,
  engineVersion: packageJson.version,
  projectId: prepared.project.manifest.projectId,
  projectChecksum,
  sessionToken,
  snapshotRateHz: 10,
});
const sockets = new Map<string, WebSocket>();
let connectionSequence = 0;
let stopping = false;

function send(socket: WebSocket, message: LanEnvelope): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(encodeLanMessage(message));
}

function saveWorld(): void {
  mkdirSync(dirname(savePath), { recursive: true });
  const temporaryPath = `${savePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(session.createSaveSnapshot(), null, 2)}\n`, "utf8");
  renameSync(temporaryPath, savePath);
}

function clientHtml(): string {
  const bootstrap = JSON.stringify({
    engineVersion: packageJson.version,
    projectId: prepared.project.manifest.projectId,
    projectChecksum,
    sessionToken,
  }).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coopege M8 LAN Host</title><style>
body{margin:0;background:#111827;color:#e5e7eb;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{width:min(760px,90vw);background:#1f2937;border:1px solid #374151;border-radius:14px;padding:24px}h1{margin-top:0;color:#f9fafb}.ok{color:#86efac}.bad{color:#fca5a5}code,pre{background:#111827;border-radius:8px;padding:4px 7px}pre{padding:14px;overflow:auto;min-height:130px}small{color:#9ca3af}
</style></head><body><main><h1>Coopege M8 LAN · VS-3 Client</h1><p id="state">Łączenie z hostem…</p><p><small>Awaryjna diagnostyka transportu; standardowa ścieżka serwuje grywalny klient VS-3.</small></p><pre id="details"></pre><script>
const config=${bootstrap};const state=document.querySelector('#state');const details=document.querySelector('#details');
const socket=new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host+'/lan');
const envelope=(type,payload)=>JSON.stringify({protocol:'coopege-lan',protocolVersion:1,type,payload});
socket.addEventListener('open',()=>socket.send(envelope('client.hello',{...config,clientNonce:crypto.randomUUID().replaceAll('-',''),reconnectToken:localStorage.getItem('coopege.m8.reconnect')})));
socket.addEventListener('message',(event)=>{const message=JSON.parse(event.data);details.textContent=JSON.stringify(message,null,2);if(message.type==='host.welcome'){localStorage.setItem('coopege.m8.reconnect',message.payload.reconnectToken);state.className='ok';state.textContent='Połączono jako '+message.payload.playerId+' · host tick '+message.payload.hostTick;}if(message.type==='host.snapshot'){state.className='ok';state.textContent='Połączono · host tick '+message.payload.hostTick+' · graczy '+message.payload.diagnostics.connectedPlayers;}if(message.type==='host.reject'){localStorage.removeItem('coopege.m8.reconnect');state.className='bad';state.textContent='Odrzucono: '+message.payload.message;}});
socket.addEventListener('close',()=>{state.className='bad';state.textContent='Połączenie zamknięte.'});socket.addEventListener('error',()=>{state.className='bad';state.textContent='Błąd WebSocket.'});
</script></main></body></html>`;
}

const httpServer = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({
      ok: true,
      service: "coopege-lan-host",
      engineVersion: packageJson.version,
      projectId: prepared.project.manifest.projectId,
      projectChecksum,
      ...session.diagnostics(),
    }));
    return;
  }
  if (url.pathname === "/" && url.searchParams.get("token") === sessionToken) {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(clientDocument);
    return;
  }
  response.writeHead(url.pathname === "/" ? 403 : 404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(url.pathname === "/" ? "Nieprawidłowy token sesji LAN." : "Not found.");
});

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: LAN_MAX_MESSAGE_BYTES });
httpServer.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname !== "/lan") {
    socket.destroy();
    return;
  }
  websocketServer.handleUpgrade(request, socket, head, (client) => websocketServer.emit("connection", client, request));
});

websocketServer.on("connection", (socket) => {
  connectionSequence += 1;
  const connectionId = `connection-${String(connectionSequence).padStart(6, "0")}`;
  sockets.set(connectionId, socket);
  let authenticated = false;

  socket.on("message", (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      socket.close(1003, "Wymagany tekstowy JSON.");
      return;
    }
    const decoded = decodeLanMessage(data.toString());
    if (!decoded.ok) {
      socket.close(1008, `${decoded.code}: ${decoded.message}`.slice(0, 120));
      return;
    }
    const message = decoded.envelope;
    if (!authenticated) {
      if (message.type !== LAN_MESSAGE_TYPES.clientHello) {
        socket.close(1008, "Pierwszą wiadomością musi być client.hello.");
        return;
      }
      const result = session.connect(connectionId, message.payload as ClientHelloPayload);
      send(socket, result.message);
      if (!result.ok) socket.close(1008, result.code);
      else authenticated = true;
      return;
    }
    if (message.type === LAN_MESSAGE_TYPES.clientInput) {
      session.receiveInput(connectionId, message.payload as ClientInputPayload);
      return;
    }
    if (message.type === LAN_MESSAGE_TYPES.clientPing) {
      const receivedAt = Date.now();
      const pong = session.createPong(connectionId, message.payload as ClientPingPayload, receivedAt);
      if (pong) send(socket, pong);
      return;
    }
    if (message.type === LAN_MESSAGE_TYPES.clientDisconnect) {
      socket.close(1000, "client_exit");
      return;
    }
    socket.close(1008, "Typ wiadomości nie jest dozwolony po stronie klienta.");
  });

  socket.on("close", () => {
    session.disconnect(connectionId);
    sockets.delete(connectionId);
  });
});

const tickTimer = setInterval(() => {
  try {
    const snapshots = session.advanceTick();
    for (const [connectionId, snapshot] of snapshots) {
      const socket = sockets.get(connectionId);
      if (socket) send(socket, snapshot);
    }
  } catch (error) {
    console.error(error);
    void shutdown("protocol_error", 1);
  }
}, 1000 / world.tickRate);
const autosaveTimer = setInterval(() => saveWorld(), autosaveSeconds * 1000);

function addresses(actualPort: number): string[] {
  const values = new Set([`http://127.0.0.1:${actualPort}/?token=${sessionToken}`]);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) values.add(`http://${entry.address}:${actualPort}/?token=${sessionToken}`);
    }
  }
  return [...values];
}

async function shutdown(reason: "server_shutdown" | "protocol_error", exitCode: number): Promise<void> {
  if (stopping) return;
  stopping = true;
  clearInterval(tickTimer);
  clearInterval(autosaveTimer);
  saveWorld();
  for (const [connectionId, socket] of sockets) {
    send(socket, createLanEnvelope(LAN_MESSAGE_TYPES.hostDisconnect, {
      sessionId: session.sessionId,
      reason,
      message: reason === "server_shutdown" ? "Host LAN został zatrzymany." : "Host LAN zatrzymał się po błędzie.",
      reconnectAllowed: reason === "server_shutdown",
    }));
    session.disconnect(connectionId);
    socket.close(1001, reason);
  }
  websocketServer.close();
  process.stdin.pause();
  await new Promise<void>((resolveClose) => httpServer.close(() => resolveClose()));
  process.exitCode = exitCode;
}

process.once("SIGINT", () => void shutdown("server_shutdown", 0));
process.once("SIGTERM", () => void shutdown("server_shutdown", 0));
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  if (String(chunk).split(/\r?\n/).some((line) => line.trim().toLowerCase() === "shutdown")) void shutdown("server_shutdown", 0);
});

httpServer.listen(port, bindAddress, () => {
  const address = httpServer.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Coopege LAN host ${packageJson.version}`);
  console.log(`Projekt: ${prepared.project.manifest.projectId}`);
  console.log(`WebSocket: ws://<adres>:${actualPort}/lan`);
  console.log("Adresy grywalnego klienta LAN:");
  for (const addressValue of addresses(actualPort)) console.log(`  ${addressValue}`);
  console.log(`Autosave: ${savePath}`);
  console.log("Zatrzymanie kontrolowane: wpisz shutdown i naciśnij Enter.");
});
