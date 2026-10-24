# Coopege: one-world courier trial (2026-10-24)

**Playable experimental donor build. NOT the final game or chosen architecture. Do not merge by default.**

## Play
Download [Coopege_One_World_Trial.html](./Coopege_One_World_Trial.html) and open it locally in Chrome/Opera. Choose `1` Warrior, `2` Archer or `3` Mage. Use WASD to head south of Silver Gate, Space/Q for the original Tibia combat. A courier is returning to the original merchant via the same navigable map; original rats can attack him. The player's intervention can affect delivery, and the original merchant's shop can gain a limited stock of 3 discounted health potions. If the courier dies, approach his bag, `E` pick it up (slower movement), return to the merchant and press `E` to hand it over.

## Evidence & safe bounds
- HTML SHA-256: `c825eabcf2df1b202fb2d70780bf0d1e2ed786c7ffcc6313c028d33109e08f81`; Git blob SHA `4b01df77d42d7a0cf042d4e40a29b3d1cb309355`.
- Source donor is immutable `main:legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html`, SHA-256 `cd7d0d7527847ebd3f4ddb2c5a8c18d292517815c4989b8f4bd40b0fc5ce900c`.
- All THREE character class starts, natural movement, courier trigger, original world APIs, original NPC count, five floor IDs, core courier save-restore and no-page-error were retested in Chromium after fresh archive extraction. This does not establish full floor-transition or combat regression coverage.
- Another browser route with a Warrior fighting on the real map and returning demonstrated arrival, merchant-stock +3 and a new limited shop entry. A second diagnostic scenario forced courier death **using a test stimulus**, then performed in-world bag pickup/carry/return and an actual shop mouse purchase (stock 3→2, gold 12→4, potion count 5→6).
- 15 controlled unattended courier runs: 13 delivered, 2 died. Neither meaningful help probability nor a well-designed difficulty curve is demonstrated.
- The original Tibia's save, roster, settings, custom-asset localStorage keys and fallback-read keys are intentionally **isolated**. Avoid removing this safeguard. Browser K/L save/load on a real origin is still **unverified** (the local headless test used about:blank with storage restrictions); core state save-restore worked.
- One-level active simulation still pauses courier outside floor z=0; waypoint logic is elementary, no sophisticated NPC mind, no guaranteed improved gameplay feel. The original single-file engine and graphics remain historically limited.

## Provenance and reproducibility
The complete self-contained source/test package was produced separately as `COOPEGE_ONE_WORLD_TRIAL_2026-10-24.zip`, SHA-256 `4f2fbaea2b32adc2ac8d91473b489c84b32d5403a752a62166f0cc2ac8a4ebe1` (4,523,541 B, 17 members), available as a downloadable attachment in the authoring conversation. This Git branch tracks the **byte-identical finished HTML**, not the complete generator harness. Archive includes `build.py`, `courier-world.js`, original hashed Tibia and browser tests. The ZIP itself is not checked into GitHub.

## Next research decision
A/B compare this actual game against original Tibia for **fun, agency, mechanical feel, exploration richness**. Determine if one-world causality truly earns its complexity; do not automatically expand old monolith. Future architecture can replace the old implementation while retaining authored content. Preserve existing Git branches and legacy files. The Owner's experiential judgment is not yet obtained. This trial must not be presented as a completed Coopege.
