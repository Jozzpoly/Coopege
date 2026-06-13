import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const port = 46000 + (process.pid % 1000);
const env = { ...process.env, PORT: String(port) };

function start(args = []) {
  return spawn(process.execPath, ["tools/dev-server.mjs", ...args], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForHealth(timeoutMs = 7000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 80));
  }
  throw new Error("Serwer testowy nie wystawił /health.");
}

const primary = start();
let primaryOutput = "";
primary.stdout.on("data", (chunk) => { primaryOutput += chunk; });
primary.stderr.on("data", (chunk) => { primaryOutput += chunk; });
try {
  const health = await waitForHealth();
  if (health?.service !== "coopege-dev-server" || typeof health.rootId !== "string" || !health.projectVersion) {
    throw new Error(`Niepoprawny health payload: ${JSON.stringify(health)}`);
  }
  const secondary = start();
  let secondaryOutput = "";
  secondary.stdout.on("data", (chunk) => { secondaryOutput += chunk; });
  secondary.stderr.on("data", (chunk) => { secondaryOutput += chunk; });
  const [code] = await Promise.race([
    once(secondary, "exit"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Drugi launcher nie zakończył się po wykryciu istniejącego serwera.")), 7000)),
  ]);
  if (code !== 0 || !secondaryOutput.includes("już działa")) {
    throw new Error(`Ponowne uruchomienie nie zostało bezpiecznie obsłużone. code=${code}\n${secondaryOutput}`);
  }
  console.log(`PASS dev-server reuse: ${health.projectVersion} · rootId ${health.rootId} · port ${port}`);
} finally {
  primary.kill("SIGTERM");
  await Promise.race([once(primary, "exit"), new Promise((resolveWait) => setTimeout(resolveWait, 1500))]).catch(() => {});
}
