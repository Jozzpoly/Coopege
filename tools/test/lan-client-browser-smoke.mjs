import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
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

  async function movePlayer(page, expectedPlayerId, code, key, screenshotName) {
    const before = await page.evaluate(`(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;const s=window.__COOPEGE_LAN_DEBUG__?.latestSnapshot();const p=s?.players.find(entry=>entry.playerId===d?.playerId);return p?{x:p.x,y:p.y,inputSeq:d.inputSeq}:null;})()`);
    await page.keyDown(code, key, code === "KeyD" ? 68 : 39);
    await new Promise((resolveWait) => setTimeout(resolveWait, 650));
    await page.keyUp(code, key, code === "KeyD" ? 68 : 39);
    const moved = await waitForPage(
      page,
      `(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;const s=window.__COOPEGE_LAN_DEBUG__?.latestSnapshot();const p=s?.players.find(entry=>entry.playerId===d?.playerId);return d?.playerId===${JSON.stringify(expectedPlayerId)}&&p&&p.x>${before.x + 0.35}&&d.acknowledgedInputSeq>${before.inputSeq}&&d.snapshotRateHz>5?{diagnostics:{...d},player:{...p},hasLocalWorld:typeof window.__COOPEGE_GAME_DEBUG__!=='undefined',mode:window.__COOPEGE_LAN_CONFIG__?.mode}:null;})()`,
      `${expectedPlayerId}-continuous-movement`,
    );
    await page.screenshot(resolve(outputDir, screenshotName));
    return { before, moved };
  }

  let harness;
  try {
    const port = await waitForPort();
    const url = `http://127.0.0.1:${port}/?token=${token}`;
    harness = await createChromiumHarness({ executable });
    const firstResult = await harness.withPage(async (firstPage) => {
      await firstPage.navigate(url);
      const firstConnected = await waitForPage(
        firstPage,
        `(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;return d?.ready&&d.connectionState==='connected'&&d.playerId==='player.local.1'?{...d}:null;})()`,
        "first-tab-bootstrap",
      );

      let allowSecondMovement;
      const secondMovementGate = new Promise((resolveGate) => { allowSecondMovement = resolveGate; });
      let markSecondReady;
      let markSecondFailed;
      const secondReady = new Promise((resolveReady, rejectReady) => {
        markSecondReady = resolveReady;
        markSecondFailed = rejectReady;
      });
      const secondTask = harness.withPage(async (secondPage) => {
        try {
          await secondPage.navigate(url);
          const secondConnected = await waitForPage(
            secondPage,
            `(()=>{const d=window.__COOPEGE_LAN_DIAGNOSTICS__;return d?.ready&&d.connectionState==='connected'&&d.playerId==='player.local.2'?{...d}:null;})()`,
            "second-tab-bootstrap",
          );
          markSecondReady(secondConnected);
          await secondMovementGate;
          const movement = await movePlayer(secondPage, "player.local.2", "KeyD", "d", "m8-lan-client-tab-2.png");
          return { connected: secondConnected, movement };
        } catch (error) {
          markSecondFailed(error);
          throw error;
        }
      });

      const secondConnected = await secondReady;
      await waitForPage(firstPage, `(()=>window.__COOPEGE_LAN_DIAGNOSTICS__?.connectedPlayers===2?true:null)()`, "two-real-tabs");
      const firstMovement = await movePlayer(firstPage, "player.local.1", "KeyD", "d", "m8-lan-client-tab-1.png");
      allowSecondMovement();
      const secondResult = await secondTask;
      return { firstConnected, secondConnected, firstMovement, secondResult };
    });

    const results = [firstResult.firstMovement.moved, firstResult.secondResult.movement.moved];
    if (results.some((result) => result.hasLocalWorld
      || result.mode !== "lan-client"
      || result.diagnostics.connectedPlayers !== 2
      || result.diagnostics.bufferedSnapshots < 2
      || result.diagnostics.inputAge < 0
      || result.diagnostics.connectionState !== "connected")) {
      throw new Error(`Nieprawidłowy wynik dwóch kart LAN: ${JSON.stringify(firstResult)}`);
    }
    const p1Distance = firstResult.firstMovement.moved.player.x - firstResult.firstMovement.before.x;
    const p2Distance = firstResult.secondResult.movement.moved.player.x - firstResult.secondResult.movement.before.x;
    console.log(`PASS browser m8-lan-two-tabs: P1 movement=${p1Distance.toFixed(2)} · P2 movement=${p2Distance.toFixed(2)} · real tabs=2 · render-only=PASS`);
  } finally {
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
