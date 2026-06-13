import type { CoopegeProject } from "../../../packages/schema/src/types.js";

export interface StudioCheckpoint {
  id: string;
  projectId: string;
  label: string;
  savedAt: string;
  project: CoopegeProject;
}

const memory = new Map<string, StudioCheckpoint>();

export class CheckpointStore {
  private dbPromise: Promise<IDBDatabase> | undefined;

  private db(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open("coopege-studio-v1", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("checkpoints")) {
            const store = db.createObjectStore("checkpoints", { keyPath: "id" });
            store.createIndex("projectId", "projectId", { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB nie jest dostępne."));
      } catch (error) {
        reject(error);
      }
    });
    return this.dbPromise;
  }

  async save(project: CoopegeProject, label: string): Promise<StudioCheckpoint> {
    const checkpoint: StudioCheckpoint = {
      id: `${project.manifest.projectId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      projectId: project.manifest.projectId,
      label,
      savedAt: new Date().toISOString(),
      project: structuredClone(project),
    };
    memory.set(checkpoint.id, checkpoint);
    try {
      const db = await this.db();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("checkpoints", "readwrite");
        tx.objectStore("checkpoints").put(checkpoint);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Nie udało się zapisać checkpointu."));
      });
      await this.trim(project.manifest.projectId, 10);
    } catch {
      // Opaque-origin preview lub restrykcyjna przeglądarka korzysta z fallbacku pamięciowego.
    }
    return checkpoint;
  }

  async list(projectId: string): Promise<StudioCheckpoint[]> {
    let records = [...memory.values()].filter((entry) => entry.projectId === projectId);
    try {
      const db = await this.db();
      records = await new Promise<StudioCheckpoint[]>((resolve, reject) => {
        const tx = db.transaction("checkpoints", "readonly");
        const request = tx.objectStore("checkpoints").index("projectId").getAll(projectId);
        request.onsuccess = () => resolve(request.result as StudioCheckpoint[]);
        request.onerror = () => reject(request.error ?? new Error("Nie udało się odczytać checkpointów."));
      });
      records.forEach((entry) => memory.set(entry.id, entry));
    } catch {
      // fallback memory
    }
    return records.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  }

  async get(id: string): Promise<StudioCheckpoint | undefined> {
    const cached = memory.get(id);
    if (cached) return structuredClone(cached);
    try {
      const db = await this.db();
      return await new Promise<StudioCheckpoint | undefined>((resolve, reject) => {
        const request = db.transaction("checkpoints", "readonly").objectStore("checkpoints").get(id);
        request.onsuccess = () => resolve(request.result as StudioCheckpoint | undefined);
        request.onerror = () => reject(request.error ?? new Error("Nie udało się odczytać checkpointu."));
      });
    } catch {
      return undefined;
    }
  }

  private async trim(projectId: string, keep: number): Promise<void> {
    const records = await this.list(projectId);
    const stale = records.slice(keep);
    stale.forEach((entry) => memory.delete(entry.id));
    if (stale.length === 0) return;
    try {
      const db = await this.db();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("checkpoints", "readwrite");
        const store = tx.objectStore("checkpoints");
        stale.forEach((entry) => store.delete(entry.id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Nie udało się przyciąć checkpointów."));
      });
    } catch {
      // fallback memory jest już przycięty
    }
  }
}
