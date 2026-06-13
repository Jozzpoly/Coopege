import type {
  AssetEntry,
  CoopegeProjectInput,
  CoopegeProjectV1,
  CoopegeProjectV2,
  FloorDefinition,
  StableId,
} from "../../schema/src/types.js";
import { isSafeProjectAssetSource } from "../../asset-system/src/index.js";
import { createCoreGameplayRegistry, validateGameplayLanguage } from "../../gameplay-language/src/index.js";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: IssueSeverity;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

const STABLE_ID = /^[a-z][a-z0-9._-]{2,63}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(
  issues: ValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: IssueSeverity = "error",
): void {
  issues.push({ code, path, message, severity });
}

function requireStableId(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is StableId {
  if (typeof value !== "string" || !STABLE_ID.test(value)) {
    add(
      issues,
      "invalid_stable_id",
      path,
      "ID musi zaczynać się małą literą i zawierać 3–64 znaki: a-z, 0-9, kropkę, podkreślenie lub myślnik.",
    );
    return false;
  }
  return true;
}

function requireFiniteNumber(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: { integer?: boolean; min?: number; max?: number } = {},
): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    add(issues, "invalid_number", path, "Wartość musi być skończoną liczbą.");
    return false;
  }
  if (options.integer && !Number.isInteger(value)) {
    add(issues, "invalid_integer", path, "Wartość musi być liczbą całkowitą.");
    return false;
  }
  if (options.min !== undefined && value < options.min) {
    add(issues, "number_too_small", path, `Wartość nie może być mniejsza niż ${options.min}.`);
    return false;
  }
  if (options.max !== undefined && value > options.max) {
    add(issues, "number_too_large", path, `Wartość nie może być większa niż ${options.max}.`);
    return false;
  }
  return true;
}

function uniqueIds<T extends { id: string }>(
  values: readonly T[],
  path: string,
  issues: ValidationIssue[],
): Set<string> {
  const result = new Set<string>();
  values.forEach((value, index) => {
    const itemPath = `${path}[${index}].id`;
    if (!requireStableId(value.id, itemPath, issues)) return;
    if (result.has(value.id)) {
      add(issues, "duplicate_id", itemPath, `Powtórzone ID: ${value.id}.`);
      return;
    }
    result.add(value.id);
  });
  return result;
}

function validateFloor(
  floor: FloorDefinition,
  index: number,
  tileIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): void {
  const path = `$.world.floors[${index}]`;
  requireStableId(floor.id, `${path}.id`, issues);
  const widthOk = requireFiniteNumber(floor.width, `${path}.width`, issues, {
    integer: true,
    min: 1,
    max: 4096,
  });
  const heightOk = requireFiniteNumber(floor.height, `${path}.height`, issues, {
    integer: true,
    min: 1,
    max: 4096,
  });
  if (floor.encoding !== "rle-v1") {
    add(issues, "unsupported_encoding", `${path}.encoding`, "Obsługiwane kodowanie to rle-v1.");
  }
  if (!Array.isArray(floor.tiles)) {
    add(issues, "invalid_rle", `${path}.tiles`, "Lista runów RLE musi być tablicą.");
    return;
  }
  let decodedLength = 0;
  floor.tiles.forEach((run, runIndex) => {
    const runPath = `${path}.tiles[${runIndex}]`;
    if (!Array.isArray(run) || run.length !== 2) {
      add(issues, "invalid_rle_run", runPath, "Run RLE musi mieć postać [tileId, count].");
      return;
    }
    const [tileId, count] = run;
    if (typeof tileId !== "string" || !tileIds.has(tileId)) {
      add(issues, "unknown_tile_reference", `${runPath}[0]`, `Nieznany kafel: ${String(tileId)}.`);
    }
    if (requireFiniteNumber(count, `${runPath}[1]`, issues, { integer: true, min: 1 })) {
      decodedLength += count;
    }
  });
  if (widthOk && heightOk && decodedLength !== floor.width * floor.height) {
    add(
      issues,
      "invalid_rle_length",
      `${path}.tiles`,
      `RLE dekoduje ${decodedLength} pól, oczekiwano ${floor.width * floor.height}.`,
    );
  }
}

function validateAsset(entry: AssetEntry, index: number, issues: ValidationIssue[]): void {
  const path = `$.assets.entries[${index}]`;
  requireStableId(entry.id, `${path}.id`, issues);
  if (!(["texture", "audio", "data"] as const).includes(entry.kind)) {
    add(issues, "invalid_asset_kind", `${path}.kind`, "Nieobsługiwany rodzaj assetu.");
  }
  if (typeof entry.source !== "string" || entry.source.length === 0) {
    add(issues, "invalid_asset_source", `${path}.source`, "Asset musi mieć niepuste źródło.");
  } else if (!isSafeProjectAssetSource(entry.source, entry.kind)) {
    add(issues, "unsafe_asset_source", `${path}.source`, "Źródło assetu musi być względną ścieżką projektu albo osadzonym PNG data URL; zdalne i wykonywalne URL są zabronione.");
  }
  if (entry.sha256 !== undefined && !SHA256.test(entry.sha256)) {
    add(issues, "invalid_sha256", `${path}.sha256`, "SHA-256 musi mieć 64 małe znaki hex.");
  }
  if (entry.texture !== undefined) {
    const texturePath = `${path}.texture`;
    if (entry.kind !== "texture") add(issues, "texture_layout_on_non_texture", texturePath, "Metadane atlasu można przypisać wyłącznie do assetu texture.");
    requireFiniteNumber(entry.texture.frameWidth, `${texturePath}.frameWidth`, issues, { integer: true, min: 1, max: 8192 });
    requireFiniteNumber(entry.texture.frameHeight, `${texturePath}.frameHeight`, issues, { integer: true, min: 1, max: 8192 });
    if (entry.texture.directionRows !== undefined) {
      for (const key of ["down", "left", "right", "up"] as const) {
        requireFiniteNumber(entry.texture.directionRows[key], `${texturePath}.directionRows.${key}`, issues, { integer: true, min: 0, max: 255 });
      }
    }
    if (entry.texture.idleFrame !== undefined) requireFiniteNumber(entry.texture.idleFrame, `${texturePath}.idleFrame`, issues, { integer: true, min: 0, max: 255 });
    if (entry.texture.animationFrames !== undefined) {
      if (!Array.isArray(entry.texture.animationFrames) || entry.texture.animationFrames.length === 0) {
        add(issues, "invalid_animation_frames", `${texturePath}.animationFrames`, "Lista klatek animacji nie może być pusta.");
      } else {
        entry.texture.animationFrames.forEach((frame, frameIndex) => requireFiniteNumber(frame, `${texturePath}.animationFrames[${frameIndex}]`, issues, { integer: true, min: 0, max: 255 }));
      }
    }
    if (entry.texture.frameDurationMs !== undefined) requireFiniteNumber(entry.texture.frameDurationMs, `${texturePath}.frameDurationMs`, issues, { min: 16, max: 60_000 });
    if (entry.texture.pivotX !== undefined) requireFiniteNumber(entry.texture.pivotX, `${texturePath}.pivotX`, issues, { min: 0, max: 1 });
    if (entry.texture.pivotY !== undefined) requireFiniteNumber(entry.texture.pivotY, `${texturePath}.pivotY`, issues, { min: 0, max: 1 });
    if (entry.texture.worldWidthTiles !== undefined) requireFiniteNumber(entry.texture.worldWidthTiles, `${texturePath}.worldWidthTiles`, issues, { min: 0.05, max: 32 });
    if (entry.texture.worldHeightTiles !== undefined) requireFiniteNumber(entry.texture.worldHeightTiles, `${texturePath}.worldHeightTiles`, issues, { min: 0.05, max: 32 });
  }
}

function decodedTileAt(floor: FloorDefinition, x: number, y: number): string | undefined {
  const target = y * floor.width + x;
  let cursor = 0;
  for (const [tileId, count] of floor.tiles) {
    if (target >= cursor && target < cursor + count) return tileId;
    cursor += count;
  }
  return undefined;
}

export function validateProject(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    add(issues, "invalid_project", "$", "Projekt musi być obiektem JSON.");
    return { ok: false, issues };
  }
  if (input.format !== "coopege-project") {
    add(issues, "invalid_format", "$.format", "Oczekiwano formatu coopege-project.");
  }
  if (input.schemaVersion !== 1 && input.schemaVersion !== 2) {
    add(issues, "unsupported_schema_version", "$.schemaVersion", "Obsługiwane wersje schematu projektu to 1 i 2.");
  }

  const project = input as unknown as CoopegeProjectInput;
  if (!isRecord(project.manifest)) {
    add(issues, "missing_manifest", "$.manifest", "Brak manifestu projektu.");
    return { ok: false, issues };
  }
  requireStableId(project.manifest.projectId, "$.manifest.projectId", issues);
  if (typeof project.manifest.name !== "string" || project.manifest.name.trim().length === 0) {
    add(issues, "invalid_name", "$.manifest.name", "Nazwa projektu nie może być pusta.");
  }

  if (!isRecord(project.world) || !Array.isArray(project.world.tiles) || !Array.isArray(project.world.floors)) {
    add(issues, "invalid_world", "$.world", "Świat musi zawierać tablice tiles i floors.");
    return { ok: false, issues };
  }

  const tileIds = uniqueIds(project.world.tiles, "$.world.tiles", issues);
  project.world.tiles.forEach((tile, index) => {
    const path = `$.world.tiles[${index}]`;
    if (typeof tile.name !== "string" || tile.name.trim().length === 0) {
      add(issues, "invalid_tile_name", `${path}.name`, "Nazwa kafla nie może być pusta.");
    }
    if (typeof tile.walkable !== "boolean") {
      add(issues, "invalid_boolean", `${path}.walkable`, "Pole walkable musi być boolean.");
    }
    if (typeof tile.blocksProjectiles !== "boolean") {
      add(issues, "invalid_boolean", `${path}.blocksProjectiles`, "Pole blocksProjectiles musi być boolean.");
    }
  });

  const floorIds = uniqueIds(project.world.floors, "$.world.floors", issues);
  project.world.floors.forEach((floor, index) => validateFloor(floor, index, tileIds, issues));
  const floorById = new Map(project.world.floors.map((floor) => [floor.id, floor]));
  const walkableByTileId = new Map(project.world.tiles.map((tile) => [tile.id, tile.walkable]));

  if (project.world.transitions !== undefined) {
    if (!Array.isArray(project.world.transitions)) {
      add(issues, "invalid_world_transitions", "$.world.transitions", "Przejścia świata muszą być tablicą.");
    } else {
      uniqueIds(project.world.transitions, "$.world.transitions", issues);
      const sourceCells = new Set<string>();
      project.world.transitions.forEach((transition, index) => {
        const path = `$.world.transitions[${index}]`;
        if (typeof transition.name !== "string" || transition.name.trim().length === 0) add(issues, "invalid_transition_name", `${path}.name`, "Nazwa przejścia nie może być pusta.");
        if (transition.trigger !== "enter") add(issues, "unsupported_transition_trigger", `${path}.trigger`, "M7 obsługuje trigger przejścia enter.");
        if (transition.partyRule !== "all") add(issues, "unsupported_transition_party_rule", `${path}.partyRule`, "M7 wymaga drużynowej reguły all.");
        for (const endpointName of ["source", "destination"] as const) {
          const endpoint = transition[endpointName];
          const endpointPath = `${path}.${endpointName}`;
          const floor = floorById.get(endpoint.floorId);
          if (!floor) {
            add(issues, "unknown_floor_reference", `${endpointPath}.floorId`, `Nieznane piętro: ${endpoint.floorId}.`);
            continue;
          }
          const xOk = requireFiniteNumber(endpoint.x, `${endpointPath}.x`, issues, { integer: true, min: 0 });
          const yOk = requireFiniteNumber(endpoint.y, `${endpointPath}.y`, issues, { integer: true, min: 0 });
          if (xOk && endpoint.x >= floor.width) add(issues, "coordinate_out_of_bounds", `${endpointPath}.x`, `X musi być mniejsze niż ${floor.width}.`);
          if (yOk && endpoint.y >= floor.height) add(issues, "coordinate_out_of_bounds", `${endpointPath}.y`, `Y musi być mniejsze niż ${floor.height}.`);
          if (xOk && yOk && endpoint.x < floor.width && endpoint.y < floor.height) {
            const tileId = decodedTileAt(floor, endpoint.x, endpoint.y);
            if (!tileId || walkableByTileId.get(tileId) !== true) add(issues, "transition_not_walkable", endpointPath, `Przejście znajduje się na niewalkowalnym kaflu ${tileId ?? "brak"}.`);
          }
        }
        if (transition.source.floorId === transition.destination.floorId && transition.source.x === transition.destination.x && transition.source.y === transition.destination.y) {
          add(issues, "transition_self_loop", path, "Przejście nie może prowadzić do tego samego pola.");
        }
        const sourceKey = `${transition.source.floorId}:${transition.source.x}:${transition.source.y}`;
        if (sourceCells.has(sourceKey)) add(issues, "duplicate_transition_source", `${path}.source`, `Pole ${sourceKey} ma więcej niż jedno przejście.`);
        sourceCells.add(sourceKey);
      });
    }
  }

  if (!isRecord(project.content)) {
    add(issues, "invalid_content", "$.content", "Brak sekcji content.");
    return { ok: false, issues };
  }
  const arrays = ["classes", "abilities", "monsters", "spawns"] as const;
  for (const key of arrays) {
    if (!Array.isArray(project.content[key])) {
      add(issues, "invalid_content_collection", `$.content.${key}`, "Pole musi być tablicą.");
      return { ok: false, issues };
    }
  }

  if (project.content.classes.length === 0) add(issues, "empty_collection", "$.content.classes", "Projekt musi zawierać co najmniej jedną klasę gracza.");
  if (project.content.abilities.length === 0) add(issues, "empty_collection", "$.content.abilities", "Projekt musi zawierać co najmniej jedną umiejętność.");
  if (project.content.monsters.length === 0) add(issues, "empty_collection", "$.content.monsters", "Projekt musi zawierać co najmniej jednego potwora.");

  const abilityIds = uniqueIds(project.content.abilities, "$.content.abilities", issues);
  const classIds = uniqueIds(project.content.classes, "$.content.classes", issues);
  const monsterIds = uniqueIds(project.content.monsters, "$.content.monsters", issues);
  uniqueIds(project.content.spawns, "$.content.spawns", issues);
  void classIds;

  project.content.abilities.forEach((ability, index) => {
    const path = `$.content.abilities[${index}]`;
    requireFiniteNumber(ability.cooldownTicks, `${path}.cooldownTicks`, issues, { integer: true, min: 0 });
    requireFiniteNumber(ability.rangeTiles, `${path}.rangeTiles`, issues, { min: 0 });
    requireFiniteNumber(ability.power, `${path}.power`, issues, { min: 0 });
    if (project.schemaVersion === 2) requireStableId((ability as CoopegeProjectV2["content"]["abilities"][number]).graphId, `${path}.graphId`, issues);
  });

  project.content.classes.forEach((playerClass, index) => {
    const path = `$.content.classes[${index}]`;
    requireFiniteNumber(playerClass.maxHp, `${path}.maxHp`, issues, { integer: true, min: 1 });
    requireFiniteNumber(playerClass.moveSpeedTilesPerSecond, `${path}.moveSpeedTilesPerSecond`, issues, { min: 0.01 });
    playerClass.abilityIds.forEach((abilityId, abilityIndex) => {
      if (!abilityIds.has(abilityId)) {
        add(issues, "unknown_ability_reference", `${path}.abilityIds[${abilityIndex}]`, `Nieznana umiejętność: ${abilityId}.`);
      }
    });
  });

  project.content.monsters.forEach((monster, index) => {
    const path = `$.content.monsters[${index}]`;
    requireFiniteNumber(monster.maxHp, `${path}.maxHp`, issues, { integer: true, min: 1 });
    requireFiniteNumber(monster.moveSpeedTilesPerSecond, `${path}.moveSpeedTilesPerSecond`, issues, { min: 0 });
    monster.abilityIds.forEach((abilityId, abilityIndex) => {
      if (!abilityIds.has(abilityId)) {
        add(issues, "unknown_ability_reference", `${path}.abilityIds[${abilityIndex}]`, `Nieznana umiejętność: ${abilityId}.`);
      }
    });
  });

  project.content.spawns.forEach((spawn, index) => {
    const path = `$.content.spawns[${index}]`;
    const floor = floorById.get(spawn.floorId);
    if (!floorIds.has(spawn.floorId) || !floor) {
      add(issues, "unknown_floor_reference", `${path}.floorId`, `Nieznane piętro: ${spawn.floorId}.`);
    }
    if (!monsterIds.has(spawn.monsterId)) {
      add(issues, "unknown_monster_reference", `${path}.monsterId`, `Nieznany potwór: ${spawn.monsterId}.`);
    }
    const xOk = requireFiniteNumber(spawn.x, `${path}.x`, issues, { integer: true, min: 0 });
    const yOk = requireFiniteNumber(spawn.y, `${path}.y`, issues, { integer: true, min: 0 });
    if (floor && xOk && spawn.x >= floor.width) {
      add(issues, "coordinate_out_of_bounds", `${path}.x`, `X musi być mniejsze niż ${floor.width}.`);
    }
    if (floor && yOk && spawn.y >= floor.height) {
      add(issues, "coordinate_out_of_bounds", `${path}.y`, `Y musi być mniejsze niż ${floor.height}.`);
    }
    requireFiniteNumber(spawn.count, `${path}.count`, issues, { integer: true, min: 1, max: 1000 });
    requireFiniteNumber(spawn.respawnTicks, `${path}.respawnTicks`, issues, { integer: true, min: 0 });
  });

  if (!floorIds.has(project.manifest.entryFloorId)) {
    add(issues, "unknown_floor_reference", "$.manifest.entryFloorId", `Nieznane piętro: ${project.manifest.entryFloorId}.`);
  }
  const startFloor = floorById.get(project.manifest.playerStart.floorId);
  if (!startFloor) {
    add(issues, "unknown_floor_reference", "$.manifest.playerStart.floorId", `Nieznane piętro: ${project.manifest.playerStart.floorId}.`);
  } else {
    const { x, y } = project.manifest.playerStart;
    if (!Number.isInteger(x) || x < 0 || x >= startFloor.width) {
      add(issues, "coordinate_out_of_bounds", "$.manifest.playerStart.x", `X startu musi należeć do 0..${startFloor.width - 1}.`);
    }
    if (!Number.isInteger(y) || y < 0 || y >= startFloor.height) {
      add(issues, "coordinate_out_of_bounds", "$.manifest.playerStart.y", `Y startu musi należeć do 0..${startFloor.height - 1}.`);
    }
  }

  if (startFloor && Number.isInteger(project.manifest.playerStart.x) && Number.isInteger(project.manifest.playerStart.y)) {
    const startTileId = decodedTileAt(startFloor, project.manifest.playerStart.x, project.manifest.playerStart.y);
    const startTile = project.world.tiles.find((tile) => tile.id === startTileId);
    if (startTile && !startTile.walkable) {
      add(issues, "start_not_walkable", "$.manifest.playerStart", `Punkt startowy znajduje się na niewalkowalnym kaflu ${startTile.id}.`);
    }
  }


  if (project.schemaVersion === 2) {
    const projectV2 = project as CoopegeProjectV2;
    if (!isRecord(projectV2.gameplay) || projectV2.gameplay.schemaVersion !== 1 || !Array.isArray(projectV2.gameplay.graphs) || !Array.isArray(projectV2.gameplay.bindings) || !Array.isArray(projectV2.gameplay.triggers)) {
      add(issues, "invalid_gameplay_language", "$.gameplay", "Sekcja gameplay musi mieć schemaVersion 1 oraz tablice graphs, bindings i triggers.");
    } else {
      const registry = createCoreGameplayRegistry({
        sourceAlive: () => true,
        cooldownReady: () => true,
        providedTargetIsMonster: () => true,
        selectNearestHostile: () => [],
        selectSource: () => [],
        selectProvidedTarget: () => [],
      });
      for (const issue of validateGameplayLanguage(projectV2.gameplay, registry)) add(issues, issue.code, issue.path, issue.message);
      const graphIds = new Set(projectV2.gameplay.graphs.map((graph) => graph.id));
      projectV2.content.abilities.forEach((ability, index) => {
        if (!graphIds.has(ability.graphId)) add(issues, "unknown_ability_graph", `$.content.abilities[${index}].graphId`, `Nieznany graf gameplayu ${ability.graphId}.`);
      });
    }
  }

  if (!isRecord(project.assets) || project.assets.schemaVersion !== 1 || !Array.isArray(project.assets.entries)) {
    add(issues, "invalid_assets", "$.assets", "Manifest assetów musi mieć schemaVersion 1 i tablicę entries.");
  } else {
    uniqueIds(project.assets.entries, "$.assets.entries", issues);
    project.assets.entries.forEach((entry, index) => validateAsset(entry, index, issues));
    const assetById = new Map(project.assets.entries.map((entry) => [entry.id, entry]));
    const assetReferences: Array<[string | undefined, string]> = [];
    project.world.tiles.forEach((item, index) => assetReferences.push([item.assetId, `$.world.tiles[${index}].assetId`]));
    project.content.classes.forEach((item, index) => assetReferences.push([item.assetId, `$.content.classes[${index}].assetId`]));
    project.content.abilities.forEach((item, index) => assetReferences.push([item.assetId, `$.content.abilities[${index}].assetId`]));
    project.content.monsters.forEach((item, index) => assetReferences.push([item.assetId, `$.content.monsters[${index}].assetId`]));
    for (const [assetId, path] of assetReferences) {
      if (assetId === undefined) continue;
      const asset = assetById.get(assetId);
      if (!asset) {
        add(issues, "unknown_asset_reference", path, `Nieznany asset: ${assetId}.`);
      } else if (asset.kind !== "texture") {
        add(issues, "wrong_asset_kind", path, `Pole graficzne wymaga assetu texture, otrzymano ${asset.kind}.`);
      }
    }
  }

  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}
