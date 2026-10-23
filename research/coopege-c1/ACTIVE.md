# COOPEGE — ACTIVE / point of resumption
**23.10.2026 · C1 research branch, not main authority until promoted.**
This file is for the next agent. Read FIRST, then read the actual HEAD, tests, Owner feedback and current artifacts. Do not treat a future HEAD as identical to this checkpoint.

## Owner truth (order matters)
1. Coopege is a **game and owned world**, not an engine/benchmark. Goal: self-contained RPG richer, more compelling and recognisable than old Tibia v14.1, with meaningful exploration, actors, mechanics, atmosphere, progression, original content and future co-op. Technical architecture, graphics and combat are replaceable, not sacred. Avoid quick unfinished minigames.
2. R0 Owner test, 22 Oct: technical R0 played far worse than legacy. B1/B2 also lacked RPG meaning; B3 continuous-cart interaction became **somewhat sensible but not ideal**, while **everything else looked terrible**. B4 improved appearance slightly but still "na odpierdol"; old Tibia looked better. The Owner repeatedly redirected from locally green mechanisms to the actual experience.
3. B5 adds a working return loop, but it is a tiny scripted courier quest, 13 rats, 2 NPCs, old placeholder atlases. No Owner gameplay verdict. **CI PASS ≠ product PASS; aesthetic and depth still FAIL** by agent's own screenshot review.
4. Owner specifically asks much more autonomous, **longer run cycles** with context recovery, ongoing self-evaluation, few Owner prompts and succinct, layered reporting. An isolated commit/CI milestone is NOT a reason to stop. The next 'kontynuuj' means resume actively without asking to re-explain.
5. Future Jaskinia/Studio integration is an experiential bridge, not a mandatory monolithic architecture or license to redeploy. Preserve old game and main. No rushing M8 LAN to pretend product progress.

## Live GitHub pointers, verify exact SHA
- Protected historical old Tibia reference: `legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html`, or richer A1 donor [PR #2](https://github.com/Jozzpoly/Coopege/pull/2) pinned `c8bc9f1117e32f6db5940a565c905569e95692b9`.
- Source-authored B0 [PR #3](https://github.com/Jozzpoly/Coopege/pull/3): 200k/200k 2D tiles and 338/338 placements migrated, but 2 NPC roles, 5 quest definitions, 13 named entrances, 45 explicit encounter groups lost. Do not conflate coordinates with semantic RPG content.
- B1/B2 [PR #4](https://github.com/Jozzpoly/Coopege/pull/4) / [#5](https://github.com/Jozzpoly/Coopege/pull/5): primitive independent world, fixed tick input, last-witnessed rat positions.
- B3 [PR #6](https://github.com/Jozzpoly/Coopege/pull/6): contact-based continuous cart, close-range mouse guide, limited collision, save. **Owner cautiously positive**, still not full physics.
- B4 [PR #7](https://github.com/Jozzpoly/Coopege/pull/7): visual rendering experiment — not product-approved.
- B5 [PR #8](https://github.com/Jozzpoly/Coopege/pull/8): 1 authored city-nearby scene and original bounty + explicitly invented delivery satchel and return. Historical atlas assets, legacy shops/healer, single HTML, **last exact-HEAD PASS** [GitHub Actions #40026581032](https://github.com/Jozzpoly/Coopege/actions/runs/40026581032) SHA `bd961b81bc493a3cb941c58271af6100fddb63de`. This SHA is the C1 base.
- B4 [cross-project audit](../coopege-b4/CROSS_PROJECT_GAME_FIRST_AUDIT_2026-10-23.md) — MiniFeniks world/life and limited physics; Splot material interactions; Companion/Reflex/Combat actor cognition; Studio authored places; Jaskinia distribution. These are donors **not automatic imports**.
- Root project docs `docs/product/COOPEGE_SOUL.md` include outdated M8-first guidance; **recent explicit Owner gameplay feedback outranks that roadmap**.

## Why repeated large runs misfired
8 open experimental PRs and multiple temporary locally generated standalone HTMLs, but no persistent working game judgement. Most B1-B5 energy went to coordinate, mechanics, fixed tick, collision, tests, screenshots, HUD, sequential paint; the actual game was impoverished relative to legacy. Owner had to repeatedly veto speculative direction. A1 was compared too late; new bugs were sometimes introduced in tests and repaired; old CI PASS was occasionally for non-HEAD commits. Each subturn ended on a polished recap, which shifted orchestration back to Owner. Good unit tests are not a substitute for plausible play value.

## New run discipline — ONE ACTIVE CAMPAIGN, not a rigid bureaucracy
**Before coding:** recover current HEAD + CI + outstanding Owner negative feedback + compare against both A1 richer control and B3 interaction control. Identify the one most material missing *player experience* and a falsifier. If an experiment worsens the total game, keep it isolated or abandon.
**While working:** always distinguish source truth / measured running result / analysis / unproven feel. After a bounded mechanism PASS, continue with gameplay, negative-path tests, real Chrome, screenshots and comparison until a meaningful campaign checkpoint, not until one green unit test. Stop a line that only adds procedural rendering/empty infrastructure.
**Periodically:** refresh this same `ACTIVE.md` (do not create a new report for every minor commit), link only exact run/HEAD; one concise human update when key outcome changes, no Owner micro-decisions.
**At a session boundary:** ensure protected branches untouched, source/builder/tests reproducible and exact-HEAD CI verified; preserve a useful runnable candidate, what failed, what would disconfirm next direction, and the concrete next action.
**Owner-facing:** lead with product truth, visible difference, evidence, risk, next action; no wall of logs.
**Reality limit:** no asynchronous/background agent work after the response. Long autonomous runs mean carrying work through the active turn, not promising future invisible execution.

## Current C1 move — execution status
**C1 source split: PASS.** Six source-owned modules (`src/core.js`, `episode.js`, `view.js`, `atlas.js`, `witness.json`, `bootstrap.js`), an HTML shell, and deterministic `build.mjs`. Rebuilt artifact was **byte-for-byte identical** with B5 before gameplay changes; initial exact-HEAD [Chrome+Node PASS #40027781864](https://github.com/Jozzpoly/Coopege/actions/runs/40027781864). Gameplay changes follow this known-good fork; do NOT keep asserting byte parity afterward.

**Actual next agency increment, now in C1 source (qualification pending at time of this edit):** Q places the carried courier parcel in the world without grid snapping; the player can leave it, save/load, return and pick it up from its observed location, never remotely. Cargo is drawn on the hero. One-time merchant delivery still pays 24 coins, then ordinary shop trade works again. The merchant no longer claims the rat-infested road is safe because a parcel arrived. Simultaneous E/Q prioritises interaction and does not silently forfeit the delivery. Save schema v4 and C1 localStorage are separate from B5.

**Natural alternate routes verified in exact local JS kernel, Chrome recheck pending:** walking S toward the south gate physically pushes the cart from y99.5 past y103; detouring east first retrieves the same parcel without touching the cart at y99.5. No choice prompt or actor teleport. Different saved world history is the point; no proof of fun or rich adventure follows automatically.

**Evidence gates in C1 workflow:** original Tibia API source recovery, authored witness parity (ignore ONLY volatile exportedAt timestamp), Node quest/parcel/route tests, 1 complete Chrome trip with E/Q/save/load/merchant, 1 Chrome detour, independent SHA-pinned A1 same-place Chrome control, screenshots and source provenance. Cancel redundant in-flight runs for non-head commits. **Do not claim full PASS until exact current SHA completes.**

**Next autonomous move after CI:** read actual run status/logs and screenshots; repair only meaningful reproducible faults. Contrast A1 and C1 visually and functionally. Decide whether further work on C1 total game experience is justified or whether focus should shift toward reclaiming A1 richness in a new execution model. The next substantial stage must address authored world/actors/visual identity; another tiny cart or shader feature is explicitly not a sufficient milestone. Do NOT open yet another draft PR merely to mark a stage.

**Runtime qualification boundary:** locally generated bundled C1 can be checked in Node. This work environment's local Chromium restricts HTTP localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`), so browser proof depends on reproducible GitHub Actions, not imagined local screenshots. Physical Owner playtest is still absent.

## Next open questions (must be answered by evidence, not slogans)
- Can a materially grounded decision (e.g. carrying, dropping, hiding, routing, using the cart) change the expedition without scripted success panels, and feel intelligible?
- Can the place be authored and presented with a character/world art grammar that beats A1's *lived readability*, not merely random texture detail?
- Should richer gameplay be built atop A1 as donor, C1 independent world, or a hybrid? Do not select on faith.
- How can more source-authored 5-floor topology, NPC roles, encounters and narrative significance be used, rather than implementing the world's soul again by hand?
