import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { createAssetBaseline, exportAssetVault } from "./asset-vault.mjs";

const root = resolve(import.meta.dirname, "../..");
const buildDir = resolve(root, ".build/browser");
const distDir = resolve(root, "dist");
const packageVersion = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

function runTsc(app) {
  const configPath = resolve(buildDir, `tsconfig.${app}.json`);
  // Keep every path relative to the generated config and use forward slashes.
  // Absolute Windows paths inside include globs can be interpreted as having no inputs.
  const config = {
    extends: "../../tsconfig.json",
    compilerOptions: {
      module: "AMD",
      moduleResolution: "Classic",
      outFile: `./${app}.js`,
      rootDir: "../..",
      noEmit: false,
      declaration: false,
      sourceMap: false,
      types: [],
    },
    include: [
      `../../apps/${app}/src/**/*.ts`,
      "../../packages/**/*.ts",
    ],
    exclude: [],
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  const localTsc = resolve(root, "node_modules/typescript/bin/tsc");
  if (!existsSync(localTsc)) {
    throw new Error(`Nie znaleziono lokalnego TypeScript: ${localTsc}. Uruchom najpierw npm install.`);
  }
  // Invoke the installed compiler through the current Node executable. Do not fall
  // back to a global `tsc`, because that masks the real compiler error on Windows.
  execFileSync(process.execPath, [localTsc, "-p", configPath], {
    cwd: root,
    stdio: "inherit",
  });
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function hydrateProjectAssets(project, projectDir) {
  const hydrated = structuredClone(project);
  for (const entry of hydrated.assets.entries) {
    if (typeof entry.source !== "string" || entry.source.startsWith("data:") || entry.source.startsWith("procedural://")) continue;
    const file = resolve(projectDir, entry.source);
    const extension = extname(file).toLowerCase();
    if (entry.kind === "texture" && extension !== ".png") throw new Error(`Tekstura ${entry.id} nie wskazuje PNG: ${entry.source}`);
    const bytes = readFileSync(file);
    if (entry.sha256) {
      const actual = createHash("sha256").update(bytes).digest("hex");
      if (actual !== entry.sha256) throw new Error(`SHA-256 assetu ${entry.id} nie zgadza się: ${actual} != ${entry.sha256}`);
    }
    const mime = entry.kind === "texture" ? "image/png" : "application/octet-stream";
    entry.source = `data:${mime};base64,${bytes.toString("base64")}`;
  }
  return hydrated;
}

function createRuntimeHtml(project, config, variant = "m7", projectExpression = false) {
  const template = readFileSync(resolve(root, "apps/runtime/template.html"), "utf8");
  const loader = readFileSync(resolve(root, "tools/build/amd-loader.js"), "utf8");
  const bundle = readFileSync(resolve(buildDir, "runtime.js"), "utf8");
  let html = template
    .replace("/*__PROJECT__*/", projectExpression ? project : safeJson(project))
    .replace("/*__RUNTIME_CONFIG__*/", safeJson(config))
    .replace("/*__AMD_LOADER__*/", loader)
    .replace("/*__APP_BUNDLE__*/", bundle);
  if (variant === "migration") {
    html = html
      .replace("Coopege — M7 Final Playtest Candidate", "Coopege — M7 Final Candidate · Legacy World")
      .replace("Coopege Runtime — M7 Final Playtest Candidate", "Coopege Runtime — M7 Legacy World Candidate");
  }
  if (variant === "preview-host") {
    html = html
      .replace("Coopege — M7 Final Playtest Candidate", "Coopege — Embedded M7 Candidate Preview")
      .replace("Coopege Runtime — M7 Final Playtest Candidate", "Coopege Runtime — M7 preview Studia")
      .replace("M7 / PLAYTEST CANDIDATE · NOT OWNER ACCEPTED", "M7 / sandbox preview · NOT OWNER ACCEPTED");
  }
  return html;
}

function writeArtifact(name, html) {
  writeFileSync(resolve(distDir, name), html);
  return Buffer.byteLength(html);
}

runTsc("runtime");
runTsc("studio");

// Replace published artifacts only after both TypeScript bundles succeeded.
// A failed build must not destroy the last known-good dist directory.
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const minimalProject = JSON.parse(readFileSync(resolve(root, "project/project.json"), "utf8"));
const migrationDir = resolve(root, "project/migration/legacy-v14.1");
const migratedSourceProject = JSON.parse(readFileSync(resolve(migrationDir, "coopege.project.v2.json"), "utf8"));
const migratedProject = hydrateProjectAssets(migratedSourceProject, migrationDir);
const migratedAssetBaseline = createAssetBaseline(migratedSourceProject, migrationDir);
const previewHost = createRuntimeHtml(null, {
  mode: "preview",
  runtimeVersion: packageVersion,
  sessionNonce: "__COOPEGE_SESSION_NONCE__",
}, "preview-host");
const runtimeExportTemplate = createRuntimeHtml("__COOPEGE_EXPORTED_PROJECT_JSON__", {
  mode: "standalone",
  runtimeVersion: packageVersion,
}, "m7", true);

function createStudioHtml(project, assetBaseline = []) {
  const template = readFileSync(resolve(root, "apps/studio/template.html"), "utf8");
  const loader = readFileSync(resolve(root, "tools/build/amd-loader.js"), "utf8");
  const bundle = readFileSync(resolve(buildDir, "studio.js"), "utf8");
  return template
    .replace("/*__PROJECT__*/", safeJson(project))
    .replace("/*__PREVIEW_HTML__*/", safeJson(previewHost))
    .replace("/*__RUNTIME_EXPORT_TEMPLATE__*/", safeJson(runtimeExportTemplate))
    .replace("/*__ASSET_BASELINE__*/", safeJson(assetBaseline))
    .replace("/*__AMD_LOADER__*/", loader)
    .replace("/*__APP_BUNDLE__*/", bundle);
}

const runtimeConfig = { mode: "standalone", runtimeVersion: packageVersion };
const officialRuntime = createRuntimeHtml(migratedProject, runtimeConfig, "migration");
const officialStudio = createStudioHtml(migratedProject, migratedAssetBaseline);
const minimalRuntime = createRuntimeHtml(minimalProject, runtimeConfig);
const artifacts = [
  ["docelowy grywalny runtime M7", "Coopege_v0.01.html", officialRuntime],
  ["docelowe Studio M7", "Coopege_Studio_v0.1.html", officialStudio],
  ["M7 arena minimalna", "Coopege_M7_Runtime.html", minimalRuntime],
  ["M7 runtime pełnego świata", "Coopege_M7_Legacy_Runtime.html", officialRuntime],
  ["M7A Studio", "Coopege_M7A_Studio.html", officialStudio],
  ["M7 Studio", "Coopege_M7_Studio.html", officialStudio],
  ["M6 arena compatibility", "Coopege_M6_Runtime.html", minimalRuntime],
  ["M6 runtime compatibility", "Coopege_M6_Legacy_Runtime.html", officialRuntime],
  ["M6 Studio compatibility", "Coopege_M6_Studio.html", officialStudio],
  ["M5 arena compatibility", "Coopege_M5_Runtime.html", minimalRuntime],
  ["M5 runtime compatibility", "Coopege_M5_Legacy_Runtime.html", officialRuntime],
  ["M5 Studio compatibility", "Coopege_M5_Studio.html", officialStudio],
  ["M4 arena compatibility", "Coopege_M4_Runtime.html", minimalRuntime],
  ["M4 runtime compatibility", "Coopege_M4_Legacy_Runtime.html", officialRuntime],
  ["M4 Studio compatibility", "Coopege_M4_Studio.html", officialStudio],
  ["M3 runtime compatibility", "Coopege_M3_Runtime.html", minimalRuntime],
  ["M3 Studio compatibility", "Coopege_M3_Studio.html", officialStudio],
  ["M2 runtime compatibility", "Coopege_M2_Runtime.html", minimalRuntime],
  ["M2 Studio compatibility", "Coopege_M2_Studio.html", officialStudio],
  ["fundament runtime compatibility", "Coopege_Foundation_Runtime.html", minimalRuntime],
  ["podgląd migracji compatibility", "Coopege_Legacy_Migration_Preview.html", officialRuntime],
  ["fundament Studio compatibility", "Coopege_Foundation_Studio.html", createStudioHtml(minimalProject, [])],
];
for (const [label, name, html] of artifacts) {
  console.log(`Zbudowano ${label}: ${writeArtifact(name, html)} B`);
}

const assetVault = exportAssetVault(migratedSourceProject, migrationDir, migratedAssetBaseline, distDir);
console.log(`Zbudowano Asset Vault M7A: ${assetVault.count} PNG · ZIP ${assetVault.zipBytes} B`);
