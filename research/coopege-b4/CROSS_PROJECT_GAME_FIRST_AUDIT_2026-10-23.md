# COOPEGE — Game-first cross-project reset after Owner visual FAIL
**23 October 2026 · research checkpoint / NOT architecture decision or new GDD**

## Why this exists
Owner: after B3 the movable box/cart became "sensowniejsza, choć nie idealna", while **the rest of the game looked terrible**. After B4's visual-only pass, Owner: **"jest lepiej. ale nadal na odpierdol. weź szerzej popatrz, użyj opery. sprawdź resztę naszych projektów. no bo narazie to stara nasza tibia wyglądała lepiej."**

This is not a request for prettier random terrain noise or an excuse for another disposable engine. It is a verdict about **overall playable quality**: world composition, visual identity, scale, game vocabulary, activities, interaction, rewards, clarity, atmosphere and authoring. Stop narrowing the problem to `view.js`.

## Sources actually inspected
- Via Opera tabs: live Jaskinia materials/workbench, Mira i Ty live shared-world surface, current Splot and MiniFeniks/Feniks conversations, work on Medium/Jaskinia and Opus. Browser access gives current visible states, **not complete archival retrieval** of every project/conversation. Some conversations lazily load older messages. Do not claim exhaustive coverage.
- Via connected GitHub: Coopege main legacy references + actual asset migration, renderer, sprite-layout, Asset Browser, roadmap/soul, archived PNG screenshots; source A1 and B4, B0 provenance; repository trees / README or key docs of Mini_Feniks, Feniks-Studio, Splot, Companion-Brain-Lab, Combat-Lab, ReflexBrain-Lab, Jozz-Cave-Workbench, Llm-Live-NPC, Tysi-c-The-Game.
- Real same-area A1 versus B4 Chromium screenshots: [B4 successful browser evidence](https://github.com/Jozzpoly/Coopege/actions/runs/40020853490) (the uploaded screenshot artifact will expire). Permanent historical Coopege [M3 assets screenshot](https://github.com/Jozzpoly/Coopege/blob/main/docs/testing/screenshots/M3_Silver_Gate_Assets.png), [M7 gameplay screenshot](https://github.com/Jozzpoly/Coopege/blob/main/docs/testing/screenshots/M7_Final_Real_Controls_Stairs.png).
- A1 historical reference: [Tibia Enhanced v14.1](https://github.com/Jozzpoly/Coopege/blob/main/legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html), actual donor-rich [PR #2](https://github.com/Jozzpoly/Coopege/pull/2), [B0 semantic-loss evidence PR #3](https://github.com/Jozzpoly/Coopege/pull/3), [B3 direct contact PR #6](https://github.com/Jozzpoly/Coopege/pull/6), visual-only [PR #7](https://github.com/Jozzpoly/Coopege/pull/7).

## Correction about legacy assets
Initial surface-level count was 109 PNG paths in Coopege main. That is NOT 109 independently authored game sprites: **45 unique atlases** are copied both into `project/migration/legacy-v14.1/assets/` and `dist/Coopege_M7A_Asset_Vault/textures/`, plus historical screenshot files. M7A manifest declares `assetCount:45`, with `status:legacy-placeholder` for the legacy pack. Each atlas includes concrete dimensions, pivots and animation/frame variants; old sprites are real donor *evidence*, not an automatically professional art solution.

The old game does more than display PNGs:
- Tibia v14.1 source has deterministic map composition, terrain variation, character and creature visual logic, scene labeling, action/attack effects, authored transitions, separate floor rendering, camera and minimap, and integrated RPG information. The old single-file implementation is not a reusable architecture. The underlying experience is important.
- M7 `apps/runtime/src/renderer.ts` + `sprite-layout.ts` contains prior effort to render assets correctly, animate direction frames, choose stable terrain variants and fix cutoff/pivots. ADR-0016 explains a real Owner-driven distinction: terrain variants are *not* movement animation, player frames needed padding.
- B4, despite technical green tests, returned to procedurally drawn tiny figures, patchwork tiles and an austere one-floor empty corridor. It preserved only one fragment of the map/encounter and did not use original visual semantics or content loops. That is deliberate impoverishment, not a modern alternative proving superiority.

## Same-place screenshot comparison — actual observations, not aesthetics by decree
A1 and B4 were screenshot at 1440x1000 and same source start area; internal zoom/render grammar differ, so this is a **product contrast, not pixel-equivalent image benchmark**.
- A1: readable humanoid actor equipped with gear, walls/roads/grassy fringes, named geography, NPC, quest target, minimap, combat/progression affordances. Overladen HUD and primitive authored art remain major defects; no claim it is the desired quality ceiling.
- B4: broader, cleaner play canvas but less meaningful visual hierarchy, unrecognizably tiny player/creatures, very large visually uniform areas, generic materials, no persistent purpose beyond pushing a cart, no actual RPG progression, no sense of world outside the single route.
- Both lack modern artistic cohesion and would need work; **Owner's current preference for old Tibia is supported by the contrast**, not overruled by visual-polish claims.
- Don't confuse art differences with differences in authored object/world data. One visual renderer cannot recover missing NPC behavior, quest content, ecology, level topology or purpose.

## Cross-project donor map — evidence, eligibility, exclusions
| Source | Actual relevant donor | Status / what NOT to do |
|---|---|---|
| Tibia v14.1 / A1 | Playable RPG density, coherent player-facing actions, professions/gear as reference, named NPCs, quests, 5 floors, region transitions, historic visual atlas language, editor loop | **Highest current playable reference**. Do NOT blindly inherit monolith, exact classes/combat, kill-X design, graphics as final, forced floor split |
| Coopege M7 / Studio | Already migrated and validated 45 texture atlases, layer/direction metadata, Asset Browser, authored project, map editor and standalone export | Use exact audited donors; B0 demonstrated that matching 200,000 tile coordinates/338 spawns != preserving authored roles/encounters/quests. LAN-first roadmap superseded by current Owner solo-first priority |
| B3 | Continuous body-contact and pointer-guided cart with shared collision/sight/save | Owner cautiously positive. Keep **isolated prototype**, do not impose B3 primitive circular contacts on whole RPG |
| Mini_Feniks | Authored landscape + ordinary life / local concerns, lasting world consequences, carrying/handling with finite forces and knowledge, authoring→inhabit→revise | Strong *design/evidence* donor, not direct engine or art-pack import. Different autonomy/universe; source README says visual beauty still under evaluation |
| Feniks-Studio | Author-owned creation of places from visual materials; multiple tools can coexist in one workspace | Current repo mainly design/spec; **proposal not shipped gameplay engine**. No premature new editor project |
| Splot | Persistent material effects and authoring, controllable bodies, 2.5D sight/display conflicts; Owner mobile UI fail teaches interaction gates | Donor of falsification methods and selected physics, **not finished RPG visuals** or engine |
| Companion-Brain-Lab / ReflexBrain-Lab / Combat-Lab | Perception ownership, non-telepathic actions, visible causal debugging, embodied behaviors and research anti-patterns | Research donors for future actor ecology, not decoration/quick AI import. Existing Owner FAILs remain |
| Llm-Live-NPC (Mira i Ty in Opera) | NPC presence, dialogue, own situated world, memory/knowledge boundary | Visually simple lab; does not solve Coopege art. LLM not prerequisite for the game |
| Jaskinia / Medium | Low-friction access to living builds, retained experiences, simple continuation/visibility to Owner and agents | Distribution/authoring affordance, **not competing game runtime**, no auto-deploy and no technical monolith |
| Tysi-c-The-Game | Tangible UI/readable affordances, game presentation, the need to protect the golden human experience against regressions | Design principles rather than RPG graphics/code. Its release constraints are unrelated |

## More precise causal diagnosis of the failed B1→B4 path
1. We forked a tiny new runtime on a real but **semantically under-filled** world witness: B1-B4 kept the south group of five rats instead of an actual authored adventure. Name and coordinates alone don't create a place.
2. Our design energy went into proving technical materiality (push, occlusion, save) and CI screenshots. Owner asked for a *game*, and this was one prop.
3. The visual candidates improvised glyph-like silhouettes rather than leveraging existing well-understood character/art grammar. B4 attempted procedural shader-like improvements without art direction or composition.
4. We treated equivalent arrival at y~99 as evidence of comparable journeys. It only proves traversal. A1 offers many more behaviors and signals from that same journey.
5. We over-serialised drafts: R0/A1/B0/B1/B2/B3/B4, each cleanly separated but little improvement in cumulative player-visible RPG. Each additional candidate should have a **disconfirming product test**, not just more branches.
6. Old Tibia had recognisable movement, feedback, populated economy and geography but also deep architectural and gameplay defects. Both absolutist responses are wrong: neither copy the legacy monolith nor abandon its experiential value.

## Decision for NEXT substantive stage (proposed test, not implementation completed)
**Stop B4 cosmetic line.** No B5 themed paint layer, no grand engine rewrite, no automatic blending of other projects.
1. **Create an honest reference comparison** from old playable Tibia/A1, old M7 and B3 on the *same region and authored purpose*. Capture actual ordinary player input for arrival, interaction, threat, healing/shop, reward, return. State what is not directly comparable.
2. **Define one authored 'Srebrna Brama → south trail → meaningful return' episode.** This must contain a legible approach, character scale/identity, recognised landmarks, purposeful environmental props, at least one resident with a real reason to be there, an encounter/predicament with choices that materially matter, readable risks and consequences that survive leaving/revisiting. Use existing source lore/roles; avoid random new quests, kill-counter placeholders or arbitrary moral scripts.
3. **Art-direction test at actual gameplay zoom before system implementation**: 1 coherent authored scene, proper player silhouette and animations, town/road/nature transition, actors/equipment/effects, visibility and readable light/material palette. Compare *three paths*: legacy sprite-grammar as control, contemporary coherent authored/sprite/scene grammar as new candidate, and optionally a 2.5D style after a specific reason. Don't automatically settle the underlying world dimensionality.
4. Reconnect validated mechanics (B3 cart if valuable, old RPG interactions if still desirable) to the chosen experience rather than building features in a void. Use real visual test and Owner short play before promoting.
5. Keep a failure gate: if a scene is only prettier but has no plausible adventure, return to product design; if systems are impressive but not fun or comprehensible, delete/rework them. CI green is necessary but never substitutes human gameplay.
6. Once the actual experience wins, select project architecture via measured reuse/complexity and authoring round-trip. **Never impose a new canonical runtime before value is shown.**

## Immediate anti-goals
No changes to `main`, old Tibia source, A1, Feniks or Jaskinia from this audit. No claim full Opera chat history was recovered. No new generic engine, no LAN or networking scope, no quick art-pack import presented as 'looks fixed', no fake world liveliness from gradient noise, no huge player-facing process reports.

**Owner goal:** one independent Coopege worth exploring and showing others, exceeding old Tibia in lived experience while leaving its obsolete implementation behind. B3 cart is a donor, not the game's reason to exist.
