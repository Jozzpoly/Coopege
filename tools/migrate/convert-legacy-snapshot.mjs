import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const migrationDir = resolve(root, process.argv[2] ?? "project/migration/legacy-v14.1");
const rawPath = resolve(migrationDir, "raw/legacy-export.normalized.json");
const assetsDir = resolve(migrationDir, "assets");
const snapshot = JSON.parse(readFileSync(rawPath, "utf8"));
const TICK_RATE = 30;
const GOLDEN_TIME = "2026-06-12T00:00:00.000Z";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(sortDeep(value), null, 2) + "\n";
}

function safeSegment(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^[_\.-]+/, "")
    .replace(/_+/g, "_") || "value";
}

function stableId(...parts) {
  let value = parts.map(safeSegment).filter(Boolean).join(".");
  if (!/^[a-z]/.test(value)) value = `id.${value}`;
  if (value.length <= 64) return value;
  return `${value.slice(0, 54).replace(/[._-]+$/, "")}.${sha256(value).slice(0, 9)}`;
}

function floorId(z) {
  return z < 0 ? `floor.legacy.z_minus_${Math.abs(z)}` : `floor.legacy.z_${z}`;
}

function assetId(legacyId) {
  return stableId("texture", "legacy", legacyId);
}

function abilityKind(atkTypeOrExecutor) {
  if (["bow", "magic", "arrowRain", "fireball", "bone", "breath"].includes(atkTypeOrExecutor)) return "projectile";
  return "melee";
}

function dataUrlToBuffer(value, id) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error(`Asset ${id} nie jest lokalnym PNG data URL.`);
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`Asset ${id} nie ma poprawnej sygnatury PNG.`);
  }
  return buffer;
}

function textureLayoutFor(legacyId, manifestSpec) {
  if (!manifestSpec || !Number.isInteger(manifestSpec.frameWidth) || !Number.isInteger(manifestSpec.frameHeight)) return undefined;
  const frames = Math.max(1, Number(manifestSpec.frames) || 1);
  const common = {
    frameWidth: manifestSpec.frameWidth,
    frameHeight: manifestSpec.frameHeight,
    idleFrame: 0,
    animationFrames: Array.from({ length: frames }, (_, index) => index),
    frameDurationMs: manifestSpec.category === "terrain" ? 360 : manifestSpec.category === "environment" ? 240 : 130,
  };
  if (manifestSpec.directions === 4) {
    return {
      ...common,
      directionRows: { down: 0, left: 1, right: 2, up: 3 },
      pivotX: 0.5,
      pivotY: legacyId.startsWith("player.") ? 0.78 : 0.72,
      worldWidthTiles: legacyId.startsWith("player.") ? 1.08 : 1.18,
      worldHeightTiles: legacyId.startsWith("player.") ? 1.26 : 1.18,
    };
  }
  if (manifestSpec.category === "environment") {
    return { ...common, pivotX: 0.5, pivotY: 0.86, worldWidthTiles: 1, worldHeightTiles: 1.34 };
  }
  return common;
}

rmSync(assetsDir, { recursive: true, force: true });
mkdirSync(assetsDir, { recursive: true });

const legacyAssetEntries = Object.entries(snapshot.assets.assets).sort(([a], [b]) => a.localeCompare(b));
const assetEntries = [];
const assetMap = {};
for (const [legacyId, source] of legacyAssetEntries) {
  const buffer = dataUrlToBuffer(source.data, legacyId);
  const filename = `${legacyId.replace(/[^a-zA-Z0-9_-]+/g, "__")}.png`;
  const path = resolve(assetsDir, filename);
  writeFileSync(path, buffer);
  const id = assetId(legacyId);
  const digest = sha256(buffer);
  const manifestSpec = snapshot.assetManifest.assets[legacyId] ?? source.meta;
  const texture = textureLayoutFor(legacyId, manifestSpec);
  assetEntries.push({ id, kind: "texture", source: `assets/${filename}`, sha256: digest, ...(texture ? { texture } : {}) });
  assetMap[legacyId] = {
    targetId: id,
    file: `assets/${filename}`,
    sha256: digest,
    bytes: buffer.length,
    meta: source.meta ?? snapshot.assetManifest.assets[legacyId] ?? null,
  };
}

const terrainSpecByTile = new Map(
  Object.entries(snapshot.assetManifest.assets)
    .filter(([, spec]) => spec.category === "terrain" && Number.isInteger(spec.tile))
    .map(([id, spec]) => [String(spec.tile), { id, spec }]),
);

const tileDefinitions = Object.entries(snapshot.map.tilePalette)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([legacyTile, flags]) => {
    const terrain = terrainSpecByTile.get(legacyTile);
    return {
      id: `tile.legacy.${legacyTile}`,
      name: terrain?.spec.label ?? `Legacy tile ${legacyTile}`,
      walkable: Boolean(flags.walkable),
      blocksProjectiles: Boolean(flags.shotBlocking),
      ...(terrain ? { assetId: assetId(terrain.id) } : {}),
    };
  });

const floors = Object.entries(snapshot.map.floors)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([z, floor]) => ({
    id: floorId(Number(z)),
    name: Number(z) === 0 ? "Powierzchnia Srebrnej Bramy" : `Legacy Z ${z}`,
    width: snapshot.map.world.width,
    height: snapshot.map.world.height,
    encoding: "rle-v1",
    tiles: floor.tiles.map(([tile, count]) => [`tile.legacy.${tile}`, count]),
  }));

const transitions = [];
for (const link of [...snapshot.map.links].sort((left, right) => left.label.localeCompare(right.label) || left.z - right.z || left.x - right.x || left.y - right.y)) {
  const baseId = stableId("transition", "legacy", link.label);
  transitions.push({
    id: stableId(baseId, "forward"),
    name: link.label,
    trigger: "enter",
    partyRule: "all",
    source: { floorId: floorId(Number(link.z)), x: Number(link.x), y: Number(link.y) },
    destination: { floorId: floorId(Number(link.toZ)), x: Number(link.toX), y: Number(link.toY) },
  });
  transitions.push({
    id: stableId(baseId, "return"),
    name: `${link.label} — powrót`,
    trigger: "enter",
    partyRule: "all",
    source: { floorId: floorId(Number(link.toZ)), x: Number(link.toX), y: Number(link.toY) },
    destination: { floorId: floorId(Number(link.z)), x: Number(link.x), y: Number(link.y) },
  });
}
transitions.sort((left, right) => left.id.localeCompare(right.id));

const abilities = [];
const classes = [];
for (const [legacyClassId, source] of Object.entries(snapshot.content.classes).sort(([a], [b]) => a.localeCompare(b))) {
  const basicId = stableId("ability", "legacy", "class", legacyClassId, "basic");
  const skill = snapshot.content.skills[legacyClassId];
  const activeId = stableId("ability", "legacy", "class", legacyClassId, skill.id);
  abilities.push({
    id: basicId,
    name: `${source.name} — atak podstawowy`,
    kind: abilityKind(source.atkType),
    cooldownTicks: Math.max(1, Math.round(Number(source.atkSpd) * TICK_RATE)),
    rangeTiles: Number((Number(source.atkRange) / snapshot.map.world.tileSize).toFixed(4)),
    power: Number(source.baseAtk),
  });
  const activePower = skill.damageBase ?? Math.round(Number(source.baseAtk) * Number(skill.damageMultiplier ?? 1));
  const activeRange = skill.rangeTiles ?? (skill.radius ? Number(skill.radius) / snapshot.map.world.tileSize : Number(source.atkRange) / snapshot.map.world.tileSize);
  abilities.push({
    id: activeId,
    name: skill.name,
    kind: abilityKind(skill.executor),
    cooldownTicks: Math.max(0, Math.round(Number(skill.cooldown) * TICK_RATE)),
    rangeTiles: Number(Number(activeRange).toFixed(4)),
    power: Math.max(0, Number(activePower)),
  });
  classes.push({
    id: stableId("class", "legacy", legacyClassId),
    name: source.name,
    maxHp: Number(source.hp),
    moveSpeedTilesPerSecond: Number((Number(source.spd) / snapshot.map.world.tileSize).toFixed(4)),
    abilityIds: [basicId, activeId],
    assetId: assetId(`player.${legacyClassId}`),
  });
}

const monsters = [];
for (const [legacyMonsterId, source] of Object.entries(snapshot.content.monsters).sort(([a], [b]) => a.localeCompare(b))) {
  const basicId = stableId("ability", "legacy", "monster", legacyMonsterId, "basic");
  abilities.push({
    id: basicId,
    name: `${source.name} — atak podstawowy`,
    kind: "melee",
    cooldownTicks: Math.max(1, Math.round(Number(source.as) * TICK_RATE)),
    rangeTiles: 1.35,
    power: Number(source.dmg),
  });
  const monsterAbilityIds = [basicId];
  if (source.special?.type) {
    const specialId = stableId("ability", "legacy", "monster", legacyMonsterId, source.special.type);
    abilities.push({
      id: specialId,
      name: `${source.name} — ${source.special.type}`,
      kind: abilityKind(source.special.type),
      cooldownTicks: Math.max(1, Math.round(Number(source.special.cooldown ?? 0) * TICK_RATE)),
      rangeTiles: Number(Number(source.special.maxRange ?? ((source.special.radius ?? 32) / snapshot.map.world.tileSize)).toFixed(4)),
      power: Math.max(0, Math.round(Number(source.dmg) * Number(source.special.damageMultiplier ?? 1))),
    });
    monsterAbilityIds.push(specialId);
  }
  monsters.push({
    id: stableId("monster", "legacy", legacyMonsterId),
    name: source.name,
    maxHp: Number(source.hp),
    moveSpeedTilesPerSecond: Number((Number(source.spd) / snapshot.map.world.tileSize).toFixed(4)),
    abilityIds: monsterAbilityIds,
    assetId: assetId(`monster.${legacyMonsterId}`),
  });
}

const spawns = [];
for (const group of [...snapshot.map.spawnGroups].sort((a, b) => a.id.localeCompare(b.id))) {
  for (const [legacyMonsterId, points] of Object.entries(group.members).sort(([a], [b]) => a.localeCompare(b))) {
    points.forEach(([x, y], index) => {
      spawns.push({
        id: stableId("spawn", "legacy", group.id, legacyMonsterId, String(index + 1)),
        floorId: floorId(Number(group.z)),
        monsterId: stableId("monster", "legacy", legacyMonsterId),
        x: Number(x),
        y: Number(y),
        count: 1,
        respawnTicks: 20 * TICK_RATE,
      });
    });
  }
}

abilities.sort((a, b) => a.id.localeCompare(b.id));
classes.sort((a, b) => a.id.localeCompare(b.id));
monsters.sort((a, b) => a.id.localeCompare(b.id));
spawns.sort((a, b) => a.id.localeCompare(b.id));
assetEntries.sort((a, b) => a.id.localeCompare(b.id));

const project = {
  format: "coopege-project",
  schemaVersion: 1,
  manifest: {
    projectId: "coopege.silver_gate_legacy",
    name: "Coopege — Srebrna Brama (migracja legacy v14.1)",
    projectVersion: "0.0.1-migration",
    createdAt: GOLDEN_TIME,
    updatedAt: GOLDEN_TIME,
    defaultLocale: "pl-PL",
    entryFloorId: floorId(Number(snapshot.map.start.z)),
    playerStart: {
      floorId: floorId(Number(snapshot.map.start.z)),
      x: Number(snapshot.map.start.x),
      y: Number(snapshot.map.start.y),
    },
  },
  world: {
    tileSize: Number(snapshot.map.world.tileSize),
    floors,
    tiles: tileDefinitions,
    transitions,
  },
  content: { classes, abilities, monsters, spawns },
  assets: { schemaVersion: 1, entries: assetEntries },
};

const findings = [
  { category: "world.floors", sourcePath: "$.map.floors", status: "MIGRATED", targetPath: "$.world.floors", message: "Wszystkie 5 warstw 200×200 przeniesiono bez dekodowania i ponownej kompresji RLE." },
  { category: "world.tiles", sourcePath: "$.map.tilePalette", status: "MIGRATED_WITH_TRANSFORM", targetPath: "$.world.tiles", message: "Numery kafli otrzymały stabilne ID tile.legacy.<n>; walkability i blokowanie pocisków zachowano." },
  { category: "content.classes", sourcePath: "$.content.classes", status: "MIGRATED_WITH_TRANSFORM", targetPath: "$.content.classes", message: "Trzy klasy przeniesiono do minimalnego modelu v1; MP, talenty, krytyki, amunicja i pełne statystyki pozostają w surowym snapshotcie." },
  { category: "content.abilities", sourcePath: "$.content.skills", status: "MIGRATED_WITH_TRANSFORM", targetPath: "$.content.abilities", message: "Aktywne umiejętności oraz podstawowe ataki zmapowano na prosty model mocy, zasięgu i cooldownu v1." },
  { category: "content.monsters", sourcePath: "$.content.monsters", status: "MIGRATED_WITH_TRANSFORM", targetPath: "$.content.monsters", message: "Sześć definicji potworów przeniesiono; tier, exp, złoto, rozmiar i szczegóły specjalnych ataków zachowano wyłącznie w surowym snapshotcie." },
  { category: "content.spawns", sourcePath: "$.map.spawnGroups", status: "MIGRATED_WITH_TRANSFORM", targetPath: "$.content.spawns", message: "Nazwane grupy spawnu spłaszczono do pojedynczych spawnów; legacy respawn co 20 sekund zapisano jako 600 ticków przy 30 Hz." },
  { category: "assets", sourcePath: "$.assets.assets", status: "MIGRATED", targetPath: "$.assets.entries", message: "Wszystkie proceduralne i wczytane atlasy wyeksportowano przez TibiaAssetAPI do 45 lokalnych PNG z SHA-256." },
  { category: "world.npcs", sourcePath: "$.map.npcs", status: "UNSUPPORTED", message: "2 NPC zachowano w surowym snapshotcie; schema projektu v1 nie posiada definicji NPC." },
  { category: "world.links", sourcePath: "$.map.links", status: "MIGRATED_WITH_TRANSFORM", targetPath: "$.world.transitions", message: "12 połączeń pięter rozwinięto do 24 jawnych, dwukierunkowych przejść drużynowych wyzwalanych wejściem na pole." },
  { category: "world.entrances", sourcePath: "$.map.entrances", status: "UNSUPPORTED", message: "13 markerów nazwanych lokacji zachowano w surowym snapshotcie; nie są jeszcze osobnym modelem regionów." },
  { category: "content.quests", sourcePath: "$.content.quests", status: "UNSUPPORTED", message: "5 questów zachowano w surowym snapshotcie; schema projektu v1 nie posiada jeszcze questów." },
  { category: "content.talents", sourcePath: "$.content.classes.*.talents", status: "UNSUPPORTED", message: "15 talentów zachowano w surowym snapshotcie; schema projektu v1 nie posiada jeszcze drzewek talentów." },
  { category: "content.items", sourcePath: "legacy runtime hardcoded tables", status: "MANUAL_REVIEW_REQUIRED", message: "Legacy Content API nie eksportuje definicji przedmiotów; grafiki przedmiotów przeniesiono, lecz dane gameplayowe wymagają osobnego ekstraktora lub nowego modelu." },
];

const report = {
  reportVersion: 1,
  generatedBy: "coopege-legacy-migrator-v1",
  generatedAt: GOLDEN_TIME,
  sourceSha256: { runtime: snapshot.source.runtimeSha256 },
  sourceApi: snapshot.api,
  sourceValidation: snapshot.validation,
  summary: {
    floors: floors.length,
    tiles: tileDefinitions.length,
    classes: classes.length,
    abilities: abilities.length,
    monsters: monsters.length,
    spawns: spawns.length,
    assets: assetEntries.length,
    linksMigrated: snapshot.map.links.length,
    transitions: transitions.length,
    npcsPreservedRaw: snapshot.map.npcs.length,
    entrancesPreservedRaw: snapshot.map.entrances.length,
    questsPreservedRaw: snapshot.content.quests.length,
    talentsPreservedRaw: Object.values(snapshot.content.classes).reduce((sum, item) => sum + item.talents.length, 0),
  },
  findings,
};

writeFileSync(resolve(migrationDir, "coopege.project.json"), stableJson(project));
writeFileSync(resolve(migrationDir, "asset-map.json"), stableJson(assetMap));
writeFileSync(resolve(migrationDir, "migration-report.json"), stableJson(report));

const readme = `# Golden fixture migracji legacy v14.1\n\nTen katalog jest deterministycznym wynikiem eksportu przez oficjalne obiekty \`TibiaMapAPI\`, \`TibiaContentAPI\`, \`TibiaAssetAPI\` i \`TibiaProjectAPI\`. Oryginalny HTML w \`legacy/reference/\` nie jest modyfikowany.\n\n- \`raw/legacy-export.normalized.json\` — pełny znormalizowany snapshot API, w tym dane jeszcze nieobsługiwane przez schema v1.\n- \`coopege.project.json\` — poprawny projekt Coopege schema v1.\n- \`assets/\` — 45 atlasów PNG wyeksportowanych przez runtime.\n- \`asset-map.json\` — mapowanie legacy ID → stabilne ID, plik i SHA-256.\n- \`migration-report.json\` — jawne transformacje, braki i elementy wymagające dalszego modelu.\n- \`golden-manifest.json\` — sumy kontrolne całego fixture’a.\n\nRegeneracja: \`npm run migrate:legacy\`.\n`;
writeFileSync(resolve(migrationDir, "README.md"), readme);

console.log(`Zbudowano projekt migracyjny: ${relative(root, resolve(migrationDir, "coopege.project.json"))}`);
console.log(`Przeniesiono: ${floors.length} pięter, ${monsters.length} potworów, ${spawns.length} spawnów, ${assetEntries.length} PNG.`);
console.log(`Raport: ${basename(resolve(migrationDir, "migration-report.json"))}`);
