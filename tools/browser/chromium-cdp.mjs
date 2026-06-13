import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_BROWSER_CANDIDATES = process.platform === "win32"
  ? [
      process.env.CHROME_PATH,
      process.env.EDGE_PATH,
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google/Chrome/Application/chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
      join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft/Edge/Application/msedge.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"),
    ]
  : process.platform === "darwin"
    ? [
        process.env.CHROME_PATH,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ]
    : [
        process.env.CHROME_PATH,
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/microsoft-edge",
      ];

export function findChromiumExecutable() {
  const explicit = process.env.COOPEGE_BROWSER;
  if (explicit && existsSync(explicit)) return explicit;
  return DEFAULT_BROWSER_CANDIDATES.filter(Boolean).find((path) => existsSync(path)) ?? null;
}

class CdpConnection {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    const socket = new WebSocket(this.webSocketUrl);
    this.socket = socket;
    socket.addEventListener("message", (event) => this.#onMessage(event.data));
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout połączenia z Chromium DevTools.")), 10000);
      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Nie udało się połączyć z Chromium DevTools."));
      }, { once: true });
    });
  }

  #onMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) pending.reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ""}`));
      else pending.resolve(message.result);
      return;
    }
    const key = `${message.sessionId ?? "browser"}:${message.method}`;
    for (const listener of this.listeners.get(key) ?? []) listener(message.params ?? {});
  }

  send(method, params = {}, sessionId, timeoutMs = 30000) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error("Połączenie CDP nie jest otwarte.");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout komendy CDP ${method} po ${timeoutMs} ms.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  once(method, sessionId, timeoutMs = 15000) {
    const key = `${sessionId ?? "browser"}:${method}`;
    return new Promise((resolve, reject) => {
      const listener = (params) => {
        clearTimeout(timeout);
        const listeners = this.listeners.get(key) ?? [];
        this.listeners.set(key, listeners.filter((item) => item !== listener));
        resolve(params);
      };
      const timeout = setTimeout(() => {
        const listeners = this.listeners.get(key) ?? [];
        this.listeners.set(key, listeners.filter((item) => item !== listener));
        reject(new Error(`Timeout oczekiwania na zdarzenie CDP ${method}.`));
      }, timeoutMs);
      const listeners = this.listeners.get(key) ?? [];
      listeners.push(listener);
      this.listeners.set(key, listeners);
    });
  }

  close() {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`Połączenie CDP zamknięto przed odpowiedzią na komendę ${id}.`));
    }
    this.pending.clear();
    this.socket?.close();
  }
}

function waitForDevTools(child, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Chromium nie udostępnił DevTools w czasie ${timeoutMs} ms.\n${stderr.slice(-3000)}`));
    }, timeoutMs);
    const inspect = (chunk) => {
      const text = String(chunk);
      stderr += text;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        child.stderr.off("data", inspect);
        resolve(match[1]);
      }
    };
    child.stderr.on("data", inspect);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chromium zakończył się przed uruchomieniem DevTools (kod ${code}).\n${stderr.slice(-3000)}`));
    });
  });
}

async function launchChromium(options = {}) {
  const executable = options.executable ?? findChromiumExecutable();
  if (!executable) throw new Error("Nie znaleziono Chromium, Chrome ani Edge. Ustaw COOPEGE_BROWSER na ścieżkę do przeglądarki.");
  const profileDir = mkdtempSync(join(tmpdir(), "coopege-chromium-"));
  const child = spawn(executable, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-gpu",
    "--mute-audio",
    "--hide-scrollbars",
    "--no-sandbox",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"], detached: process.platform !== "win32" });
  const webSocketUrl = await waitForDevTools(child);
  const connection = new CdpConnection(webSocketUrl);
  await connection.connect();
  return { executable, profileDir, child, connection };
}

async function closeChromiumProcess(harness) {
  let exited = harness.child.exitCode !== null || harness.child.signalCode !== null;
  const exitPromise = exited
    ? Promise.resolve()
    : new Promise((resolve) => harness.child.once("exit", () => { exited = true; resolve(); }));
  try { await harness.connection.send("Browser.close", {}, undefined, 5000); } catch {}
  await Promise.race([exitPromise, new Promise((resolve) => setTimeout(resolve, 2500))]);
  exited = exited || harness.child.exitCode !== null || harness.child.signalCode !== null;
  if (!exited) {
    if (process.platform === "win32") harness.child.kill("SIGKILL");
    else process.kill(-harness.child.pid, "SIGKILL");
    await Promise.race([exitPromise, new Promise((resolve) => setTimeout(resolve, 1200))]);
  }
  try { harness.connection.close(); } catch {}
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      rmSync(harness.profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 60 });
      await new Promise((resolve) => setTimeout(resolve, 150));
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)));
    }
  }
}

async function withPageOnHarness(harness, callback) {
  const { connection, executable } = harness;
  let targetId;
  let sessionId;
  try {
    // A fresh target is enough isolation for the self-contained HTML builds.
    // Creating and disposing a full incognito context per scenario can deadlock
    // Chromium on long Windows/Linux smoke suites after several canvas-heavy pages.
    ({ targetId } = await connection.send("Target.createTarget", { url: "about:blank" }));
    ({ sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true }));
    await connection.send("Page.enable", {}, sessionId);
    await connection.send("Runtime.enable", {}, sessionId);
    await connection.send("Log.enable", {}, sessionId);
    await connection.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);

    const page = {
      executable,
      async navigate(url, timeoutMs = 30000) {
        const loaded = connection.once("Page.loadEventFired", sessionId, timeoutMs);
        const result = await connection.send("Page.navigate", { url }, sessionId);
        if (result.errorText) throw new Error(`Błąd nawigacji Chromium: ${result.errorText}`);
        await loaded;
      },
      async setContent(html) {
        const tree = await connection.send("Page.getFrameTree", {}, sessionId);
        const frameId = tree.frameTree.frame.id;
        await connection.send("Page.setDocumentContent", { frameId, html }, sessionId);
      },
      async evaluate(expression, options = {}) {
        const commandTimeoutMs = options.commandTimeoutMs ?? Math.max(45000, options.timeoutMs ?? 0);
        const result = await connection.send("Runtime.evaluate", {
          expression,
          awaitPromise: options.awaitPromise !== false,
          returnByValue: true,
          userGesture: true,
          ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}),
        }, sessionId, commandTimeoutMs);
        if (result.exceptionDetails) {
          const description = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Nieznany wyjątek w przeglądarce.";
          throw new Error(description);
        }
        return result.result?.value;
      },
      async keyDown(code, key = code, windowsVirtualKeyCode = 0) {
        await connection.send("Input.dispatchKeyEvent", { type: "keyDown", code, key, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode }, sessionId);
      },
      async keyUp(code, key = code, windowsVirtualKeyCode = 0) {
        await connection.send("Input.dispatchKeyEvent", { type: "keyUp", code, key, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode }, sessionId);
      },
      async pressKey(code, key = code, windowsVirtualKeyCode = 0, holdMs = 80) {
        await this.keyDown(code, key, windowsVirtualKeyCode);
        await new Promise((resolve) => setTimeout(resolve, holdMs));
        await this.keyUp(code, key, windowsVirtualKeyCode);
      },
      async screenshot(path) {
        const result = await connection.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
        const { writeFileSync } = await import("node:fs");
        writeFileSync(path, Buffer.from(result.data, "base64"));
      },
    };
    return await callback(page);
  } finally {
    if (targetId) {
      try { await connection.send("Target.closeTarget", { targetId }, undefined, 3000); } catch {}
    }
  }
}

export async function createChromiumHarness(options = {}) {
  const harness = await launchChromium(options);
  let closed = false;
  return {
    executable: harness.executable,
    async withPage(callback) {
      if (closed) throw new Error("Harness Chromium został już zamknięty.");
      return withPageOnHarness(harness, callback);
    },
    async close() {
      if (closed) return;
      closed = true;
      await closeChromiumProcess(harness);
    },
    async forceClose() {
      if (closed) return;
      closed = true;
      try { harness.connection.close(); } catch {}
      const exited = harness.child.exitCode !== null || harness.child.signalCode !== null;
      const exitPromise = exited ? Promise.resolve() : new Promise((resolveExit) => harness.child.once("exit", resolveExit));
      try {
        if (process.platform === "win32") execFileSync("taskkill", ["/pid", String(harness.child.pid), "/t", "/f"], { stdio: "ignore" });
        else process.kill(-harness.child.pid, "SIGKILL");
      } catch {}
      await Promise.race([exitPromise, new Promise((resolveWait) => setTimeout(resolveWait, 1800))]);
      try { harness.child.stderr?.destroy(); } catch {}
      try { harness.child.unref(); } catch {}
      try { rmSync(harness.profileDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 }); } catch {}
    },
  };
}

export async function withChromiumPage(callback, options = {}) {
  const harness = await createChromiumHarness(options);
  try {
    return await harness.withPage(callback);
  } finally {
    await harness.close();
  }
}
