import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, command, args, timeoutMs = 240000) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.signal) throw new Error(`${label}: proces zakończony sygnałem ${result.signal}`);
  if (result.status !== 0) throw new Error(`${label}: kod wyjścia ${result.status}`);
}

run("TypeScript strict", npm, ["run", "typecheck"]);
run("Kompilacja testów", npm, ["run", "test:compile"]);
run("Testy Node", process.execPath, ["--test", ".build/node/tests/*.test.js"]);
run("Golden migration", npm, ["run", "verify:migration"]);
run("Chromium", npm, ["run", "test:browser"]);
console.log("\nPASS pełny npm test: TypeScript + Node + migration + Chromium");
