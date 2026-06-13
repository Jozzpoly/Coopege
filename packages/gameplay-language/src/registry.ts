import type { GameplayParameters, StableId } from "../../schema/src/index.js";
import type {
  GameplayConditionPrimitive,
  GameplayOperation,
  GameplayOperationPrimitive,
  GameplayPrimitiveEnvironment,
  GameplayPrimitiveRegistry,
  GameplayTargetQueryPrimitive,
} from "./types.js";

export const CORE_CONDITION_IDS = [
  "condition.source-alive",
  "condition.cooldown-ready",
  "condition.targets-present",
  "condition.provided-target-is-monster",
] as const;

export const CORE_TARGET_QUERY_IDS = [
  "query.nearest-hostile-in-range",
  "query.source",
  "query.provided-target",
] as const;

export const CORE_ACTION_IDS = [
  "action.start-ability-cooldown",
  "action.start-miss-cooldown",
  "action.emit-ability-used",
  "action.increment-quest-credit",
] as const;

export const CORE_EFFECT_IDS = [
  "effect.damage-from-ability",
  "effect.damage-fixed",
  "effect.heal-fixed",
  "effect.add-threat-fixed",
] as const;

function cloneParameters(parameters: GameplayParameters): GameplayParameters {
  return { ...parameters };
}

function operation(
  kind: GameplayOperation["kind"],
  primitiveId: StableId,
  environment: GameplayPrimitiveEnvironment,
  parameters: GameplayParameters,
): GameplayOperation {
  return {
    kind,
    primitiveId,
    graphId: environment.graph.id,
    nodeId: environment.node.id,
    sourceEntityId: environment.context.sourceEntityId,
    ownerPlayerId: environment.context.ownerPlayerId,
    abilityId: environment.context.abilityId,
    tick: environment.context.tick,
    targetEntityIds: [...environment.selectedTargetEntityIds].sort(),
    parameters: cloneParameters(parameters),
  };
}

export class MutableGameplayPrimitiveRegistry implements GameplayPrimitiveRegistry {
  readonly conditions = new Map<StableId, GameplayConditionPrimitive>();
  readonly targetQueries = new Map<StableId, GameplayTargetQueryPrimitive>();
  readonly actions = new Map<StableId, GameplayOperationPrimitive>();
  readonly effects = new Map<StableId, GameplayOperationPrimitive>();

  registerCondition(primitive: GameplayConditionPrimitive): this {
    if (this.conditions.has(primitive.id)) throw new Error(`Condition ${primitive.id} jest już zarejestrowane.`);
    this.conditions.set(primitive.id, primitive);
    return this;
  }

  registerTargetQuery(primitive: GameplayTargetQueryPrimitive): this {
    if (this.targetQueries.has(primitive.id)) throw new Error(`Target Query ${primitive.id} jest już zarejestrowane.`);
    this.targetQueries.set(primitive.id, primitive);
    return this;
  }

  registerAction(primitive: GameplayOperationPrimitive): this {
    if (this.actions.has(primitive.id)) throw new Error(`Action ${primitive.id} jest już zarejestrowane.`);
    this.actions.set(primitive.id, primitive);
    return this;
  }

  registerEffect(primitive: GameplayOperationPrimitive): this {
    if (this.effects.has(primitive.id)) throw new Error(`Effect ${primitive.id} jest już zarejestrowane.`);
    this.effects.set(primitive.id, primitive);
    return this;
  }
}

/**
 * Creates registry shells for the core language. Read operations are supplied by the host,
 * while action/effect planners remain pure and only produce typed operations.
 */
export function createCoreGameplayRegistry(read: {
  sourceAlive(environment: GameplayPrimitiveEnvironment): boolean;
  cooldownReady(environment: GameplayPrimitiveEnvironment): boolean;
  providedTargetIsMonster(environment: GameplayPrimitiveEnvironment): boolean;
  selectNearestHostile(environment: GameplayPrimitiveEnvironment, parameters: GameplayParameters): readonly string[];
  selectSource(environment: GameplayPrimitiveEnvironment): readonly string[];
  selectProvidedTarget(environment: GameplayPrimitiveEnvironment): readonly string[];
}): MutableGameplayPrimitiveRegistry {
  const registry = new MutableGameplayPrimitiveRegistry();
  registry
    .registerCondition({ id: "condition.source-alive", evaluate: (environment) => read.sourceAlive(environment) })
    .registerCondition({ id: "condition.cooldown-ready", evaluate: (environment) => read.cooldownReady(environment) })
    .registerCondition({ id: "condition.targets-present", evaluate: (environment) => environment.selectedTargetEntityIds.length > 0 })
    .registerCondition({ id: "condition.provided-target-is-monster", evaluate: (environment) => read.providedTargetIsMonster(environment) })
    .registerTargetQuery({ id: "query.nearest-hostile-in-range", select: (environment, parameters) => read.selectNearestHostile(environment, parameters) })
    .registerTargetQuery({ id: "query.source", select: (environment) => read.selectSource(environment) })
    .registerTargetQuery({ id: "query.provided-target", select: (environment) => read.selectProvidedTarget(environment) });

  for (const id of CORE_ACTION_IDS) {
    registry.registerAction({ id, plan: (environment, parameters) => [operation("action", id, environment, parameters)] });
  }
  for (const id of CORE_EFFECT_IDS) {
    registry.registerEffect({ id, plan: (environment, parameters) => [operation("effect", id, environment, parameters)] });
  }
  return registry;
}

import type { GameplayPrimitiveMetadata, GameplayPrimitiveKind } from "./types.js";

export const CORE_GAMEPLAY_PRIMITIVE_CATALOG: readonly GameplayPrimitiveMetadata[] = [
  { id: "condition.source-alive", kind: "condition", label: "Źródło żyje", description: "Przepuszcza wykonanie tylko, gdy aktor źródłowy żyje.", parameters: [] },
  { id: "condition.cooldown-ready", kind: "condition", label: "Cooldown gotowy", description: "Sprawdza gotowość aktualnej umiejętności źródła.", parameters: [] },
  { id: "condition.targets-present", kind: "condition", label: "Cel istnieje", description: "Sprawdza, czy poprzednie zapytanie wybrało co najmniej jeden cel.", parameters: [] },
  { id: "condition.provided-target-is-monster", kind: "condition", label: "Cel jest potworem", description: "Sprawdza przekazany cel zdarzenia lub testu.", parameters: [] },
  { id: "query.nearest-hostile-in-range", kind: "target-query", label: "Najbliższy wróg", description: "Wybiera najbliższego wroga w zasięgu i stożku patrzenia.", parameters: [
    { id: "rangeTiles", label: "Zasięg (kafle)", type: "number", required: false, min: 0, max: 64, step: 0.25, description: "Brak wartości używa zasięgu umiejętności." },
    { id: "minimumFacing", label: "Minimalny kierunek", type: "number", required: false, min: -1, max: 1, step: 0.05, description: "Iloczyn skalarny kierunku patrzenia i kierunku do celu." },
  ] },
  { id: "query.source", kind: "target-query", label: "Aktor źródłowy", description: "Wybiera aktora, który uruchomił graf.", parameters: [] },
  { id: "query.provided-target", kind: "target-query", label: "Przekazany cel", description: "Wybiera jawnie przekazany cel zdarzenia lub testu.", parameters: [] },
  { id: "action.start-ability-cooldown", kind: "action", label: "Uruchom cooldown", description: "Planuje pełny cooldown aktualnej umiejętności.", parameters: [] },
  { id: "action.start-miss-cooldown", kind: "action", label: "Cooldown pudła", description: "Planuje skrócony cooldown po braku celu.", parameters: [] },
  { id: "action.emit-ability-used", kind: "action", label: "Zdarzenie użycia", description: "Emituje ability.used po zatwierdzeniu planu.", parameters: [] },
  { id: "action.increment-quest-credit", kind: "action", label: "Dodaj postęp questa", description: "Dodaje drużynowy techniczny kill credit.", parameters: [
    { id: "amount", label: "Wartość", type: "number", required: false, defaultValue: 1, min: 0, max: 100000, step: 1, integer: true },
  ] },
  { id: "effect.damage-from-ability", kind: "effect", label: "Obrażenia umiejętności", description: "Zadaje obrażenia wynikające z power aktualnej umiejętności.", parameters: [] },
  { id: "effect.damage-fixed", kind: "effect", label: "Stałe obrażenia", description: "Zadaje celom stałą, nieujemną liczbę obrażeń.", parameters: [
    { id: "amount", label: "Obrażenia", type: "number", required: true, defaultValue: 10, min: 0, max: 100000, step: 1 },
  ] },
  { id: "effect.heal-fixed", kind: "effect", label: "Stałe leczenie", description: "Leczy wybrane cele o stałą wartość.", parameters: [
    { id: "amount", label: "Leczenie", type: "number", required: true, defaultValue: 10, min: 0, max: 100000, step: 1 },
  ] },
  { id: "effect.add-threat-fixed", kind: "effect", label: "Dodaj threat", description: "Dodaje stałą wartość threat wybranym celom.", parameters: [
    { id: "amount", label: "Threat", type: "number", required: true, defaultValue: 10, min: 0, max: 100000, step: 1 },
  ] },
] as const;

export function gameplayPrimitiveMetadata(id: StableId): GameplayPrimitiveMetadata | undefined {
  return CORE_GAMEPLAY_PRIMITIVE_CATALOG.find((entry) => entry.id === id);
}

export function gameplayPrimitivesByKind(kind: GameplayPrimitiveKind): readonly GameplayPrimitiveMetadata[] {
  return CORE_GAMEPLAY_PRIMITIVE_CATALOG.filter((entry) => entry.kind === kind);
}
