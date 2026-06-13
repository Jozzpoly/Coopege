import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

function graphIdForAbility(id) {
  return `graph.ability.${id.startsWith("ability.") ? id.slice(8) : id}`;
}
function bindingIdForAbility(id) {
  return `binding.ability.${id.startsWith("ability.") ? id.slice(8) : id}`;
}
function abilityGraph(ability) {
  return {
    id: graphIdForAbility(ability.id),
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
function foundationGraphs() {
  return [
    { id: "graph.item.healing-tonic", name: "Efekt przedmiotu: mikstura treningowa", entryNodeId: "node.source", nodes: [
      { id: "node.source", kind: "target-query", queryId: "query.source", next: "node.heal" },
      { id: "node.heal", kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 10 }, next: "node.end" },
      { id: "node.end", kind: "end" },
    ] },
    { id: "graph.talent.guardian-focus", name: "Modyfikator talentu: skupienie strażnika", entryNodeId: "node.source", nodes: [
      { id: "node.source", kind: "target-query", queryId: "query.source", next: "node.heal" },
      { id: "node.heal", kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 3 }, next: "node.end" },
      { id: "node.end", kind: "end" },
    ] },
    { id: "graph.ai.training-attack", name: "Akcja AI: kontrolowany atak", entryNodeId: "node.target", nodes: [
      { id: "node.target", kind: "target-query", queryId: "query.provided-target", next: "node.has-target" },
      { id: "node.has-target", kind: "condition", conditionId: "condition.targets-present", onTrue: "node.damage", onFalse: "node.end" },
      { id: "node.damage", kind: "effect", effectId: "effect.damage-fixed", parameters: { amount: 5 }, next: "node.end" },
      { id: "node.end", kind: "end" },
    ] },
    { id: "graph.quest.monster-kill-credit", name: "Reakcja questa: zalicz pokonanego potwora", entryNodeId: "node.monster", nodes: [
      { id: "node.monster", kind: "condition", conditionId: "condition.provided-target-is-monster", onTrue: "node.credit", onFalse: "node.end" },
      { id: "node.credit", kind: "action", actionId: "action.increment-quest-credit", parameters: { amount: 1 }, next: "node.end" },
      { id: "node.end", kind: "end" },
    ] },
    { id: "graph.map.healing-sigil", name: "Trigger mapy: leczniczy znak", entryNodeId: "node.source", nodes: [
      { id: "node.source", kind: "target-query", queryId: "query.source", next: "node.heal" },
      { id: "node.heal", kind: "effect", effectId: "effect.heal-fixed", parameters: { amount: 8 }, next: "node.end" },
      { id: "node.end", kind: "end" },
    ] },
  ];
}
function upgrade(project) {
  if (project.schemaVersion === 2) return project;
  if (project.schemaVersion !== 1) throw new Error(`Nieobsługiwana wersja ${project.schemaVersion}`);
  const abilities = project.content.abilities.map((ability) => ({ ...ability, graphId: graphIdForAbility(ability.id) }));
  return {
    ...project,
    schemaVersion: 2,
    content: { ...project.content, abilities },
    gameplay: {
      schemaVersion: 1,
      executionBudget: 64,
      graphs: [...project.content.abilities.map(abilityGraph), ...foundationGraphs()],
      bindings: [
        ...project.content.abilities.map((ability) => ({ id: bindingIdForAbility(ability.id), domain: "ability", graphId: graphIdForAbility(ability.id) })),
        { id: "binding.item.healing-tonic", domain: "item-effect", graphId: "graph.item.healing-tonic" },
        { id: "binding.talent.guardian-focus", domain: "talent-modifier", graphId: "graph.talent.guardian-focus" },
        { id: "binding.ai.training-attack", domain: "ai-action", graphId: "graph.ai.training-attack" },
        { id: "binding.quest.monster-kill-credit", domain: "quest-reaction", graphId: "graph.quest.monster-kill-credit" },
        { id: "binding.map.healing-sigil", domain: "map-trigger", graphId: "graph.map.healing-sigil" },
      ],
      triggers: [
        { id: "trigger.quest.actor-died", domain: "quest-reaction", event: "actor.died", graphId: "graph.quest.monster-kill-credit", enabled: true },
      ],
    },
  };
}
function processFile(inputRelative, outputRelative) {
  const input = resolve(root, inputRelative);
  const output = resolve(root, outputRelative);
  const project = JSON.parse(readFileSync(input, "utf8"));
  const latest = upgrade(project);
  writeFileSync(output, `${JSON.stringify(latest, null, 2)}\n`);
  console.log(`Zapisano schema v2: ${outputRelative}`);
}

const [input = "project/project.json", output = input] = process.argv.slice(2);
processFile(input, output);
