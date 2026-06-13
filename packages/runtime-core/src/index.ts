import { migrateProjectToLatest, type CoopegeProject, type CoopegeProjectInput, type FloorDefinition } from "../../schema/src/index.js";
import type { ValidationIssue } from "../../validation/src/index.js";
import { stableChecksum, validateProject } from "../../validation/src/index.js";

export interface PreparedFloor {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: string[];
}

export interface PreparedRuntimeProject {
  project: CoopegeProject;
  checksum: string;
  floors: ReadonlyMap<string, PreparedFloor>;
  summary: {
    projectId: string;
    name: string;
    schemaVersion: number;
    floorCount: number;
    monsterCount: number;
    spawnCount: number;
    assetCount: number;
  };
}

export type RuntimeProjectApplyResult =
  | {
      ok: true;
      revision: number;
      checksum: string;
      summary: PreparedRuntimeProject["summary"];
    }
  | {
      ok: false;
      revision: number;
      issues: ValidationIssue[];
    };

function decodeFloor(floor: FloorDefinition): PreparedFloor {
  const tiles: string[] = [];
  for (const [tileId, count] of floor.tiles) {
    for (let index = 0; index < count; index += 1) tiles.push(tileId);
  }
  if (tiles.length !== floor.width * floor.height) {
    throw new Error(`Piętro ${floor.id} ma ${tiles.length} pól po dekodowaniu, oczekiwano ${floor.width * floor.height}.`);
  }
  return { id: floor.id, name: floor.name, width: floor.width, height: floor.height, tiles };
}

export function prepareRuntimeProject(input: unknown):
  | { ok: true; prepared: PreparedRuntimeProject }
  | { ok: false; issues: ValidationIssue[] } {
  const validation = validateProject(input);
  if (!validation.ok) return { ok: false, issues: validation.issues };

  const migration = migrateProjectToLatest(structuredClone(input) as CoopegeProjectInput);
  const project = migration.project;
  const latestValidation = validateProject(project);
  if (!latestValidation.ok) return { ok: false, issues: latestValidation.issues };
  const floors = new Map(project.world.floors.map((floor) => [floor.id, decodeFloor(floor)]));
  if (!floors.has(project.manifest.entryFloorId)) {
    return {
      ok: false,
      issues: [{
        code: "unknown_entry_floor",
        path: "$.manifest.entryFloorId",
        message: `Nie znaleziono piętra startowego ${project.manifest.entryFloorId}.`,
        severity: "error",
      }],
    };
  }

  const prepared: PreparedRuntimeProject = {
    project,
    checksum: stableChecksum(project),
    floors,
    summary: {
      projectId: project.manifest.projectId,
      name: project.manifest.name,
      schemaVersion: project.schemaVersion,
      floorCount: project.world.floors.length,
      monsterCount: project.content.monsters.length,
      spawnCount: project.content.spawns.length,
      assetCount: project.assets.entries.length,
    },
  };
  return { ok: true, prepared };
}

export class AtomicProjectHost {
  private active: PreparedRuntimeProject | undefined;
  private _revision = 0;

  get revision(): number {
    return this._revision;
  }

  get current(): PreparedRuntimeProject | undefined {
    return this.active;
  }

  apply(input: unknown): RuntimeProjectApplyResult {
    const candidate = prepareRuntimeProject(input);
    if (!candidate.ok) {
      return { ok: false, revision: this._revision, issues: candidate.issues };
    }
    this.active = candidate.prepared;
    this._revision += 1;
    return {
      ok: true,
      revision: this._revision,
      checksum: candidate.prepared.checksum,
      summary: candidate.prepared.summary,
    };
  }
}
