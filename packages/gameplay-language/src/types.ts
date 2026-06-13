import type {
  GameplayDomain,
  GameplayGraphDefinition,
  GameplayNodeDefinition,
  GameplayParameters,
  GameplayTriggerEvent,
  StableId,
} from "../../schema/src/index.js";

export interface GameplayExecutionContext {
  domain: GameplayDomain;
  entryPointId: StableId;
  sourceEntityId: string;
  ownerPlayerId: string | null;
  abilityId: StableId | null;
  providedTargetEntityId: string | null;
  tick: number;
  eventType?: GameplayTriggerEvent;
}

export interface GameplayPrimitiveEnvironment {
  context: GameplayExecutionContext;
  graph: GameplayGraphDefinition;
  node: GameplayNodeDefinition;
  selectedTargetEntityIds: readonly string[];
}

export interface GameplayOperation {
  kind: "action" | "effect";
  primitiveId: StableId;
  graphId: StableId;
  nodeId: StableId;
  sourceEntityId: string;
  ownerPlayerId: string | null;
  abilityId: StableId | null;
  tick: number;
  targetEntityIds: string[];
  parameters: GameplayParameters;
}

export interface GameplayConditionPrimitive {
  id: StableId;
  evaluate(environment: GameplayPrimitiveEnvironment, parameters: GameplayParameters): boolean;
}

export interface GameplayTargetQueryPrimitive {
  id: StableId;
  select(environment: GameplayPrimitiveEnvironment, parameters: GameplayParameters): readonly string[];
}

export interface GameplayOperationPrimitive {
  id: StableId;
  plan(environment: GameplayPrimitiveEnvironment, parameters: GameplayParameters): readonly GameplayOperation[];
}

export interface GameplayPrimitiveRegistry {
  conditions: ReadonlyMap<StableId, GameplayConditionPrimitive>;
  targetQueries: ReadonlyMap<StableId, GameplayTargetQueryPrimitive>;
  actions: ReadonlyMap<StableId, GameplayOperationPrimitive>;
  effects: ReadonlyMap<StableId, GameplayOperationPrimitive>;
}

export interface GameplayExecutionTraceStep {
  step: number;
  graphId: StableId;
  nodeId: StableId;
  kind: GameplayNodeDefinition["kind"];
  selectedTargetEntityIds: string[];
}

export type GameplayPlanResult =
  | {
      ok: true;
      graphId: StableId;
      operations: GameplayOperation[];
      trace: GameplayExecutionTraceStep[];
      stepsUsed: number;
    }
  | {
      ok: false;
      graphId: StableId;
      code: "unknown_graph" | "unknown_node" | "unknown_primitive" | "budget_exceeded" | "runtime_cycle" | "primitive_error" | "commit_rejected";
      message: string;
      nodeId: StableId | null;
      trace: GameplayExecutionTraceStep[];
      stepsUsed: number;
    };

export interface GameplayLanguageIssue {
  code: string;
  path: string;
  message: string;
}

export type GameplayPrimitiveKind = "condition" | "target-query" | "action" | "effect";
export type GameplayParameterEditorType = "number" | "string" | "boolean";

export interface GameplayPrimitiveParameterMetadata {
  id: string;
  label: string;
  type: GameplayParameterEditorType;
  required: boolean;
  defaultValue?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  description?: string;
}

export interface GameplayPrimitiveMetadata {
  id: StableId;
  kind: GameplayPrimitiveKind;
  label: string;
  description: string;
  parameters: readonly GameplayPrimitiveParameterMetadata[];
}
