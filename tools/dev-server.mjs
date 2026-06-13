import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, get } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4173);
const openMode = process.argv.find((argument) => argument.startsWith("--open="))?.split("=")[1] ?? "";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".png": "image/png", ".zip": "application/zip" };
const packageVersion = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
const rootId = createHash("sha256").update(root).digest("hex").slice(0, 16);
const runtimeUrl = `http://localhost:${port}/dist/Coopege_v0.01.html`;
const studioUrl = `http://localhost:${port}/dist/Coopege_Studio_v0.1.html`;
const healthPayload = { ok: true, service: "coopege-dev-server", projectVersion: packageVersion, rootId };

function openBrowser(url) {
  if (!openMode) return;
  try {
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    else if (process.platform === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    else spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch (error) {
    console.warn(`Nie udało się automatycznie otworzyć przeglądarki: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function selectedOpenUrl() {
  if (openMode === "runtime") return runtimeUrl;
  if (openMode === "studio") return studioUrl;
  return "";
}

function probeExistingServer(timeoutMs = 1400) {
  return new Promise((resolveProbe) => {
    const request = get(`http://127.0.0.1:${port}/health`, { timeout: timeoutMs }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { resolveProbe(JSON.parse(body)); }
        catch { resolveProbe(null); }
      });
    });
    request.on("timeout", () => { request.destroy(); resolveProbe(null); });
    request.on("error", () => resolveProbe(null));
  });
}

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(healthPayload));
    return;
  }
  let raw;
  try { raw = decodeURIComponent((request.url || "/").split("?")[0]); }
  catch { response.writeHead(400); response.end("Bad request"); return; }
  const requested = raw.replace(/^[/\\]+/, "") || "dist/Coopege_Studio_v0.1.html";
  let path = resolve(root, requested);
  const relation = relative(root, path);
  if (relation.startsWith("..") || isAbsolute(relation)) { response.writeHead(403); response.end("Forbidden"); return; }
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, "index.html");
  if (!existsSync(path)) { response.writeHead(404); response.end("Not found. Uruchom najpierw npm run build."); return; }
  response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  createReadStream(path).pipe(response);
});

server.on("error", async (error) => {
  if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
    const existing = await probeExistingServer();
    if (existing?.service === healthPayload.service && existing?.rootId === rootId) {
      console.log(`Serwer tej samej paczki Coopege już działa na porcie ${port}.`);
      const url = selectedOpenUrl();
      if (url) openBrowser(url);
      return;
    }
    console.error(`Port ${port} jest zajęty przez inny proces albo inną kopię Coopege. Zamknij poprzedni serwer albo ustaw PORT na inną wartość.`);
  } else console.error(error);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Coopege M7 Playtest Candidate: ${runtimeUrl}`);
  console.log(`Coopege Studio:                ${studioUrl}`);
  console.log(`Minimal runtime:               http://localhost:${port}/dist/Coopege_M7_Runtime.html`);
  console.log("Zatrzymaj serwer skrótem Ctrl+C.");
  const url = selectedOpenUrl();
  if (url) openBrowser(url);
});
