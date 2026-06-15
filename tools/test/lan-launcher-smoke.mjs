import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

if (process.platform !== "win32") {
  console.log("SKIP launcher LAN: test dotyczy Windows .bat.");
} else {
  const root = resolve(import.meta.dirname, "../..");
  const savePath = resolve(root, ".build/lan-launcher-smoke-save.json");
  rmSync(savePath, { force: true });
  const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "PLAY_COOPEGE_LAN.bat"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: "0",
      COOPEGE_LAN_BIND: "127.0.0.1",
      COOPEGE_LAN_OPEN: "0",
      COOPEGE_LAN_TOKEN: "launcher-token-0123456789abcdef",
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

  const deadline = Date.now() + 30_000;
  while (!/WebSocket: ws:\/\/<adres>:\d+\/lan/.test(output) && Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Launcher LAN zakończył się przed startem.\n${output}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  if (!/WebSocket: ws:\/\/<adres>:\d+\/lan/.test(output)) throw new Error(`Timeout launchera LAN.\n${output}`);

  child.stdin.write("shutdown\n");
  child.stdin.end();
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((_, rejectTimeout) => setTimeout(() => rejectTimeout(new Error(`Launcher LAN nie zakończył hosta.\n${output}`)), 10_000)),
  ]);
  if (child.exitCode !== 0) throw new Error(`Launcher LAN zakończył się kodem ${child.exitCode}.\n${output}`);
  if (!existsSync(savePath)) throw new Error(`Launcher LAN nie utworzył save'a.\n${output}`);
  rmSync(savePath, { force: true });
  console.log("PASS launcher LAN: dwuklik startuje gotowy dist, host przyjmuje shutdown i zapisuje świat.");
}
