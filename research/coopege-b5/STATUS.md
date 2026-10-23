# Coopege B5 — first playable adventure after B4 Owner FAIL
23 October 2026 · experimental run · NOT final game or engine

## The Owner's challenge
Owner observed that continuous cart contact in B3 became somewhat sensible, but the whole game looked awful, and even after B4 visual repaint the ancient Tibia had superior presentation. Agent was instructed to recover broader projects via Opera and GitHub, rethink the product rather than produce another cosmetic layer. Audit: [B4 cross-project reset](../coopege-b4/CROSS_PROJECT_GAME_FIRST_AUDIT_2026-10-23.md).

## What actually shipped to isolated B5
- **Real source truth, not reimagined generic map:** authored B0 source witness from original Tibia DevAPI: original Silver Gate geography, named entrances, original healer & merchant coordinates, encounter groups `surface_city_south_vermin` (5), `surface_city_north_vermin` (4), `surface_city_west_vermin` (4). 13 living city-adjacent rat actors, retaining original spawn coordinates. A verified historical quest `Plaga pod murami` requires 8 kills and pays 60 gold, 2 health potions; B5 maps those health potions to its existing bandage primitive. That is NOT full legacy quest/economy parity.
- **NEW B5 authored scenario, explicitly not historical:** a missing courier's satchel at walkable world location x=90.5,y=103.5; pickup with normal E and return to original merchant x=84.5,y=83.5, 24 coins and bandage exactly once, preserved over save/reload and second expedition. This is a small prototype of a genuine town→road→town loop, but still fetch-quest-level scripting, not emergent social simulation or a professional campaign.
- **Preserved B3 donor:** cart responds to physical WASD body pressure and bounded pointer grip, blocks line of sight and collisions, stores fractional location; it is not moved one tile by E.
- **Return to visual donor evidence:** seven embedded original M7A atlas PNGs for tile materials, warrior and rat; prior B4 vector fallback retained. Tested with natural screenshot evidence. All seven are historical `legacy-placeholder` images, NOT final art. Save identity B5 isolated from prior builds.
- **Spatial readability:** source-derived minimap, original nearby place labels, proportional body drawing, reversible camera zoom wheel/+/- and a compact quest journal with direct game state.

## Provenance and verification levels
- Actual B5 no-atlas [PASS workflow](https://github.com/Jozzpoly/Coopege/actions/runs/40025841639): authenticated old API witness; Node gates; real Chrome natural south road, body push, collectible, persistence, merchant return and single payout. Old image handwaving is not used as evidence of art quality.
- Seven-atlas B5 [PASS workflow](https://github.com/Jozzpoly/Coopege/actions/runs/40026146349), actual screenshots. Readability improved compared to B4: original warrior silhouette, terrain material grammar, repeatable atlas variants. Image still looks strongly outdated; maintaining old sprites was a contrast, not a solution.
- Subsequent isolated patches prevent quest merchant from permanently superseding normal bandage trade and implement owner-adjustable zoom. **Exact final SHA must be checked anew after this document commit.**
- Tests are Node API provenance, minimal event/simulation checks and actual Chrome keyboard route. Not human-fun or art acceptance.

## Honest product evaluation (post-screenshot)
| Dimension | Result |
|---|---|
| Retrievable original authored positions/quest/texture metadata | Verified for included slice |
| Ordinary town→trail→item→town with one-time payout | Machine PASS, Owner not yet tested |
| Non-grid-step cart and persistence | Carried B3 donor, limited |
| Atmosphere, art direction, recognizable actor | Improved visibility, NOT Owner PASS |
| Combat | Primitive, 2-hit rat, no rich weapon feel |
| NPC life and world consequence | Mostly scripted; merchant stock economy small |
| Why return for a second adventure | Courier resolved, 8-rat optional bounty; insufficient long-term |
| 5-floor original game, richer NPCs/quests, crafting, detailed progression, co-op | Absent / NOT claimed |

## Critical learning
- An asset pack exists and has already been integrated in old Coopege. A new draw routine that discards the visual grammar/content will likely fail even if it performs better.
- A "test" that moves to a Y coordinate is not a gameplay test. B5 real Chrome performs a complete return and verifies consequence, though that still does not prove fun.
- The reward cannot disable prior merchant behavior. Merchant action after delivery restores ordinary trade, with regression.
- The legacy source is rich but its sprite placeholders and monolith were poor foundations. Never confuse reuse with canonization.
- World first, not HUD cosmetics, system-first research and fake life.

## Next judgment
Show B5 to Owner as an **unpromoted exploratory build only**. Listen for actual scene feel, readability, NPC/quest motivation and willingness to revisit. If still dramatically worse than Tibia, don't perform a B6 color-noise overhaul. Compare three competing coherent approaches with an actually authored location and character: reworked legacy art grammar, new purpose-designed asset/scene art, and perhaps justified 2.5D. Rebuild foundations around the winning game experience, not around a defended B5 branch.

No changes to `main`, no Jaskinia deployment, no resurrection of M8 LAN, no permanent adoption of circular cart collision as full-world physics.
