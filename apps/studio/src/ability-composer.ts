import {
  CORE_GAMEPLAY_PRIMITIVE_CATALOG,
  gameplayPrimitiveMetadata,
  gameplayPrimitivesByKind,
  type GameplayPlanResult,
  type GameplayPrimitiveKind,
} from "../../../packages/gameplay-language/src/index.js";
import { createProjectCommand } from "../../../packages/project-store/src/index.js";
import type {
  CoopegeProject,
  GameplayGraphDefinition,
  GameplayNodeDefinition,
  GameplayParameters,
  StableId,
} from "../../../packages/schema/src/index.js";
import { stableChecksum, validateProject } from "../../../packages/validation/src/index.js";
import type { StudioCommandExecutor } from "./map-editor.js";

export type AbilityGraphTest = (graphId: string, playerId: string) => Promise<GameplayPlanResult>;

type NodeKind = GameplayNodeDefinition["kind"];

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Brak elementu Ability Composer: ${selector}.`);
  return element;
}

function slug(value: string): string {
  const normalized = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36);
  return cleaned || "ability";
}

function uniqueId(used: Set<string>, prefix: string): string {
  for (let sequence = 1; sequence < 10000; sequence += 1) {
    const id = `${prefix}.${sequence}`;
    if (!used.has(id)) return id;
  }
  throw new Error(`Nie można przydzielić stabilnego ID dla ${prefix}.`);
}

function primitiveId(node: GameplayNodeDefinition): string {
  if (node.kind === "condition") return node.conditionId;
  if (node.kind === "target-query") return node.queryId;
  if (node.kind === "action") return node.actionId;
  if (node.kind === "effect") return node.effectId;
  return "end";
}

function nodeSuccessors(node: GameplayNodeDefinition): Array<{ label: string; id: string }> {
  if (node.kind === "condition") return [{ label: "true", id: node.onTrue }, { label: "false", id: node.onFalse }];
  if (node.kind === "target-query" || node.kind === "action" || node.kind === "effect") return [{ label: "next", id: node.next }];
  return [];
}

function defaultParameters(id: string): GameplayParameters | undefined {
  const metadata = gameplayPrimitiveMetadata(id);
  if (!metadata) return undefined;
  const values: GameplayParameters = {};
  for (const parameter of metadata.parameters) {
    if (parameter.defaultValue !== undefined) values[parameter.id] = parameter.defaultValue;
  }
  return Object.keys(values).length > 0 ? values : undefined;
}

function createNode(kind: GameplayPrimitiveKind, primitive: string, id: string, endId: string): GameplayNodeDefinition {
  const parameters = defaultParameters(primitive);
  if (kind === "condition") return { id, kind, conditionId: primitive, onTrue: endId, onFalse: endId, ...(parameters ? { parameters } : {}) };
  if (kind === "target-query") return { id, kind, queryId: primitive, next: endId, ...(parameters ? { parameters } : {}) };
  if (kind === "action") return { id, kind, actionId: primitive, next: endId, ...(parameters ? { parameters } : {}) };
  return { id, kind, effectId: primitive, next: endId, ...(parameters ? { parameters } : {}) };
}

function graphUsage(project: CoopegeProject, graphId: string): string[] {
  return [
    ...project.content.abilities.filter((ability) => ability.graphId === graphId).map((ability) => `ability:${ability.id}`),
    ...project.gameplay.bindings.filter((binding) => binding.graphId === graphId).map((binding) => `binding:${binding.id}`),
    ...project.gameplay.triggers.filter((trigger) => trigger.graphId === graphId).map((trigger) => `trigger:${trigger.id}`),
  ];
}

function templateGraph(project: CoopegeProject, mode: "damage" | "heal"): { graph: GameplayGraphDefinition; ability: CoopegeProject["content"]["abilities"][number]; bindingId: string } {
  const graphIds = new Set(project.gameplay.graphs.map((graph) => graph.id));
  const abilityIds = new Set(project.content.abilities.map((ability) => ability.id));
  const bindingIds = new Set(project.gameplay.bindings.map((binding) => binding.id));
  let suffix = 1;
  while (graphIds.has(`graph.ability.${mode}-${suffix}`) || abilityIds.has(`ability.${mode}-${suffix}`) || bindingIds.has(`binding.ability.${mode}-${suffix}`)) suffix += 1;
  const base = `${mode}-${suffix}`;
  const graphId = `graph.ability.${base}`;
  const abilityId = `ability.${base}`;
  const bindingId = `binding.ability.${base}`;
  const endId = `node.${base}.end`;
  const graph: GameplayGraphDefinition = mode === "damage"
    ? {
        id: graphId,
        name: `Nowa umiejętność obrażeń ${suffix}`,
        entryNodeId: `node.${base}.alive`,
        nodes: [
          { id: `node.${base}.alive`, kind: "condition", conditionId: "condition.source-alive", onTrue: `node.${base}.target`, onFalse: endId },
          { id: `node.${base}.target`, kind: "target-query", queryId: "query.nearest-hostile-in-range", next: `node.${base}.present` },
          { id: `node.${base}.present`, kind: "condition", conditionId: "condition.targets-present", onTrue: `node.${base}.damage`, onFalse: endId },
          { id: `node.${base}.damage`, kind: "effect", effectId: "effect.damage-fixed", parameters: { amount: 12 }, next: endId },
          { id: endId, kind: "end" },
        ],
      }
    : {
        id: graphId,
        name: `Nowa umiejętność leczenia ${suffix}`,
        entryNodeId: `node.${base}.alive`,
        nodes: [
          { id: `node.${base}.alive`, kind: "condition", conditionId: "condition.source-alive", onTrue: `node.${base}.source`, onFalse: endId },
          { id: `node.${base}.source`, kind: "target-query", queryId: "query.source", next: `node.${base}.heal` },
          { id: `node.${base}.heal`, kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 15 }, next: endId },
          { id: endId, kind: "end" },
        ],
      };
  return {
    graph,
    bindingId,
    ability: {
      id: abilityId,
      name: graph.name,
      kind: mode === "damage" ? "melee" : "utility",
      cooldownTicks: 24,
      rangeTiles: mode === "damage" ? 2 : 0,
      power: mode === "damage" ? 12 : 0,
      graphId,
    },
  };
}

export class AbilityComposer {
  private project: CoopegeProject | undefined;
  private selectedGraphId = "";
  private selectedNodeId = "";
  private lastPlan: GameplayPlanResult | undefined;
  private readonly graphList = requiredElement<HTMLElement>("#abilityGraphList");
  private readonly canvas = requiredElement<HTMLElement>("#abilityCanvas");
  private readonly inspector = requiredElement<HTMLElement>("#abilityInspector");
  private readonly status = requiredElement<HTMLElement>("#abilityStatus");
  private readonly trace = requiredElement<HTMLElement>("#abilityTrace");
  private readonly search = requiredElement<HTMLInputElement>("#abilitySearch");
  private readonly player = requiredElement<HTMLSelectElement>("#abilityTestPlayer");
  private readonly newDamage = requiredElement<HTMLButtonElement>("#abilityNewDamage");
  private readonly newHeal = requiredElement<HTMLButtonElement>("#abilityNewHeal");
  private readonly duplicate = requiredElement<HTMLButtonElement>("#abilityDuplicate");
  private readonly remove = requiredElement<HTMLButtonElement>("#abilityDelete");
  private readonly test = requiredElement<HTMLButtonElement>("#abilityTest");
  private readonly palette = requiredElement<HTMLElement>("#abilityPalette");

  constructor(private readonly execute: StudioCommandExecutor, private readonly testGraph: AbilityGraphTest) {
    this.search.addEventListener("input", () => this.renderGraphList());
    this.newDamage.addEventListener("click", () => this.createTemplate("damage"));
    this.newHeal.addEventListener("click", () => this.createTemplate("heal"));
    this.duplicate.addEventListener("click", () => this.duplicateGraph());
    this.remove.addEventListener("click", () => this.deleteGraph());
    this.test.addEventListener("click", () => { void this.runTest(); });
    this.renderPalette();
  }

  setProject(project: CoopegeProject): void {
    this.project = project;
    if (!project.gameplay.graphs.some((graph) => graph.id === this.selectedGraphId)) {
      this.selectedGraphId = project.content.abilities[0]?.graphId ?? project.gameplay.graphs[0]?.id ?? "";
    }
    const graph = this.graph();
    if (!graph?.nodes.some((node) => node.id === this.selectedNodeId)) this.selectedNodeId = graph?.entryNodeId ?? "";
    this.render();
  }

  get diagnostics(): { graphId: string; nodeId: string; graphCount: number; valid: boolean; lastPlanOk: boolean | null } {
    const graph = this.graph();
    return {
      graphId: this.selectedGraphId,
      nodeId: this.selectedNodeId,
      graphCount: this.project?.gameplay.graphs.length ?? 0,
      valid: this.graphIssues().length === 0,
      lastPlanOk: this.lastPlan ? this.lastPlan.ok : null,
    };
  }

  private graph(): GameplayGraphDefinition | undefined {
    return this.project?.gameplay.graphs.find((graph) => graph.id === this.selectedGraphId);
  }

  private graphIssues(): ReturnType<typeof validateProject>["issues"] {
    if (!this.project) return [];
    const graphIndex = this.project.gameplay.graphs.findIndex((graph) => graph.id === this.selectedGraphId);
    if (graphIndex < 0) return [];
    const prefix = `$.gameplay.graphs[${graphIndex}]`;
    return validateProject(this.project).issues.filter((issue) => issue.path.startsWith(prefix));
  }

  private render(): void {
    this.renderGraphList();
    this.renderCanvas();
    this.renderInspector();
    const graph = this.graph();
    const graphIssues = this.graphIssues();
    this.duplicate.disabled = !graph;
    this.remove.disabled = !graph;
    this.test.disabled = !graph || graphIssues.length > 0;
    this.status.dataset.state = graphIssues.length === 0 ? "good" : "bad";
    this.status.textContent = graph
      ? graphIssues.length === 0
        ? `Graf ${graph.id} jest poprawny · checksum ${stableChecksum(graph)}`
        : `${graphIssues.length} problemów: ${graphIssues.map((issue) => issue.message).join(" | ")}`
      : "Brak grafów gameplayu.";
  }

  private renderGraphList(): void {
    if (!this.project) return;
    const needle = this.search.value.trim().toLowerCase();
    this.graphList.innerHTML = "";
    for (const graph of this.project.gameplay.graphs.filter((item) => !needle || `${item.id} ${item.name}`.toLowerCase().includes(needle))) {
      const button = document.createElement("button");
      button.className = `ability-graph-row${graph.id === this.selectedGraphId ? " active" : ""}`;
      const usage = graphUsage(this.project, graph.id);
      button.innerHTML = `<strong></strong><small></small>`;
      button.querySelector("strong")!.textContent = graph.name;
      button.querySelector("small")!.textContent = `${graph.id} · ${graph.nodes.length} węzłów · ${usage.length} referencji`;
      button.addEventListener("click", () => {
        this.selectedGraphId = graph.id;
        this.selectedNodeId = graph.entryNodeId;
        this.lastPlan = undefined;
        this.render();
      });
      this.graphList.append(button);
    }
  }

  private renderPalette(): void {
    this.palette.innerHTML = "";
    for (const metadata of CORE_GAMEPLAY_PRIMITIVE_CATALOG) {
      const button = document.createElement("button");
      button.className = `btn ability-palette-${metadata.kind}`;
      button.title = metadata.description;
      button.textContent = metadata.label;
      button.addEventListener("click", () => this.addNode(metadata.kind, metadata.id));
      this.palette.append(button);
    }
  }

  private renderCanvas(): void {
    const graph = this.graph();
    this.canvas.innerHTML = "";
    if (!graph) return;
    const positions = new Map<string, { x: number; y: number }>();
    graph.nodes.forEach((node, index) => positions.set(node.id, { x: 34 + (index % 3) * 255, y: 36 + Math.floor(index / 3) * 145 }));
    const rows = Math.ceil(graph.nodes.length / 3);
    this.canvas.style.minHeight = `${Math.max(520, rows * 145 + 80)}px`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("ability-edges");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", `${Math.max(520, rows * 145 + 80)}`);
    for (const node of graph.nodes) {
      const from = positions.get(node.id)!;
      for (const successor of nodeSuccessors(node)) {
        const to = positions.get(successor.id);
        if (!to) continue;
        const line = document.createElementNS(svg.namespaceURI, "path");
        const sx = from.x + 205, sy = from.y + 43, tx = to.x, ty = to.y + 43;
        line.setAttribute("d", `M ${sx} ${sy} C ${sx + 45} ${sy}, ${tx - 45} ${ty}, ${tx} ${ty}`);
        line.setAttribute("class", successor.label === "false" ? "ability-edge false" : "ability-edge");
        svg.append(line);
        const label = document.createElementNS(svg.namespaceURI, "text");
        label.setAttribute("x", String((sx + tx) / 2));
        label.setAttribute("y", String((sy + ty) / 2 - 5));
        label.setAttribute("class", "ability-edge-label");
        label.textContent = successor.label;
        svg.append(label);
      }
    }
    this.canvas.append(svg);
    const issues = this.graphIssues();
    for (const [index, node] of graph.nodes.entries()) {
      const position = positions.get(node.id)!;
      const card = document.createElement("button");
      const nodeInvalid = issues.some((issue) => issue.path.includes(`.nodes[${index}]`) || issue.path.includes(`.nodes.${node.id}`));
      card.className = `ability-node kind-${node.kind}${node.id === this.selectedNodeId ? " active" : ""}${nodeInvalid ? " invalid" : ""}`;
      card.style.left = `${position.x}px`;
      card.style.top = `${position.y}px`;
      card.innerHTML = `<span class="ability-node-kind"></span><strong></strong><code></code>`;
      card.querySelector(".ability-node-kind")!.textContent = node.kind;
      card.querySelector("strong")!.textContent = gameplayPrimitiveMetadata(primitiveId(node))?.label ?? primitiveId(node);
      card.querySelector("code")!.textContent = node.id;
      card.addEventListener("click", () => { this.selectedNodeId = node.id; this.render(); });
      this.canvas.append(card);
    }
  }

  private renderInspector(): void {
    const graph = this.graph();
    const node = graph?.nodes.find((item) => item.id === this.selectedNodeId);
    this.inspector.innerHTML = "";
    if (!graph || !node) {
      this.inspector.textContent = "Wybierz węzeł na canvasie.";
      return;
    }
    const heading = document.createElement("div");
    heading.className = "content-heading";
    heading.innerHTML = `<strong></strong><code></code>`;
    heading.querySelector("strong")!.textContent = gameplayPrimitiveMetadata(primitiveId(node))?.label ?? node.kind;
    heading.querySelector("code")!.textContent = node.id;
    this.inspector.append(heading);

    const nameField = this.textField("ID węzła", node.id, (value) => this.renameNode(value));
    this.inspector.append(nameField);
    if (node.kind !== "end") {
      const primitiveSelect = document.createElement("select");
      for (const metadata of gameplayPrimitivesByKind(node.kind)) {
        const option = document.createElement("option");
        option.value = metadata.id;
        option.textContent = `${metadata.label} — ${metadata.id}`;
        option.selected = metadata.id === primitiveId(node);
        primitiveSelect.append(option);
      }
      primitiveSelect.addEventListener("change", () => this.changePrimitive(primitiveSelect.value));
      this.inspector.append(this.wrapField("Prymityw", primitiveSelect));
    }

    const targetOptions = graph.nodes.map((item) => item.id);
    if (node.kind === "condition") {
      this.inspector.append(this.edgeField("Gdy prawda", node.onTrue, targetOptions, (value) => this.updateNode((draft) => { if (draft.kind === "condition") draft.onTrue = value; }, "Połącz gałąź true")));
      this.inspector.append(this.edgeField("Gdy fałsz", node.onFalse, targetOptions, (value) => this.updateNode((draft) => { if (draft.kind === "condition") draft.onFalse = value; }, "Połącz gałąź false")));
    } else if (node.kind !== "end") {
      this.inspector.append(this.edgeField("Następny węzeł", node.next, targetOptions, (value) => this.updateNode((draft) => { if (draft.kind !== "condition" && draft.kind !== "end") draft.next = value; }, "Połącz węzeł")));
    }

    const metadata = gameplayPrimitiveMetadata(primitiveId(node));
    for (const parameter of metadata?.parameters ?? []) {
      const current = node.kind === "end" ? undefined : node.parameters?.[parameter.id];
      const input = document.createElement("input");
      input.type = parameter.type === "boolean" ? "checkbox" : parameter.type;
      if (parameter.type === "boolean") input.checked = Boolean(current ?? parameter.defaultValue ?? false);
      else input.value = String(current ?? parameter.defaultValue ?? "");
      if (parameter.min !== undefined) input.min = String(parameter.min);
      if (parameter.max !== undefined) input.max = String(parameter.max);
      if (parameter.step !== undefined) input.step = String(parameter.step);
      input.addEventListener("change", () => {
        const value = parameter.type === "boolean" ? input.checked : parameter.type === "number" ? Number(input.value) : input.value;
        this.updateNode((draft) => {
          if (draft.kind === "end") return;
          draft.parameters = { ...(draft.parameters ?? {}), [parameter.id]: value };
        }, `Zmień parametr ${parameter.id}`);
      });
      this.inspector.append(this.wrapField(parameter.label, input));
    }

    const actions = document.createElement("div");
    actions.className = "asset-actions";
    const entry = document.createElement("button");
    entry.className = "btn blue";
    entry.textContent = graph.entryNodeId === node.id ? "Węzeł wejściowy ✓" : "Ustaw jako wejście";
    entry.disabled = graph.entryNodeId === node.id;
    entry.addEventListener("click", () => this.setEntry(node.id));
    const remove = document.createElement("button");
    remove.className = "btn danger";
    remove.textContent = "Usuń węzeł";
    remove.disabled = node.kind === "end" || graph.nodes.length <= 1;
    remove.addEventListener("click", () => this.deleteNode(node.id));
    actions.append(entry, remove);
    this.inspector.append(actions);
  }

  private wrapField(label: string, control: HTMLElement): HTMLElement {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    wrapper.append(document.createTextNode(label), control);
    return wrapper;
  }

  private textField(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const input = document.createElement("input");
    input.value = value;
    input.addEventListener("change", () => onChange(input.value.trim()));
    return this.wrapField(label, input);
  }

  private edgeField(label: string, value: string, options: string[], onChange: (value: string) => void): HTMLElement {
    const select = document.createElement("select");
    for (const id of options) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      option.selected = id === value;
      select.append(option);
    }
    select.addEventListener("change", () => onChange(select.value));
    return this.wrapField(label, select);
  }

  private createTemplate(mode: "damage" | "heal"): void {
    if (!this.project) return;
    const created = templateGraph(this.project, mode);
    const ok = this.execute(createProjectCommand(`Utwórz umiejętność ${mode}`, (draft) => {
      draft.gameplay.graphs.push(created.graph);
      draft.gameplay.bindings.push({ id: created.bindingId, domain: "ability", graphId: created.graph.id });
      draft.content.abilities.push(created.ability);
      draft.manifest.updatedAt = new Date().toISOString();
    }));
    if (ok) {
      this.selectedGraphId = created.graph.id;
      this.selectedNodeId = created.graph.entryNodeId;
      this.render();
    }
  }

  private duplicateGraph(): void {
    if (!this.project) return;
    const source = this.graph();
    if (!source) return;
    const used = new Set(this.project.gameplay.graphs.map((graph) => graph.id));
    const id = uniqueId(used, `${source.id}.copy`);
    const nodeMap = new Map(source.nodes.map((node, index) => [node.id, `${id}.node.${index + 1}`]));
    const clone = structuredClone(source);
    clone.id = id;
    clone.name = `${source.name} — kopia`;
    clone.entryNodeId = nodeMap.get(source.entryNodeId)!;
    clone.nodes = clone.nodes.map((node) => {
      node.id = nodeMap.get(node.id)!;
      if (node.kind === "condition") { node.onTrue = nodeMap.get(node.onTrue)!; node.onFalse = nodeMap.get(node.onFalse)!; }
      else if (node.kind !== "end") node.next = nodeMap.get(node.next)!;
      return node;
    });
    const ok = this.execute(createProjectCommand("Duplikuj graf", (draft) => { draft.gameplay.graphs.push(clone); }));
    if (ok) { this.selectedGraphId = clone.id; this.selectedNodeId = clone.entryNodeId; this.render(); }
  }

  private deleteGraph(): void {
    if (!this.project) return;
    const graph = this.graph();
    if (!graph) return;
    const usage = graphUsage(this.project, graph.id);
    if (usage.length > 0) {
      this.status.dataset.state = "bad";
      this.status.textContent = `Nie można usunąć: ${usage.join(" · ")}`;
      return;
    }
    const ok = this.execute(createProjectCommand("Usuń nieużywany graf", (draft) => {
      draft.gameplay.graphs = draft.gameplay.graphs.filter((item) => item.id !== graph.id);
    }));
    if (ok) { this.selectedGraphId = ""; this.selectedNodeId = ""; this.render(); }
  }

  private addNode(kind: GameplayPrimitiveKind, primitive: string): void {
    const graph = this.graph();
    if (!graph) return;
    const end = graph.nodes.find((node) => node.kind === "end");
    if (!end) return;
    const id = uniqueId(new Set(graph.nodes.map((node) => node.id)), `node.editor.${slug(primitive)}`);
    const created = createNode(kind, primitive, id, end.id);
    const ok = this.execute(createProjectCommand(`Dodaj ${primitive}`, (draft) => {
      draft.gameplay.graphs.find((item) => item.id === graph.id)!.nodes.splice(-1, 0, created);
    }));
    if (ok) { this.selectedNodeId = id; this.render(); }
  }

  private updateNode(mutator: (node: GameplayNodeDefinition) => void, label: string): void {
    const graph = this.graph();
    if (!graph) return;
    const nodeId = this.selectedNodeId;
    this.execute(createProjectCommand(label, (draft) => {
      const node = draft.gameplay.graphs.find((item) => item.id === graph.id)!.nodes.find((item) => item.id === nodeId);
      if (!node) throw new Error(`Brak węzła ${nodeId}.`);
      mutator(node);
    }));
  }

  private changePrimitive(id: string): void {
    const metadata = gameplayPrimitiveMetadata(id);
    if (!metadata) return;
    this.updateNode((node) => {
      if (node.kind !== metadata.kind) return;
      if (node.kind === "condition") node.conditionId = id;
      else if (node.kind === "target-query") node.queryId = id;
      else if (node.kind === "action") node.actionId = id;
      else if (node.kind === "effect") node.effectId = id;
      const defaults = defaultParameters(id);
      if (defaults) node.parameters = defaults;
      else delete node.parameters;
    }, `Zmień prymityw na ${id}`);
  }

  private renameNode(nextId: string): void {
    const graph = this.graph();
    if (!graph || !nextId || nextId === this.selectedNodeId) return;
    const previous = this.selectedNodeId;
    const ok = this.execute(createProjectCommand("Zmień ID węzła", (draft) => {
      const target = draft.gameplay.graphs.find((item) => item.id === graph.id)!;
      if (target.nodes.some((node) => node.id === nextId)) throw new Error(`ID ${nextId} już istnieje.`);
      const node = target.nodes.find((item) => item.id === previous)!;
      node.id = nextId;
      if (target.entryNodeId === previous) target.entryNodeId = nextId;
      for (const item of target.nodes) {
        if (item.kind === "condition") {
          if (item.onTrue === previous) item.onTrue = nextId;
          if (item.onFalse === previous) item.onFalse = nextId;
        } else if (item.kind !== "end" && item.next === previous) item.next = nextId;
      }
    }));
    if (ok) { this.selectedNodeId = nextId; this.render(); }
  }

  private setEntry(nodeId: string): void {
    const graph = this.graph();
    if (!graph) return;
    this.execute(createProjectCommand("Ustaw wejście grafu", (draft) => {
      draft.gameplay.graphs.find((item) => item.id === graph.id)!.entryNodeId = nodeId;
    }));
  }

  private deleteNode(nodeId: string): void {
    const graph = this.graph();
    if (!graph) return;
    const end = graph.nodes.find((node) => node.kind === "end");
    if (!end || nodeId === end.id) return;
    const ok = this.execute(createProjectCommand("Usuń węzeł i przepnij do End", (draft) => {
      const target = draft.gameplay.graphs.find((item) => item.id === graph.id)!;
      target.nodes = target.nodes.filter((node) => node.id !== nodeId);
      if (target.entryNodeId === nodeId) target.entryNodeId = end.id;
      for (const node of target.nodes) {
        if (node.kind === "condition") {
          if (node.onTrue === nodeId) node.onTrue = end.id;
          if (node.onFalse === nodeId) node.onFalse = end.id;
        } else if (node.kind !== "end" && node.next === nodeId) node.next = end.id;
      }
    }));
    if (ok) { this.selectedNodeId = end.id; this.render(); }
  }

  private async runTest(): Promise<void> {
    const graph = this.graph();
    if (!graph) return;
    this.test.disabled = true;
    this.trace.textContent = "Planowanie grafu w odizolowanym runtime…";
    try {
      this.lastPlan = await this.testGraph(graph.id, this.player.value);
      if (this.lastPlan.ok) {
        this.trace.textContent = [
          `OK · ${this.lastPlan.stepsUsed} kroków · ${this.lastPlan.operations.length} operacji`,
          "",
          "TRACE:",
          ...this.lastPlan.trace.map((step) => `${step.step}. ${step.nodeId} [${step.kind}] targets=${step.selectedTargetEntityIds.join(",") || "—"}`),
          "",
          "PLANNED OPERATIONS:",
          ...this.lastPlan.operations.map((operation, index) => `${index + 1}. ${operation.kind}:${operation.primitiveId} owner=${operation.ownerPlayerId ?? "AI"} source=${operation.sourceEntityId} targets=${operation.targetEntityIds.join(",") || "—"} params=${JSON.stringify(operation.parameters)}`),
        ].join("\n");
      } else {
        this.trace.textContent = `BŁĄD ${this.lastPlan.code} w ${this.lastPlan.nodeId ?? "—"}: ${this.lastPlan.message}\n\n${this.lastPlan.trace.map((step) => `${step.step}. ${step.nodeId}`).join("\n")}`;
      }
    } catch (error) {
      this.lastPlan = undefined;
      this.trace.textContent = `Test nieudany: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.test.disabled = false;
      this.render();
    }
  }
}
