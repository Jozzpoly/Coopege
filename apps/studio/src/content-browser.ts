import { createProjectCommand } from "../../../packages/project-store/src/index.js";
import type {
  AbilityDefinition,
  CoopegeProject,
  MonsterDefinition,
  PlayerClassDefinition,
} from "../../../packages/schema/src/types.js";
import type { StudioCommandExecutor } from "./map-editor.js";

type ContentKind = "classes" | "abilities" | "monsters";
type ContentEntry = PlayerClassDefinition | AbilityDefinition | MonsterDefinition;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Brak elementu Content Browser: ${selector}.`);
  return element;
}

function isAbility(value: ContentEntry): value is AbilityDefinition {
  return "kind" in value;
}

function isClass(value: ContentEntry): value is PlayerClassDefinition {
  return "abilityIds" in value && !isAbility(value) && value.id.includes("class");
}

function copyId(project: CoopegeProject, kind: ContentKind, baseId: string): string {
  const used = new Set(project.content[kind].map((entry) => entry.id));
  for (let index = 1; index < 1000; index += 1) {
    const suffix = `.copy${index}`;
    const stem = baseId.slice(0, Math.max(3, 63 - suffix.length));
    const id = `${stem}${suffix}`;
    if (!used.has(id)) return id;
  }
  throw new Error("Nie można przydzielić ID kopii contentu.");
}

export class ContentBrowser {
  private project: CoopegeProject | undefined;
  private kind: ContentKind = "classes";
  private selectedId = "";
  private readonly kindButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-content-kind]")];
  private readonly search = requiredElement<HTMLInputElement>("#contentSearch");
  private readonly list = requiredElement<HTMLElement>("#contentList");
  private readonly form = requiredElement<HTMLElement>("#contentForm");
  private readonly status = requiredElement<HTMLElement>("#contentStatus");
  private readonly duplicateButton = requiredElement<HTMLButtonElement>("#contentDuplicateButton");
  private readonly deleteButton = requiredElement<HTMLButtonElement>("#contentDeleteButton");

  constructor(
    private readonly execute: StudioCommandExecutor,
    private readonly onOpenAsset: (assetId: string) => void,
    private readonly onLocateSpawn: (spawnId: string) => void,
  ) {
    this.kindButtons.forEach((button) => button.addEventListener("click", () => {
      this.kind = button.dataset.contentKind as ContentKind;
      this.selectedId = "";
      this.render();
    }));
    this.search.addEventListener("input", () => this.renderList());
    this.duplicateButton.addEventListener("click", () => this.duplicateSelected());
    this.deleteButton.addEventListener("click", () => this.deleteSelected());
  }

  setProject(project: CoopegeProject): void {
    this.project = project;
    if (!this.entries().some((entry) => entry.id === this.selectedId)) {
      this.selectedId = this.entries()[0]?.id ?? "";
    }
    this.render();
  }

  /** Navigation is not an authoring command; don't change ProjectStore/revision. */
  selectMonster(monsterId: string): boolean {
    if (!this.project?.content.monsters.some((entry) => entry.id === monsterId)) return false;
    this.kind = "monsters";
    this.selectedId = monsterId;
    this.search.value = "";
    this.render();
    return true;
  }

  get diagnostics(): { kind: ContentKind; selectedId: string } {
    return { kind: this.kind, selectedId: this.selectedId };
  }

  private entries(): ContentEntry[] {
    if (!this.project) return [];
    return this.project.content[this.kind] as ContentEntry[];
  }

  private selected(): ContentEntry | undefined {
    return this.entries().find((entry) => entry.id === this.selectedId);
  }

  private render(): void {
    this.kindButtons.forEach((button) => button.classList.toggle("active", button.dataset.contentKind === this.kind));
    this.renderList();
    this.renderForm();
  }

  private renderList(): void {
    const query = this.search.value.trim().toLowerCase();
    const entries = this.entries().filter((entry) => !query || entry.id.toLowerCase().includes(query) || entry.name.toLowerCase().includes(query));
    this.list.innerHTML = "";
    entries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `content-row${entry.id === this.selectedId ? " active" : ""}`;
      const strong = document.createElement("strong");
      strong.textContent = entry.name;
      const small = document.createElement("small");
      small.textContent = entry.id;
      button.append(strong, small);
      button.addEventListener("click", () => {
        this.selectedId = entry.id;
        this.renderList();
        this.renderForm();
      });
      this.list.append(button);
    });
    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-message";
      empty.textContent = "Brak pasujących definicji.";
      this.list.append(empty);
    }
  }

  private field(labelText: string, value: string, type: "text" | "number" | "select", onChange: (value: string) => void, options: string[] = []): HTMLElement {
    const label = document.createElement("label");
    label.className = "field";
    const text = document.createElement("span");
    text.textContent = labelText;
    let control: HTMLInputElement | HTMLSelectElement;
    if (type === "select") {
      const select = document.createElement("select");
      options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue || "— brak —";
        select.append(option);
      });
      control = select;
    } else {
      const input = document.createElement("input");
      input.type = type;
      if (type === "number") input.step = "any";
      control = input;
    }
    control.value = value;
    control.addEventListener("change", () => onChange(control.value));
    label.append(text, control);
    return label;
  }

  private renderForm(): void {
    this.form.innerHTML = "";
    const entry = this.selected();
    this.duplicateButton.disabled = !entry;
    this.deleteButton.disabled = !entry;
    if (!entry || !this.project) {
      this.form.textContent = "Nie wybrano definicji.";
      return;
    }

    const heading = document.createElement("div");
    heading.className = "content-heading";
    const title = document.createElement("strong");
    title.textContent = entry.name;
    const id = document.createElement("code");
    id.textContent = entry.id;
    heading.append(title, id);
    this.form.append(heading);

    const assets = ["", ...this.project.assets.entries.filter((asset) => asset.kind === "texture").map((asset) => asset.id)];
    this.form.append(this.field("Nazwa", entry.name, "text", (value) => this.update("Zmień nazwę definicji", (target) => { target.name = value.trim(); })));

    if (isAbility(entry)) {
      this.form.append(
        this.field("Rodzaj", entry.kind, "select", (value) => this.update("Zmień rodzaj umiejętności", (target) => {
          (target as AbilityDefinition).kind = value as AbilityDefinition["kind"];
        }), ["melee", "projectile", "utility"]),
        this.field("Cooldown (ticki)", String(entry.cooldownTicks), "number", (value) => this.update("Zmień cooldown", (target) => {
          (target as AbilityDefinition).cooldownTicks = Number(value);
        })),
        this.field("Zasięg (kafle)", String(entry.rangeTiles), "number", (value) => this.update("Zmień zasięg", (target) => {
          (target as AbilityDefinition).rangeTiles = Number(value);
        })),
        this.field("Moc", String(entry.power), "number", (value) => this.update("Zmień moc", (target) => {
          (target as AbilityDefinition).power = Number(value);
        })),
        this.field("Asset", entry.assetId ?? "", "select", (value) => this.update("Zmień asset umiejętności", (target) => {
          if (value) target.assetId = value;
          else delete target.assetId;
        }), assets),
      );
    } else {
      const actor = entry as PlayerClassDefinition | MonsterDefinition;
      this.form.append(
        this.field("Maksymalne HP", String(actor.maxHp), "number", (value) => this.update("Zmień HP", (target) => {
          (target as PlayerClassDefinition | MonsterDefinition).maxHp = Number(value);
        })),
        this.field("Prędkość (kafle/s)", String(actor.moveSpeedTilesPerSecond), "number", (value) => this.update("Zmień prędkość", (target) => {
          (target as PlayerClassDefinition | MonsterDefinition).moveSpeedTilesPerSecond = Number(value);
        })),
        this.field("Umiejętności (ID po przecinku)", actor.abilityIds.join(", "), "text", (value) => this.update("Zmień umiejętności", (target) => {
          (target as PlayerClassDefinition | MonsterDefinition).abilityIds = value.split(",").map((part) => part.trim()).filter(Boolean);
        })),
        this.field("Asset", actor.assetId ?? "", "select", (value) => this.update("Zmień asset aktora", (target) => {
          if (value) target.assetId = value;
          else delete target.assetId;
        }), assets),
      );
    }


    if (this.kind === "monsters") {
      const monster = entry as MonsterDefinition;
      const actions = document.createElement("section");
      actions.className = "content-object-actions";

      const assetButton = document.createElement("button");
      assetButton.type = "button";
      assetButton.id = "monsterOpenAsset";
      assetButton.className = "btn";
      assetButton.textContent = monster.assetId ? "Pokaż grafikę w bibliotece" : "Ten potwór nie ma assetu";
      assetButton.disabled = !monster.assetId || !this.project.assets.entries.some((asset) => asset.id === monster.assetId && asset.kind === "texture");
      assetButton.addEventListener("click", () => {
        if (monster.assetId && this.project?.assets.entries.some((asset) => asset.id === monster.assetId && asset.kind === "texture")) {
          this.onOpenAsset(monster.assetId);
        }
      });

      const spawns = this.project.content.spawns.filter((spawn) => spawn.monsterId === monster.id);
      const scopeNote = document.createElement("p");
      scopeNote.className = "content-scope-note";
      scopeNote.textContent = "Zmieniasz definicję potwora — statystyki i grafika dotyczą wszystkich jego wystąpień (" + spawns.length + "), nie tylko wybranego spawnu.";
      const label = document.createElement("label");
      label.className = "field";
      label.textContent = "Lokalizacje potwora w świecie (" + spawns.length + ")";
      const select = document.createElement("select");
      select.id = "monsterSpawnLocation";
      for (const spawn of spawns) {
        const option = document.createElement("option");
        option.value = spawn.id;
        option.textContent = spawn.floorId + " · X " + spawn.x + " Y " + spawn.y + " · " + spawn.id;
        select.append(option);
      }
      select.disabled = spawns.length === 0;
      label.append(select);

      const locateButton = document.createElement("button");
      locateButton.type = "button";
      locateButton.id = "monsterLocateSpawn";
      locateButton.className = "btn";
      locateButton.textContent = "Pokaż na mapie";
      locateButton.disabled = spawns.length === 0;
      locateButton.addEventListener("click", () => {
        const chosen = select.value;
        if (this.project?.content.spawns.some((spawn) => spawn.id === chosen && spawn.monsterId === monster.id)) {
          this.onLocateSpawn(chosen);
        }
      });

      actions.append(scopeNote, assetButton, label, locateButton);
      this.form.append(actions);
    }

    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Każde pole przechodzi wspólną walidację. Nieznana umiejętność, błędne HP albo usunięcie używanej definicji zostaną odrzucone atomowo.";
    this.form.append(note);
  }

  private update(label: string, mutate: (target: ContentEntry) => void): void {
    if (!this.project || !this.selectedId) return;
    const kind = this.kind;
    const selectedId = this.selectedId;
    const accepted = this.execute(createProjectCommand<CoopegeProject>(label, (draft) => {
      const target = (draft.content[kind] as ContentEntry[]).find((entry) => entry.id === selectedId);
      if (!target) throw new Error(`Brak definicji ${selectedId}.`);
      mutate(target);
      draft.manifest.updatedAt = new Date().toISOString();
    }));
    this.status.dataset.state = accepted ? "good" : "bad";
    this.status.textContent = accepted ? `${label}: zapisano.` : `${label}: odrzucono.`;
  }

  private duplicateSelected(): void {
    const entry = this.selected();
    if (!entry || !this.project) return;
    const kind = this.kind;
    const id = copyId(this.project, kind, entry.id);
    const copy = structuredClone(entry);
    copy.id = id;
    copy.name = `${entry.name} — kopia`;
    const accepted = this.execute(createProjectCommand<CoopegeProject>(`Duplikuj ${entry.id}`, (draft) => {
      (draft.content[kind] as ContentEntry[]).push(copy);
      draft.manifest.updatedAt = new Date().toISOString();
    }));
    if (accepted) this.selectedId = id;
    this.status.dataset.state = accepted ? "good" : "bad";
    this.status.textContent = accepted ? `Utworzono ${id}.` : "Duplikowanie zostało odrzucone.";
  }

  private deleteSelected(): void {
    const entry = this.selected();
    if (!entry) return;
    const kind = this.kind;
    const selectedId = entry.id;
    const accepted = this.execute(createProjectCommand<CoopegeProject>(`Usuń ${selectedId}`, (draft) => {
      const collection = draft.content[kind] as ContentEntry[];
      const index = collection.findIndex((candidate) => candidate.id === selectedId);
      if (index >= 0) collection.splice(index, 1);
      draft.manifest.updatedAt = new Date().toISOString();
    }));
    if (accepted) this.selectedId = "";
    this.status.dataset.state = accepted ? "good" : "bad";
    this.status.textContent = accepted ? `Usunięto ${selectedId}.` : "Usunięcie odrzucone — definicja może być nadal używana.";
  }
}
