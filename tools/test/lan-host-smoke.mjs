import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { WebSocket } from "ws";

const root = resolve(import.meta.dirname, "../..");
const serverEntry = resolve(root, ".build/lan-host/apps/lan-host/src/server.js");
const savePath = resolve(root, ".build/lan-host-smoke-save.json");
const token = "smoke-token-0123456789abcdef";
rmSync(savePath, { force: true });

const child = spawn(process.execPath, [serverEntry], {
  cwd: root,
  env: {
    ...process.env,
    PORT: "0",
    COOPEGE_LAN_BIND: "127.0.0.1",
    COOPEGE_LAN_TOKEN: token,
    COOPEGE_LAN_SAVE_PATH: savePath,
    COOPEGE_LAN_AUTOSAVE_SECONDS: "300",
  },
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

let output = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

function fail(message) {
  throw new Error(`${message}\n${output}`);
}

async function waitForPort() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const match = output.match(/WebSocket: ws:\/\/<adres>:(\d+)\/lan/);
    if (match) return Number(match[1]);
    if (child.exitCode !== null) fail(`Host zakończył się kodem ${child.exitCode} przed startem.`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  fail("Timeout podczas oczekiwania na start hosta.");
}

function waitForMessage(socket, type, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolveMessage, rejectMessage) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      rejectMessage(new Error(`Timeout wiadomości ${type}.`));
    }, timeoutMs);
    const onMessage = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type !== type || !predicate(message)) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolveMessage(message);
    };
    socket.on("message", onMessage);
  });
}

async function openClient(port, health, nonce) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/lan`);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.once("open", resolveOpen);
    socket.once("error", rejectOpen);
  });
  const welcomePromise = waitForMessage(socket, "host.welcome");
  socket.send(JSON.stringify({
    protocol: "coopege-lan",
    protocolVersion: 1,
    type: "client.hello",
    payload: {
      engineVersion: health.engineVersion,
      projectId: health.projectId,
      projectChecksum: health.projectChecksum,
      sessionToken: token,
      clientNonce: nonce,
      reconnectToken: null,
    },
  }));
  const welcome = await welcomePromise;
  return { socket, welcome };
}

function send(socket, type, payload) {
  socket.send(JSON.stringify({ protocol: "coopege-lan", protocolVersion: 1, type, payload }));
}

let first;
let second;
try {
  const port = await waitForPort();
  const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
  if (!healthResponse.ok) fail(`Health zwrócił HTTP ${healthResponse.status}.`);
  const health = await healthResponse.json();
  if (health.service !== "coopege-lan-host" || health.hostTick < 0) fail("Health hosta ma nieprawidłowy payload.");
  const forbidden = await fetch(`http://127.0.0.1:${port}/`);
  if (forbidden.status !== 403) fail(`Strona bez tokenu zwróciła ${forbidden.status}, oczekiwano 403.`);
  const page = await fetch(`http://127.0.0.1:${port}/?token=${token}`);
  if (!page.ok || !(await page.text()).includes("VS-2 Host")) fail("Strona diagnostyczna hosta nie jest dostępna.");

  first = await openClient(port, health, "smoke-client-0000000000000001");
  second = await openClient(port, health, "smoke-client-0000000000000002");
  if (first.welcome.payload.playerId === second.welcome.payload.playerId) fail("Host przydzielił ten sam playerId obu klientom.");

  const snapshotPromise = waitForMessage(first.socket, "host.snapshot", (message) => message.payload.acknowledgedInputSeq === 1);
  send(first.socket, "client.input", {
    sessionId: first.welcome.payload.sessionId,
    playerId: first.welcome.payload.playerId,
    inputSeq: 1,
    clientTick: first.welcome.payload.hostTick,
    sampledAtMs: Date.now(),
    command: { moveX: 1, moveY: 0, aimX: 1, aimY: 0, usePrimary: false },
  });
  const snapshot = await snapshotPromise;
  if (snapshot.payload.players.length !== 2 || snapshot.payload.diagnostics.connectedPlayers !== 2) fail("Snapshot nie zawiera dwóch graczy.");

  const pongPromise = waitForMessage(first.socket, "host.pong");
  send(first.socket, "client.ping", {
    sessionId: first.welcome.payload.sessionId,
    pingId: "smoke.ping.1",
    sentAtMs: Date.now(),
  });
  const pong = await pongPromise;
  if (pong.payload.pingId !== "smoke.ping.1") fail("Pong nie odpowiada wysłanemu pingowi.");

  console.log(`PASS host LAN: HTTP + 2 WebSocket + input ACK + ping/pong, tick ${snapshot.payload.hostTick}`);
} finally {
  first?.socket.close(1000, "smoke_complete");
  second?.socket.close(1000, "smoke_complete");
  child.stdin.write("shutdown\n");
  child.stdin.end();
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 3000)),
  ]);
  if (child.exitCode === null) {
    child.kill();
    fail("Host nie zakończył się po kontrolowanej komendzie shutdown.");
  }
  if (!existsSync(savePath)) fail("Host nie utworzył save'a przy zamknięciu.");
  rmSync(savePath, { force: true });
}
