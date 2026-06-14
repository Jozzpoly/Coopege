import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { WebSocket } from "ws";
import { createChromiumHarness, findChromiumExecutable } from "../browser/chromium-cdp.mjs";

const root = resolve(import.meta.dirname, "../..");
const executable = findChromiumExecutable();
if (!executable) {
  const message = "SKIP klient LAN Chromium: nie znaleziono Chromium/Chrome/Edge.";
  if (process.env.COOPEGE_REQUIRE_BROWSER === "1") throw new Error(message);
  console.log(message);
} else {
  const outputDir = resolve(root, ".build/browser-smoke");
  const savePath = resolve(root, ".build/lan-client-browser-save.json");
  const serverEntry = resolve(root, ".build/lan-host/apps/lan-host/src/server.js");
  const token = "browser-token-0123456789abcdef";
  mkdirSync(outputDir, { recursive: true });
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

  async function waitForPort() {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const match = output.match(/WebSocket: ws:\/\/<adres>:(\d+)\/lan/);
      if (match) return Number(match[1]);
      if (child.exitCode !== null) throw new Error(`Host LAN zakończył się przed startem.\n${output}`);
      await new Promise((resolveWait) => setTimeout(resolveWait, 25));
    }
    throw new Error(`Timeout podczas startu hosta LAN.\n${output}`);
  }

  function waitForMessage(socket, type, timeoutMs = 5000) {
    return new Promise((resolveMessage, rejectMessage) => {
      const timer = setTimeout(() => {
        socket.off("message", onMessage);
        rejectMessage(new Error(`Timeout wiadomości ${type}.`));
      }, timeoutMs);
      const onMessage = (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.type !== type) return;
        clearTimeout(timer);
        socket.off("message", onMessage);
        resolveMessage(message);
      };
      socket.on("message", onMessage);
    });
  }

  async function openPeer(port, health) {
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
        clientNonce: "browser-peer-0000000000000001",
        reconnectToken: null,
      },
    }));
    const welcome = await welcomePromise;
    return { socket, welcome };
  }

  async function waitForPage(page, expression, label, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = await page.evaluate(expression);
      if (value) return value;
      await new Promise((resolveWait) => setTimeout(resolveWait, 80));
    }
    const diagnostics = await page.evaluate("window.__COOPEGE_LAN_DIAGNOSTICS__ ?? null");
    throw new Error(`Timeout klienta LAN [${label}]: ${JSON.stringify(diagnostics)}\n${output}`);
  }

  let harness;
  let peer;
  try {
    const port = await waitForPort();
    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    if (!healthResponse.ok) throw new Error(`Health hosta LAN zwrócił ${healthResponse.status}.`);
    const health = await healthResponse.json();
    harness = await createChromiumHarness({ executable });
    const result = await harness.withPage(async (page) => {
      await page.navigate(`http://127.0.0.1:${port}/?token=${token}`);
      const connected = await waitForPage(
        page,
        `(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;return d?.ready&&d.connectionState==='connected'&&d.playerId==='player.local.1'?{...d}:null;})()`,
        "bootstrap",
      );
      peer = await openPeer(port, health);
      if (peer.welcome.payload.playerId !== "player.local.2") throw new Error(`Drugi klient otrzymał ${peer.welcome.payload.playerId} zamiast player.local.2.`);
      await waitForPage(page, `(()=>window.__COOPEGE_LAN_DIAGNOSTICS__?.connectedPlayers===2?true:null)()`, "second-peer");
      const before = await page.evaluate(`(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;const s=window.__COOPEGE_LAN_DEBUG__?.latestSnapshot();const p=s?.players.find(entry=>entry.playerId===d?.playerId);return p?{x:p.x,y:p.y,inputSeq:d.inputSeq}:null;})()`);
      await page.keyDown("KeyD", "d", 68);
      await new Promise((resolveWait) => setTimeout(resolveWait, 600));
      await page.keyUp("KeyD", "d", 68);
      const moved = await waitForPage(
        page,
        `(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;const s=window.__COOPEGE_LAN_DEBUG__?.latestSnapshot();const p=s?.players.find(entry=>entry.playerId===d?.playerId);return p&&p.x>${before.x + 0.08}&&d.acknowledgedInputSeq>${before.inputSeq}&&d.snapshotRateHz>5?{diagnostics:{...d},player:{...p},hasLocalWorld:typeof window.__COOPEGE_GAME_DEBUG__!=='undefined',mode:window.__COOPEGE_LAN_CONFIG__?.mode}:null;})()`,
        "native-movement",
      );
      await new Promise((resolveWait) => setTimeout(resolveWait, 1100));
      const finalDiagnostics = await page.evaluate("({...window.__COOPEGE_LAN_DIAGNOSTICS__})");
      await page.screenshot(resolve(outputDir, "m8-lan-client.png"));
      return { connected, before, moved, finalDiagnostics };
    });

    if (result.moved.hasLocalWorld
      || result.moved.mode !== "lan-client"
      || result.moved.diagnostics.connectedPlayers !== 2
      || result.moved.diagnostics.bufferedSnapshots < 2
      || result.moved.diagnostics.inputAge < 0
      || result.finalDiagnostics.connectionState !== "connected") {
      throw new Error(`Nieprawidłowy wynik klienta LAN: ${JSON.stringify(result)}`);
    }
    console.log(`PASS browser m8-lan-client: P1 movement=${(result.moved.player.x - result.before.x).toFixed(2)} · players=2 · snapshots=${result.finalDiagnostics.snapshotRateHz.toFixed(1)} Hz · ACK=${result.finalDiagnostics.acknowledgedInputSeq}/${result.finalDiagnostics.inputSeq} · render-only=PASS`);
  } finally {
    peer?.socket.close(1000, "browser_smoke_complete");
    if (harness) await harness.forceClose();
    child.stdin.write("shutdown\n");
    child.stdin.end();
    await Promise.race([
      new Promise((resolveExit) => child.once("exit", resolveExit)),
      new Promise((resolveTimeout) => setTimeout(resolveTimeout, 3000)),
    ]);
    if (child.exitCode === null) child.kill();
    rmSync(savePath, { force: true });
  }
}
