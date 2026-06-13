import type {
  GameplayLanguageDefinition,
  GameplayParameters,
  GameplayTriggerEvent,
  StableId,
} from "../../schema/src/index.js";
import type {
  GameplayExecutionContext,
  GameplayExecutionTraceStep,
  GameplayOperation,
  GameplayPlanResult,
  GameplayPrimitiveEnvironment,
  GameplayPrimitiveRegistry,
} from "./types.js";

function parameters(value: GameplayParameters | undefined): GameplayParameters {
  return value ? { ...value } : {};
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export class GameplayInterpreter {
  private readonly graphById: Map<StableId, GameplayLanguageDefinition["graphs"][number]>;
  private readonly bindingById: Map<StableId, GameplayLanguageDefinition["bindings"][number]>;

  constructor(
    private readonly language: GameplayLanguageDefinition,
    private readonly registry: GameplayPrimitiveRegistry,
  ) {
    this.graphById = new Map(language.graphs.map((graph) => [graph.id, graph]));
    this.bindingById = new Map(language.bindings.map((binding) => [binding.id, binding]));
  }

  planBinding(bindingId: StableId, context: GameplayExecutionContext): GameplayPlanResult {
    const binding = this.bindingById.get(bindingId);
    if (!binding) return this.failure("unknown_graph", `Nie znaleziono bindingu ${bindingId}.`, bindingId, null, [], 0);
    if (binding.domain !== context.domain) {
      return this.failure("primitive_error", `Binding ${bindingId} należy do domeny ${binding.domain}, nie ${context.domain}.`, binding.graphId, null, [], 0);
    }
    return this.planGraph(binding.graphId, context);
  }

  planGraph(graphId: StableId, context: GameplayExecutionContext, budget = this.language.executionBudget): GameplayPlanResult {
    const graph = this.graphById.get(graphId);
    if (!graph) return this.failure("unknown_graph", `Nie znaleziono grafu ${graphId}.`, graphId, null, [], 0);
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    let nodeId: StableId = graph.entryNodeId;
    let selectedTargetEntityIds: string[] = [];
    const operations: GameplayOperation[] = [];
    const trace: GameplayExecutionTraceStep[] = [];
    const visited = new Set<StableId>();
    let stepsUsed = 0;

    while (true) {
      if (stepsUsed >= budget) return this.failure("budget_exceeded", `Graf ${graphId} przekroczył budżet ${budget} kroków.`, graphId, nodeId, trace, stepsUsed);
      if (visited.has(nodeId)) return this.failure("runtime_cycle", `Graf ${graphId} ponownie odwiedził ${nodeId}.`, graphId, nodeId, trace, stepsUsed);
      visited.add(nodeId);
      const node = nodeById.get(nodeId);
      if (!node) return this.failure("unknown_node", `Nie znaleziono węzła ${nodeId}.`, graphId, nodeId, trace, stepsUsed);
      stepsUsed += 1;
      trace.push({ step: stepsUsed, graphId, nodeId, kind: node.kind, selectedTargetEntityIds: [...selectedTargetEntityIds] });
      if (node.kind === "end") return { ok: true, graphId, operations, trace, stepsUsed };

      const environment: GameplayPrimitiveEnvironment = {
        context,
        graph,
        node,
        selectedTargetEntityIds,
      };
      try {
        if (node.kind === "condition") {
          const primitive = this.registry.conditions.get(node.conditionId);
          if (!primitive) return this.failure("unknown_primitive", `Nieznane Condition ${node.conditionId}.`, graphId, node.id, trace, stepsUsed);
          nodeId = primitive.evaluate(environment, parameters(node.parameters)) ? node.onTrue : node.onFalse;
        } else if (node.kind === "target-query") {
          const primitive = this.registry.targetQueries.get(node.queryId);
          if (!primitive) return this.failure("unknown_primitive", `Nieznane Target Query ${node.queryId}.`, graphId, node.id, trace, stepsUsed);
          selectedTargetEntityIds = uniqueSorted(primitive.select(environment, parameters(node.parameters)));
          nodeId = node.next;
        } else if (node.kind === "action") {
          const primitive = this.registry.actions.get(node.actionId);
          if (!primitive) return this.failure("unknown_primitive", `Nieznane Action ${node.actionId}.`, graphId, node.id, trace, stepsUsed);
          operations.push(...primitive.plan(environment, parameters(node.parameters)));
          nodeId = node.next;
        } else {
          const primitive = this.registry.effects.get(node.effectId);
          if (!primitive) return this.failure("unknown_primitive", `Nieznane Effect ${node.effectId}.`, graphId, node.id, trace, stepsUsed);
          operations.push(...primitive.plan(environment, parameters(node.parameters)));
          nodeId = node.next;
        }
      } catch (error) {
        return this.failure("primitive_error", error instanceof Error ? error.message : String(error), graphId, node.id, trace, stepsUsed);
      }
    }
  }

  planEvent(
    event: GameplayTriggerEvent,
    context: Omit<GameplayExecutionContext, "domain" | "entryPointId" | "eventType">,
  ): Array<{ triggerId: StableId; result: GameplayPlanResult }> {
    return this.language.triggers
      .filter((trigger) => trigger.enabled && trigger.event === event)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((trigger) => ({
        triggerId: trigger.id,
        result: this.planGraph(trigger.graphId, {
          ...context,
          domain: trigger.domain,
          entryPointId: trigger.id,
          eventType: event,
        }),
      }));
  }

  private failure(
    code: Extract<GameplayPlanResult, { ok: false }>["code"],
    message: string,
    graphId: StableId,
    nodeId: StableId | null,
    trace: GameplayExecutionTraceStep[],
    stepsUsed: number,
  ): GameplayPlanResult {
    return { ok: false, graphId, code, message, nodeId, trace, stepsUsed };
  }
}
