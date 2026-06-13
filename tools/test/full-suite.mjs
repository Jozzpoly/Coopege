import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { npmInvocation } from "../npm-cli.mjs";

const root = resolve(import.meta.dirname, "../..");

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

function runNpm(label, args, timeoutMs) {
  const invocation = npmInvocation(args);
  run(label, invocation.command, invocation.args, timeoutMs);
}

runNpm("TypeScript strict", ["run", "typecheck"]);
runNpm("Kompilacja testów", ["run", "test:compile"]);
run("Testy Node", process.execPath, ["--test", ".build/node/tests/*.test.js"]);
runNpm("Golden migration", ["run", "verify:migration"]);
runNpm("Chromium", ["run", "test:browser"]);
console.log("\nPASS pełny npm test: TypeScript + Node + migration + Chromium");
