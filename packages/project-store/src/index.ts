export interface ValidationLikeResult<TIssue = unknown> {
  ok: boolean;
  issues: TIssue[];
}

export type ProjectValidator<TIssue = unknown> = (input: unknown) => ValidationLikeResult<TIssue>;

export interface ProjectStoreChange<T> {
  revision: number;
  reason: string;
  snapshot: Readonly<T>;
  dirty: boolean;
}

export type ProjectStoreListener<T> = (change: ProjectStoreChange<T>) => void;

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export class ProjectStore<T> {
  private value: T;
  private listeners = new Set<ProjectStoreListener<T>>();
  private savedValue: T;
  private _revision = 0;

  constructor(
    initialValue: T,
    private readonly equals: (left: T, right: T) => boolean = (left, right) => JSON.stringify(left) === JSON.stringify(right),
  ) {
    this.value = cloneValue(initialValue);
    this.savedValue = cloneValue(initialValue);
  }

  get revision(): number {
    return this._revision;
  }

  get dirty(): boolean {
    return !this.equals(this.value, this.savedValue);
  }

  read(): Readonly<T> {
    return cloneValue(this.value);
  }

  replace(nextValue: T, reason: string): ProjectStoreChange<T> {
    this.value = cloneValue(nextValue);
    this._revision += 1;
    return this.emit(reason);
  }

  markSaved(): void {
    this.savedValue = cloneValue(this.value);
    this.emit("mark-saved");
  }

  subscribe(listener: ProjectStoreListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(reason: string): ProjectStoreChange<T> {
    const change: ProjectStoreChange<T> = {
      revision: this._revision,
      reason,
      snapshot: this.read(),
      dirty: this.dirty,
    };
    for (const listener of this.listeners) listener(change);
    return change;
  }
}

export interface ProjectCommand<T> {
  id: string;
  label: string;
  apply(project: Readonly<T>): T;
  history?: {
    undo(project: Readonly<T>): T;
    redo(project: Readonly<T>): T;
    storage: "delta";
  };
}

export interface CommandHistoryItem {
  id: string;
  label: string;
  storage: "snapshot" | "delta";
}

type CommandHistoryEntry<T> = CommandHistoryItem & (
  | { storage: "snapshot"; before: T; after: T }
  | { storage: "delta"; undo: (project: Readonly<T>) => T; redo: (project: Readonly<T>) => T }
);

export type CommandResult<TIssue = unknown> =
  | { ok: true; revision: number }
  | { ok: false; issues: TIssue[] };

let commandSequence = 0;

function nextCommandId(): string {
  commandSequence += 1;
  return `command.${commandSequence}`;
}

export function createProjectCommand<T>(
  label: string,
  mutate: (draft: T) => void,
): ProjectCommand<T> {
  return {
    id: nextCommandId(),
    label,
    apply(project) {
      const draft = cloneValue(project) as T;
      mutate(draft);
      return draft;
    },
  };
}

export function createReversibleProjectCommand<T>(
  label: string,
  redoMutation: (draft: T) => void,
  undoMutation: (draft: T) => void,
): ProjectCommand<T> {
  const mutate = (project: Readonly<T>, operation: (draft: T) => void): T => {
    const draft = cloneValue(project) as T;
    operation(draft);
    return draft;
  };
  return {
    id: nextCommandId(),
    label,
    apply: (project) => mutate(project, redoMutation),
    history: {
      storage: "delta",
      redo: (project) => mutate(project, redoMutation),
      undo: (project) => mutate(project, undoMutation),
    },
  };
}

export class CommandBus<T, TIssue = unknown> {
  private undoStack: CommandHistoryEntry<T>[] = [];
  private redoStack: CommandHistoryEntry<T>[] = [];

  constructor(
    private readonly store: ProjectStore<T>,
    private readonly validate: ProjectValidator<TIssue>,
    private readonly maxHistory = 100,
  ) {
    if (!Number.isInteger(maxHistory) || maxHistory < 1) {
      throw new Error("maxHistory musi być dodatnią liczbą całkowitą.");
    }
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  history(): { undo: CommandHistoryItem[]; redo: CommandHistoryItem[] } {
    const summarize = ({ id, label, storage }: CommandHistoryEntry<T>): CommandHistoryItem => ({ id, label, storage });
    return {
      undo: this.undoStack.map(summarize),
      redo: this.redoStack.map(summarize),
    };
  }

  execute(command: ProjectCommand<T>): CommandResult<TIssue> {
    const before = this.store.read() as T;
    const candidate = command.apply(before);
    const validation = this.validate(candidate);
    if (!validation.ok) return { ok: false, issues: validation.issues };

    this.store.replace(candidate, command.label);
    const entry: CommandHistoryEntry<T> = command.history
      ? {
          id: command.id,
          label: command.label,
          storage: "delta",
          undo: command.history.undo,
          redo: command.history.redo,
        }
      : {
          id: command.id,
          label: command.label,
          storage: "snapshot",
          before,
          after: cloneValue(candidate),
        };
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
    return { ok: true, revision: this.store.revision };
  }

  undo(): CommandResult<TIssue> {
    const entry = this.undoStack.pop();
    if (!entry) return { ok: true, revision: this.store.revision };
    const candidate = entry.storage === "snapshot" ? entry.before : entry.undo(this.store.read());
    const validation = this.validate(candidate);
    if (!validation.ok) {
      this.undoStack.push(entry);
      return { ok: false, issues: validation.issues };
    }
    this.store.replace(candidate, `Cofnij: ${entry.label}`);
    this.redoStack.push(entry);
    return { ok: true, revision: this.store.revision };
  }

  redo(): CommandResult<TIssue> {
    const entry = this.redoStack.pop();
    if (!entry) return { ok: true, revision: this.store.revision };
    const candidate = entry.storage === "snapshot" ? entry.after : entry.redo(this.store.read());
    const validation = this.validate(candidate);
    if (!validation.ok) {
      this.redoStack.push(entry);
      return { ok: false, issues: validation.issues };
    }
    this.store.replace(candidate, `Ponów: ${entry.label}`);
    this.undoStack.push(entry);
    return { ok: true, revision: this.store.revision };
  }

  replaceProject(project: T, reason = "Otwórz projekt"): CommandResult<TIssue> {
    const validation = this.validate(project);
    if (!validation.ok) return { ok: false, issues: validation.issues };
    this.store.replace(project, reason);
    this.undoStack = [];
    this.redoStack = [];
    return { ok: true, revision: this.store.revision };
  }
}
