import type {
  AbilityDefinition,
  AbilityDefinitionV1,
  CoopegeProject,
  CoopegeProjectInput,
  CoopegeProjectV1,
  GameplayBindingDefinition,
  GameplayGraphDefinition,
  GameplayTriggerDefinition,
  StableId,
} from "./types.js";

function graphIdForAbility(abilityId: StableId): StableId {
  const suffix = abilityId.startsWith("ability.") ? abilityId.slice("ability.".length) : abilityId;
  return `graph.ability.${suffix}`;
}

function bindingIdForAbility(abilityId: StableId): StableId {
  const suffix = abilityId.startsWith("ability.") ? abilityId.slice("ability.".length) : abilityId;
  return `binding.ability.${suffix}`;
}

/** Safe default graph used only for explicit project schema migration. */
export function createDefaultAbilityGraph(ability: AbilityDefinitionV1): GameplayGraphDefinition {
  const id = graphIdForAbility(ability.id);
  return {
    id,
    name: `${ability.name} — migracja v1`,
    entryNodeId: "node.source-alive",
    nodes: [
      { id: "node.source-alive", kind: "condition", conditionId: "condition.source-alive", onTrue: "node.cooldown-ready", onFalse: "node.end" },
      { id: "node.cooldown-ready", kind: "condition", conditionId: "condition.cooldown-ready", onTrue: "node.targets", onFalse: "node.end" },
      { id: "node.targets", kind: "target-query", queryId: "query.nearest-hostile-in-range", next: "node.has-target" },
      { id: "node.has-target", kind: "condition", conditionId: "condition.targets-present", onTrue: "node.cooldown", onFalse: "node.miss-cooldown" },
      { id: "node.cooldown", kind: "action", actionId: "action.start-ability-cooldown", next: "node.emit" },
      { id: "node.emit", kind: "action", actionId: "action.emit-ability-used", next: "node.damage" },
      { id: "node.damage", kind: "effect", effectId: "effect.damage-from-ability", next: "node.end" },
      { id: "node.miss-cooldown", kind: "action", actionId: "action.start-miss-cooldown", next: "node.end" },
      { id: "node.end", kind: "end" },
    ],
  };
}

export function createFoundationGameplayGraphs(): GameplayGraphDefinition[] {
  return [
    {
      id: "graph.item.healing-tonic",
      name: "Efekt przedmiotu: mikstura treningowa",
      entryNodeId: "node.source",
      nodes: [
        { id: "node.source", kind: "target-query", queryId: "query.source", next: "node.heal" },
        { id: "node.heal", kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 10 }, next: "node.end" },
        { id: "node.end", kind: "end" },
      ],
    },
    {
      id: "graph.talent.guardian-focus",
      name: "Modyfikator talentu: skupienie strażnika",
      entryNodeId: "node.source",
      nodes: [
        { id: "node.source", kind: "target-query", queryId: "query.source", next: "node.heal" },
        { id: "node.heal", kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 3 }, next: "node.end" },
        { id: "node.end", kind: "end" },
      ],
    },
    {
      id: "graph.ai.training-attack",
      name: "Akcja AI: kontrolowany atak",
      entryNodeId: "node.target",
      nodes: [
        { id: "node.target", kind: "target-query", queryId: "query.provided-target", next: "node.has-target" },
        { id: "node.has-target", kind: "condition", conditionId: "condition.targets-present", onTrue: "node.damage", onFalse: "node.end" },
        { id: "node.damage", kind: "effect", effectId: "effect.damage-fixed", parameters: { amount: 5 }, next: "node.end" },
        { id: "node.end", kind: "end" },
      ],
    },
    {
      id: "graph.quest.monster-kill-credit",
      name: "Reakcja questa: zalicz pokonanego potwora",
      entryNodeId: "node.monster",
      nodes: [
        { id: "node.monster", kind: "condition", conditionId: "condition.provided-target-is-monster", onTrue: "node.credit", onFalse: "node.end" },
        { id: "node.credit", kind: "action", actionId: "action.increment-quest-credit", parameters: { amount: 1 }, next: "node.end" },
        { id: "node.end", kind: "end" },
      ],
    },
    {
      id: "graph.map.healing-sigil",
      name: "Trigger mapy: leczniczy znak",
      entryNodeId: "node.source",
      nodes: [
        { id: "node.source", kind: "target-query", queryId: "query.source", next: "node.heal" },
        { id: "node.heal", kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 8 }, next: "node.end" },
        { id: "node.end", kind: "end" },
      ],
    },
  ];
}

export function createFoundationGameplayBindings(): GameplayBindingDefinition[] {
  return [
    { id: "binding.item.healing-tonic", domain: "item-effect", graphId: "graph.item.healing-tonic" },
    { id: "binding.talent.guardian-focus", domain: "talent-modifier", graphId: "graph.talent.guardian-focus" },
    { id: "binding.ai.training-attack", domain: "ai-action", graphId: "graph.ai.training-attack" },
    { id: "binding.quest.monster-kill-credit", domain: "quest-reaction", graphId: "graph.quest.monster-kill-credit" },
    { id: "binding.map.healing-sigil", domain: "map-trigger", graphId: "graph.map.healing-sigil" },
  ];
}

export function createFoundationGameplayTriggers(): GameplayTriggerDefinition[] {
  return [
    {
      id: "trigger.quest.actor-died",
      domain: "quest-reaction",
      event: "actor.died",
      graphId: "graph.quest.monster-kill-credit",
      enabled: true,
    },
  ];
}

export function migrateProjectV1ToV2(project: CoopegeProjectV1): CoopegeProject {
  const abilities: AbilityDefinition[] = project.content.abilities.map((ability) => ({
    ...ability,
    graphId: graphIdForAbility(ability.id),
  }));
  const graphs = [
    ...project.content.abilities.map(createDefaultAbilityGraph),
    ...createFoundationGameplayGraphs(),
  ];
  const bindings: GameplayBindingDefinition[] = [
    ...project.content.abilities.map((ability) => ({
      id: bindingIdForAbility(ability.id),
      domain: "ability" as const,
      graphId: graphIdForAbility(ability.id),
    })),
    ...createFoundationGameplayBindings(),
  ];
  return {
    ...structuredClone(project),
    schemaVersion: 2,
    content: {
      ...structuredClone(project.content),
      abilities,
    },
    gameplay: {
      schemaVersion: 1,
      executionBudget: 64,
      graphs,
      bindings,
      triggers: createFoundationGameplayTriggers(),
    },
  };
}

export interface ProjectMigrationResult {
  project: CoopegeProject;
  migratedFromVersion: 1 | null;
}

export function migrateProjectToLatest(project: CoopegeProjectInput): ProjectMigrationResult {
  if (project.schemaVersion === 2) return { project: structuredClone(project), migratedFromVersion: null };
  return { project: migrateProjectV1ToV2(project), migratedFromVersion: 1 };
}
