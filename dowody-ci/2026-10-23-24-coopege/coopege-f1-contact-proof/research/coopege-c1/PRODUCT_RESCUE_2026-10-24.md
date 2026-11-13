# Coopege · strategic rescue decision · 24 October 2026
**Authoritative for research direction only, not a new engine decision.** Owners' actual play feedback overrides tests and this memo.

## Verdict from the complete R0–C1 line
We have **demonstrated engineering competence at the wrong level**. Eight stacked experimental PRs R0→B5, then C1, conserved code and added scripted props but reduced the RPG dramatically versus 2026 Tibia v14.1. Owner stopped us multiple times: R0 worse as game, B3 cart somewhat improved but rest visually unacceptable, B4 still sloppy, old Tibia looked better. Not a problem cured by prettier tiling or one more fetched parcel. **C1 is an agency/kernel donor, not a selected product backbone.**

A1's 334k standalone host has 5 floors, 3 legacy classes, NPC trade/heal, gear, ability/quest loop, 45 authored encounter groups, 13 named entrances, original context and editor APIs. B1–C1 preserved only two NPC roles, one playable floor, selected 13 rats, simplistic combat and an experimental fetch errand. At the same time A1's 5 quests are all monster-kill counters, NPCs are hard-coded healer/merchant and classes/skills are fixed executors. **Rich older experience ≠ validated long-term architecture or desired combat.**

## Product contract: what a convincing next *playable* increment must demonstrate
A person enters Srebrna Brama and within a bounded ordinary play session recognises:
1. **An authored place worth remembering**: meaningful scale, landmarks, material assets, obvious points of interest and reasons to explore beyond one tile corridor. No random procedural wallpaper.
2. **A situated person with a credible purpose**, not a merchant menu or narrator quest marker. The player sees what that person knows, wants or physically needs, and the world supports a nontrivial interaction.
3. **A live predicament with ≥2 natural responses** (not a dialogue-choice modal or puzzle key): at least one changes a shared world fact; the alternative has different costs/risks; both remain plausible without teleporting state.
4. **A consequential return/revisit**: the original predicament and actor/world state are observably different, not merely +24 coins and a green completed banner.
5. **Movement, combat and readability that are enjoyable at real gameplay zoom.** Falsify with actual player use. An AI cannot self-certify fun.

No need to freeze target length, combat math, final art style, 2D/2.5D/3D or quest schema on paper. Owner enjoys discovering these through live prototypes.

## Competing routes (do not prematurely force a winner)
**A. A1-hosted experience control:** retain the existing authored world, NPCs, equipment and 5 floors while trying a deliberately isolated *new situation*. Fastest way to compare gameplay without reconstructing every system, but old monolith, scripted actor types and kill-only quests may block meaningful new behavior. Prove/measure those blockers, not assume compatibility.
**B. C1-independent runtime control:** already has bounded material contact, last-seen AI, static source witness and repeatable standalone build; rich game/content/world drastically incomplete. Cannot win by incrementally reimplementing 5 floors and 300 assets without a compelling reason.
**C. Hybrid donor-led reconstruction:** retain source-authored data/scene and mature game-facing systems as **donor modules**, build new explicit boundaries for persistent material/social actors and their presentation. Attractive hypothesis but high integration risk; only advance via one bounded real playable authored scene, not generic ECS/engine.

**Current direction:** favour A as **fast experimental host**, C as **serious longer-term hypothesis**, keep B as selective interaction donor. This is a scheduling judgment, *not product architecture promotion*.

## What previous agents misunderstood
- Old Tibia's richness came from a complete player-facing loop: class distinction, movement, abilities, enemies, equipment, NPC interactions, named places, authored travel, rewards and UI presence. Code structure is poor, but the total *experience* is our existing competitive baseline.
- User does **not** want to preserve its old rigid classes, five kill-count quests, terrain, death loop, skill executors, UI or renderer as sacred.
- The user previously described scarcity, gear, carried things, physical proximity, and creative play as important; social/material causality matters more than physics for its own sake. Co-op important long-term but not day-one schedule controller.
- The 45 atlas assets are historical placeholders, not final art. B4 noise and B5 re-embedding do not constitute art direction.
- Experience alternatives from [Necesse](https://www.necessegame.com/), [Secrets of Grindea](https://www.secretsofgrindea.com/), [Stoneshard](https://stoneshard.com/) demonstrate distinct coherent relationships between visible world, meaningful actions and reasons to return. Inspirations, **not architecture or feature checklists**, and not evidence of what Owner will like.

## First executed A1 host viability experiment
Exact source code and original Chrome host were tested, not inferred from roadmap:
- Original 5-floor / 200×200 world, 45 groups, 13 entrances, 2 NPC roles are preserved; a south-gate label edit validates, imports and reverses.
- **Structural roundtrip FAIL:** `importMapPackage` normalizes absent group `eliteCount` into explicit `0`. This affects group metadata representation, not authored geometry or observed spawn semantics. Compare with a **scoped semantic canonicalization**, but keep a raw structural drift signal and original export copy. Do not call the format byte-stable.
- A courier/retrieval quest with `tk: 'courier_parcel'` is rejected: quest validator only allows a known monster type. The 5 original quests are kill-count contracts.
- A brand-new warrior talent `carry_strength` validates with a warning that it has NO executor. New labels/metadata are not new gameplay.
- Custom NPC role `courier` passes the map schema, although old `drawNPCWindow` dispatches only healer vs everything-else-merchant. This is a **semantic validation gap**, not credible extensibility.
**Interpretation:** A1 can rapidly host authored *map* trials and old RPG context; it is **not an adequate system for genuinely new NPC/quest/skill behaviors without targeted runtime modification**. Crucial difference between authoring place and authoring gameplay. Detailed probe evidence: `research/coopege-c1/donor-viability.browser.mjs`, `.build/coopege-c1/a1-authoring-feasibility.json` in exact-HEAD CI artifact.

## Completed evidence gate: actual Chrome
[Run #40032458453](https://github.com/Jozzpoly/Coopege/actions/runs/40032458453) for the executable/probe SHA `91e72a52f26c5c188ea71e36bd9d73ebcb506ee3`: **PASS** for C1 authored witness, Node contracts, natural Chrome route, A1 comparison, and donor authoring boundary probe. The two preceding red runs were real: a strict map equality test failed, then a naive key-order-sensitive canonicalizer failed. Diagnostic evidence revealed precisely `eliteCount` absent → zero and object field insertion order changes in `normalizeSpawnGroup`. Audited semantic canonicalization normalizes ONLY absent `eliteCount` to 0 and sorts object keys; no other game values are suppressed. Raw export still differs and remains explicitly FAIL.

Static source inspection adds another critical limiter: ordinary A1 player save packages player, quest and settings, not dynamic world actor states. The project/map authoring API is separate. This supports not promoting A1 as a drop-in living-world runtime.

## High-value tests before any more game system production
1. **This repo's executable A1 donor-authoring viability test:** import + restore a benign authored label via original map API, recover same baseline; inspect existing content validation for a non-kill retrieval quest and unimplemented new talent behavior. Evidence reveals whether A1 can be used as a quick source-rich experimental host *and* where it is semantically closed.
2. **Content-authoring boundary, not another renderer:** demonstrate one isolated authored place using original authoring/project formats, with real NPC or world state that can do something beyond healer/merchant and kill counters. If impossible without hacking monolithic globals, **stop A1-hosting** and select a minimal hybrid seam; do not accumulate patches.
3. **Actor/scene system and art direction review:** use real standalone screenshots and Owner feedback to compare distinct coherent compositions at actual play scale; not another particle/gradient pass.
4. **Actual gameplay on same route:** A1 richer baseline must remain available with its class/gear/NPC loop. Compare credible alternative, not just matching y-coordinate. Record what survives, what changed, what failed; a green test can't promote the game.
5. **Authoring roundtrip:** change → inspect in game → save/reopen → revert without custom hand edits. A next-generation Studio loop matters only when it speeds producing richer experiences.

## Run discipline / stop conditions
**One active campaign:** use `research/coopege-c1/ACTIVE.md` to recover Owner intent, exact HEAD, CI, last good game, FAILs and next bounded challenge. No fresh branch/PR for every test. Prefer grouped atomic commits and scoped CI; preserve old Tibia, main, Feniks, Jaskinia.
**One experiment = one decision-changing question.** A1 authoring test answers whether its tooling can host genuinely new episodes. If the answer is 'labels and kill quests only', don't keep hacking legacy monolith. If C1 still gives little actual game after serious scene authoring, stop promoting it. Don't generate a new version for a marginal mechanism PASS.
**Owner attention is scarce**: give one meaningful standalone playable candidate only after sustained comparative testing; short 'what changed/what failed/why it matters' reporting.
**No imaginary background autonomy**: 'long self-directed run' means keep working within an active conversation until reaching a meaningful checkpoint. At termination leave code, exact source and candid status. Never imply future invisible execution.

## Known, open, and false certainty
**Grounded:** A1 and C1 code and prior exact-HEAD Chromium runs; older source lore; explicit user negative feedback; schema validator for quests references monster IDs; warnings for new talent IDs. **Pending:** whether positive A1 map/project roundtrip succeeds under exact Chromium, whether custom actor roles can be authored usefully, actual human game feel, final camera/2D/3D choice.
**False:** "B5 restored the game", "C1 is a suitable new engine", "A1 code is the long-term foundation", "we can solve the world by writing 5 new quests", "more tests prove visual quality".
