import type {
  GameplayDomain,
  GameplayGraphDefinition,
  GameplayLanguageDefinition,
  GameplayNodeDefinition,
  GameplayTriggerEvent,
  StableId,
} from "../../schema/src/index.js";
import { gameplayPrimitiveMetadata } from "./registry.js";
import type { GameplayLanguageIssue, GameplayPrimitiveRegistry } from "./types.js";

const STABLE_ID = /^[a-z][a-z0-9._-]{2,63}$/;
const DOMAINS = new Set<GameplayDomain>(["ability", "item-effect", "talent-modifier", "ai-action", "quest-reaction", "map-trigger"]);
const EVENTS = new Set<GameplayTriggerEvent>(["ability.used", "damage.applied", "actor.died", "actor.respawned", "player.joined", "player.left", "party.floor_changed"]);
const NODE_KINDS = new Set(["condition", "target-query", "effect", "action", "end"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is StableId {
  return typeof value === "string" && STABLE_ID.test(value);
}

function successors(node: GameplayNodeDefinition): readonly StableId[] {
  switch (node.kind) {
    case "condition": return [node.onTrue, node.onFalse];
    case "target-query":
    case "effect":
    case "action": return [node.next];
    case "end": return [];
    default: return [];
  }
}

function validateParameters(value: unknown, path: string, issues: GameplayLanguageIssue[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ code: "invalid_gameplay_parameters", path, message: "Parametry węzła muszą być płaskim obiektem." });
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (!validId(`p.${key}`)) issues.push({ code: "invalid_gameplay_parameter_name", path: `${path}.${key}`, message: `Nieprawidłowa nazwa parametru ${key}.` });
    if (!(typeof item === "string" || typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item)))) {
      issues.push({ code: "invalid_gameplay_parameter", path: `${path}.${key}`, message: "Parametr może być tylko skończoną liczbą, tekstem albo boolean." });
    }
  }
}


function validateCorePrimitiveParameters(node: GameplayNodeDefinition, path: string, issues: GameplayLanguageIssue[]): void {
  if (node.kind === "end") return;
  const params = node.parameters ?? {};
  const primitiveId = node.kind === "condition" ? node.conditionId : node.kind === "target-query" ? node.queryId : node.kind === "action" ? node.actionId : node.effectId;
  const metadata = gameplayPrimitiveMetadata(primitiveId);
  if (!metadata) return;
  const allowed = new Set(metadata.parameters.map((parameter) => parameter.id));
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) issues.push({ code: "unknown_gameplay_parameter", path: `${path}.parameters.${key}`, message: `${primitiveId} nie obsługuje parametru ${key}.` });
  }
  for (const parameter of metadata.parameters) {
    const value = params[parameter.id];
    const parameterPath = `${path}.parameters.${parameter.id}`;
    if (value === undefined) {
      if (parameter.required && parameter.defaultValue === undefined) issues.push({ code: "missing_gameplay_parameter", path: parameterPath, message: `${primitiveId} wymaga parametru ${parameter.id}.` });
      continue;
    }
    if (typeof value !== parameter.type) {
      issues.push({ code: "invalid_gameplay_parameter_type", path: parameterPath, message: `${primitiveId}.${parameter.id} wymaga typu ${parameter.type}.` });
      continue;
    }
    if (parameter.type === "number") {
      const numberValue = value as number;
      if (!Number.isFinite(numberValue)) issues.push({ code: "invalid_gameplay_parameter_type", path: parameterPath, message: `${primitiveId}.${parameter.id} musi być skończoną liczbą.` });
      if (parameter.min !== undefined && numberValue < parameter.min) issues.push({ code: "invalid_gameplay_parameter_range", path: parameterPath, message: `${primitiveId}.${parameter.id} nie może być mniejsze niż ${parameter.min}.` });
      if (parameter.max !== undefined && numberValue > parameter.max) issues.push({ code: "invalid_gameplay_parameter_range", path: parameterPath, message: `${primitiveId}.${parameter.id} nie może być większe niż ${parameter.max}.` });
      if (parameter.integer && !Number.isInteger(numberValue)) issues.push({ code: "invalid_gameplay_parameter_type", path: parameterPath, message: `${primitiveId}.${parameter.id} musi być liczbą całkowitą.` });
    }
  }
}

function validateGraph(
  graph: GameplayGraphDefinition,
  graphIndex: number,
  registry: GameplayPrimitiveRegistry,
  issues: GameplayLanguageIssue[],
): void {
  const path = `$.gameplay.graphs[${graphIndex}]`;
  if (!validId(graph.id)) issues.push({ code: "invalid_gameplay_graph_id", path: `${path}.id`, message: "Graf wymaga stabilnego ID." });
  if (typeof graph.name !== "string" || graph.name.trim().length === 0) issues.push({ code: "invalid_gameplay_graph_name", path: `${path}.name`, message: "Graf wymaga nazwy." });
  if (!validId(graph.entryNodeId)) issues.push({ code: "invalid_gameplay_entry_node", path: `${path}.entryNodeId`, message: "Węzeł wejściowy wymaga stabilnego ID." });
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    issues.push({ code: "empty_gameplay_graph", path: `${path}.nodes`, message: "Graf musi zawierać co najmniej jeden węzeł." });
    return;
  }
  if (graph.nodes.length > 256) issues.push({ code: "gameplay_graph_too_large", path: `${path}.nodes`, message: "Graf może zawierać maksymalnie 256 węzłów." });

  const nodeById = new Map<StableId, GameplayNodeDefinition>();
  graph.nodes.forEach((node, nodeIndex) => {
    const nodePath = `${path}.nodes[${nodeIndex}]`;
    if (!isRecord(node)) {
      issues.push({ code: "invalid_gameplay_node", path: nodePath, message: "Węzeł musi być obiektem." });
      return;
    }
    if (!validId(node.id)) {
      issues.push({ code: "invalid_gameplay_node_id", path: `${nodePath}.id`, message: "Węzeł wymaga stabilnego ID." });
      return;
    }
    if (nodeById.has(node.id)) issues.push({ code: "duplicate_gameplay_node", path: `${nodePath}.id`, message: `Powtórzone ID węzła ${node.id}.` });
    if (typeof node.kind !== "string" || !NODE_KINDS.has(node.kind)) {
      issues.push({ code: "invalid_gameplay_node_kind", path: `${nodePath}.kind`, message: `Nieznany typ węzła ${String(node.kind)}.` });
      return;
    }
    const typedNode = node as unknown as GameplayNodeDefinition;
    nodeById.set(node.id, typedNode);
    validateParameters(node.parameters, `${nodePath}.parameters`, issues);
    validateCorePrimitiveParameters(typedNode, nodePath, issues);

    let primitiveId: unknown;
    let primitive: unknown;
    if (typedNode.kind === "condition") {
      primitiveId = typedNode.conditionId;
      primitive = registry.conditions.get(typedNode.conditionId);
      if (!validId(typedNode.onTrue)) issues.push({ code: "invalid_gameplay_edge", path: `${nodePath}.onTrue`, message: "Krawędź onTrue wymaga stabilnego ID." });
      if (!validId(typedNode.onFalse)) issues.push({ code: "invalid_gameplay_edge", path: `${nodePath}.onFalse`, message: "Krawędź onFalse wymaga stabilnego ID." });
    } else if (typedNode.kind === "target-query") {
      primitiveId = typedNode.queryId;
      primitive = registry.targetQueries.get(typedNode.queryId);
      if (!validId(typedNode.next)) issues.push({ code: "invalid_gameplay_edge", path: `${nodePath}.next`, message: "Krawędź next wymaga stabilnego ID." });
    } else if (typedNode.kind === "action") {
      primitiveId = typedNode.actionId;
      primitive = registry.actions.get(typedNode.actionId);
      if (!validId(typedNode.next)) issues.push({ code: "invalid_gameplay_edge", path: `${nodePath}.next`, message: "Krawędź next wymaga stabilnego ID." });
    } else if (typedNode.kind === "effect") {
      primitiveId = typedNode.effectId;
      primitive = registry.effects.get(typedNode.effectId);
      if (!validId(typedNode.next)) issues.push({ code: "invalid_gameplay_edge", path: `${nodePath}.next`, message: "Krawędź next wymaga stabilnego ID." });
    }
    if (typedNode.kind !== "end") {
      if (!validId(primitiveId)) issues.push({ code: "invalid_gameplay_primitive_id", path: nodePath, message: "Węzeł wymaga stabilnego ID prymitywu." });
      else if (!primitive) issues.push({ code: "unknown_gameplay_primitive", path: nodePath, message: `Niezarejestrowany prymityw ${primitiveId}.` });
    }
  });

  if (!nodeById.has(graph.entryNodeId)) issues.push({ code: "unknown_gameplay_entry_node", path: `${path}.entryNodeId`, message: `Nieznany węzeł wejściowy ${graph.entryNodeId}.` });
  for (const [nodeId, node] of nodeById) {
    for (const target of successors(node)) {
      if (!nodeById.has(target)) issues.push({ code: "unknown_gameplay_edge", path: `${path}.nodes.${nodeId}`, message: `Krawędź wskazuje nieznany węzeł ${target}.` });
    }
  }

  const state = new Map<StableId, "visiting" | "done">();
  const visit = (nodeId: StableId): void => {
    const previous = state.get(nodeId);
    if (previous === "visiting") {
      issues.push({ code: "gameplay_cycle_forbidden", path, message: `Graf ${graph.id} zawiera cykl przez ${nodeId}; schema gameplay v1 zabrania cykli.` });
      return;
    }
    if (previous === "done") return;
    const node = nodeById.get(nodeId);
    if (!node) return;
    state.set(nodeId, "visiting");
    for (const target of successors(node)) visit(target);
    state.set(nodeId, "done");
  };
  visit(graph.entryNodeId);
}

export function validateGameplayLanguage(
  language: GameplayLanguageDefinition,
  registry: GameplayPrimitiveRegistry,
): GameplayLanguageIssue[] {
  const issues: GameplayLanguageIssue[] = [];
  if (language.schemaVersion !== 1) issues.push({ code: "unsupported_gameplay_schema", path: "$.gameplay.schemaVersion", message: "Obsługiwana wersja języka gameplayu to 1." });
  if (!Number.isInteger(language.executionBudget) || language.executionBudget < 1 || language.executionBudget > 256) {
    issues.push({ code: "invalid_gameplay_budget", path: "$.gameplay.executionBudget", message: "Budżet wykonania musi być liczbą całkowitą 1..256." });
  }
  if (!Array.isArray(language.graphs) || !Array.isArray(language.bindings) || !Array.isArray(language.triggers)) {
    issues.push({ code: "invalid_gameplay_collections", path: "$.gameplay", message: "Gameplay wymaga tablic graphs, bindings i triggers." });
    return issues;
  }

  const graphIds = new Set<StableId>();
  language.graphs.forEach((graph, index) => {
    if (graphIds.has(graph.id)) issues.push({ code: "duplicate_gameplay_graph", path: `$.gameplay.graphs[${index}].id`, message: `Powtórzone ID grafu ${graph.id}.` });
    graphIds.add(graph.id);
    validateGraph(graph, index, registry, issues);
  });
  const bindingIds = new Set<StableId>();
  language.bindings.forEach((binding, index) => {
    const path = `$.gameplay.bindings[${index}]`;
    if (!validId(binding.id)) issues.push({ code: "invalid_gameplay_binding_id", path: `${path}.id`, message: "Binding wymaga stabilnego ID." });
    if (bindingIds.has(binding.id)) issues.push({ code: "duplicate_gameplay_binding", path: `${path}.id`, message: `Powtórzone ID bindingu ${binding.id}.` });
    bindingIds.add(binding.id);
    if (!DOMAINS.has(binding.domain)) issues.push({ code: "invalid_gameplay_domain", path: `${path}.domain`, message: `Nieznana domena ${binding.domain}.` });
    if (!graphIds.has(binding.graphId)) issues.push({ code: "unknown_gameplay_graph", path: `${path}.graphId`, message: `Nieznany graf ${binding.graphId}.` });
  });
  const triggerIds = new Set<StableId>();
  language.triggers.forEach((trigger, index) => {
    const path = `$.gameplay.triggers[${index}]`;
    if (!validId(trigger.id)) issues.push({ code: "invalid_gameplay_trigger_id", path: `${path}.id`, message: "Trigger wymaga stabilnego ID." });
    if (triggerIds.has(trigger.id)) issues.push({ code: "duplicate_gameplay_trigger", path: `${path}.id`, message: `Powtórzone ID triggera ${trigger.id}.` });
    triggerIds.add(trigger.id);
    if (!DOMAINS.has(trigger.domain)) issues.push({ code: "invalid_gameplay_domain", path: `${path}.domain`, message: `Nieznana domena ${trigger.domain}.` });
    if (!EVENTS.has(trigger.event)) issues.push({ code: "invalid_gameplay_event", path: `${path}.event`, message: `Nieznane zdarzenie ${trigger.event}.` });
    if (typeof trigger.enabled !== "boolean") issues.push({ code: "invalid_gameplay_trigger_enabled", path: `${path}.enabled`, message: "Pole enabled musi być boolean." });
    if (!graphIds.has(trigger.graphId)) issues.push({ code: "unknown_gameplay_graph", path: `${path}.graphId`, message: `Nieznany graf ${trigger.graphId}.` });
  });
  return issues;
}
