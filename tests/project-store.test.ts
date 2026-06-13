import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CoopegeProject } from "../packages/schema/src/types.js";
import { CommandBus, ProjectStore, createProjectCommand } from "../packages/project-store/src/index.js";
import { validateProject, type ValidationIssue } from "../packages/validation/src/index.js";

async function fixture(): Promise<CoopegeProject> {
  return JSON.parse(await readFile(join(process.cwd(), "project", "fixtures", "minimal.project.json"), "utf8")) as CoopegeProject;
}

test("CommandBus zatwierdza poprawną zmianę i zapewnia undo/redo", async () => {
  const project = await fixture();
  const originalName = project.manifest.name;
  const store = new ProjectStore(project);
  const bus = new CommandBus<CoopegeProject, ValidationIssue>(store, validateProject);

  const result = bus.execute(createProjectCommand("Zmień nazwę", (draft) => {
    draft.manifest.name = "Nowa nazwa";
  }));
  assert.equal(result.ok, true);
  assert.equal((store.read() as CoopegeProject).manifest.name, "Nowa nazwa");
  assert.equal(bus.undoDepth, 1);
  assert.equal(bus.redoDepth, 0);

  assert.equal(bus.undo().ok, true);
  assert.equal((store.read() as CoopegeProject).manifest.name, originalName);
  assert.equal(store.dirty, false);
  assert.equal(bus.redoDepth, 1);

  assert.equal(bus.redo().ok, true);
  assert.equal((store.read() as CoopegeProject).manifest.name, "Nowa nazwa");
});

test("niepoprawna komenda jest odrzucana atomowo bez wpisu w historii", async () => {
  const project = await fixture();
  const store = new ProjectStore(project);
  const bus = new CommandBus<CoopegeProject, ValidationIssue>(store, validateProject);
  const before = store.read();

  const result = bus.execute(createProjectCommand("Zepsuj punkt startowy", (draft) => {
    draft.manifest.playerStart.x = 99999;
  }));
  assert.equal(result.ok, false);
  assert.deepEqual(store.read(), before);
  assert.equal(store.revision, 0);
  assert.equal(bus.undoDepth, 0);
});

test("otwarcie projektu czyści historię wcześniejszego dokumentu", async () => {
  const project = await fixture();
  const store = new ProjectStore(project);
  const bus = new CommandBus<CoopegeProject, ValidationIssue>(store, validateProject);
  bus.execute(createProjectCommand("Zmień nazwę", (draft) => { draft.manifest.name = "A"; }));
  assert.equal(bus.canUndo, true);
  const replacement = structuredClone(project);
  replacement.manifest.name = "Drugi projekt";
  assert.equal(bus.replaceProject(replacement).ok, true);
  assert.equal(bus.canUndo, false);
  assert.equal(bus.canRedo, false);
});

test("komenda różnicowa używa historii delta i poprawnie odtwarza zmianę", async () => {
  const { createReversibleProjectCommand } = await import("../packages/project-store/src/index.js");
  const project = await fixture();
  const store = new ProjectStore(project);
  const bus = new CommandBus<CoopegeProject, ValidationIssue>(store, validateProject);
  const originalX = project.manifest.playerStart.x;

  const result = bus.execute(createReversibleProjectCommand<CoopegeProject>(
    "Przesuń start o jedno pole",
    (draft) => { draft.manifest.playerStart.x = originalX + 1; },
    (draft) => { draft.manifest.playerStart.x = originalX; },
  ));
  assert.equal(result.ok, true);
  assert.equal(bus.history().undo[0]?.storage, "delta");
  assert.equal((store.read() as CoopegeProject).manifest.playerStart.x, originalX + 1);
  assert.equal(bus.undo().ok, true);
  assert.equal((store.read() as CoopegeProject).manifest.playerStart.x, originalX);
  assert.equal(bus.redo().ok, true);
  assert.equal((store.read() as CoopegeProject).manifest.playerStart.x, originalX + 1);
});
