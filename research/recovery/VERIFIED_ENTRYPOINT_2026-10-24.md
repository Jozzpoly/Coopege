# Coopege — CURRENT agent re-entry · 2026-10-26

> This is the **one active state** for the independent Coopege line after 25–26 October. Read this before old plans or earlier experiments. **Past evidence is preserved, not erased:** the previous detailed 43 KB checkpoint is accessible at [immutable commit `61c2a6166d`](https://github.com/Jozzpoly/Coopege/blob/61c2a6166d2227de1f63be5ab0ead26e9db9d753/research/recovery/VERIFIED_ENTRYPOINT_2026-10-24.md). Git history preserves its exact text and old conclusions. The former append-only "newest" sections are historical, not competing current instructions.

## 1. Live truth / Owner judgement

**Goal:** an independently enjoyable, authored Coopege RPG — movement, exploration, danger, loot, trade, eventual coop and powerful direct authoring — rather than continually polishing technology demonstrations or rebuilding the past literally. Original Tibia v14.1 was genuinely playable and contains meaningful authored RPG content, but its three classes, five floors, old combat/quests and technical constraints are **evidence/donors, not final product canon**. Solo gameplay quality is the *present* priority; don't revive the June LAN gate because an old roadmap mentions it.

**New first-hand Owner feedback, 26 Oct:** in a privately uploaded ~162 s recording, Owner explored and fought in the actual RPG, notably against rats in the dungeon. Owner **liked monsters not overlapping the player**, but asked for an autoattack and less repetitive button-press fighting. **This is NOT approval of the complete combat model or the new hybrid variant.** The recording is private: never commit, republish, insert frame crops into public source or package it. Source interpretation: separate (i) *when an attack starts* from (ii) *how physical contact/hit is computed*. Convenient repetition should not require attacking through walls or erasing embodied contact. Preserve the user's right to move, steer and experiment.

**Current broad context:** historical Tibia Studio and Jaskinia are parts of the same long-term creation dream, **but not one mandatory codebase**. [Jaskinia Owner Compass #5](https://github.com/Jozzpoly/Jozz-Cave-Workbench/issues/5) is the source for that host. Its material/version/interface donors are candidates, not automatic blessed components; Jaskinia's `Ruch` had a negative Owner usefulness verdict. No sudden host integration, no separate fake iframe world, no mutation of Jaskinia state.

## 2. Exact current candidate and how to continue

**LATEST runnable candidate (isolated; no PR/merge):** [Coopege — Walka Hybrydowa A/B](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-one-world-authoring-2026-10-25/experiments/coopege-one-world-authoring/combat-hybrid-2026-10-26/Coopege_Walka_Hybrydowa_AB_2026-10-26.html), **382127 bytes**, SHA-256 `228b2c7b6b5d7f563e57685d83f79287ca93d914cb39369d8235fdb64fa86af6`, Git blob `462f5fdb72c647b27f96f2518c56328d0e45034a`. [Owner-facing instructions, source, limits](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-one-world-authoring-2026-10-25/experiments/coopege-one-world-authoring/combat-hybrid-2026-10-26/README_PL.md). Browser standalone HTML; no hosting/release proven. **GitHub's `blob` URL is a file/source view, not a verified one-click playable hosted URL.** To play, download the standalone HTML and open it locally; do not advertise GitHub source view as a working game or route it through the Jaskinia origin without an explicit storage/privacy plan. To obtain/rerun source: same folder has `spatial-hybrid.js`, `build_from_repo.py` and `smoke_hybrid.py`; builder uses exact sibling `adventure-view/` donor, not a platform service.

**Controls:** choose 1/2/3, WASD move/facing, Space attack, B selects warrior A legacy vs B contact-spatial. In B: tap Space once, hold Space for repeated swings, T or existing AUTO toggles nearby enemy auto-swings. B AUTO may turn the idle hero to a nearby eligible enemy but never chases; while moving, user's facing wins. Same 135 ms contact-timed hit, LOS/arc/range, possibility of miss and limited multihit. Soft body separation applies in **both A and B**, and other classes; imperfect when blocked by world geometry. V toggles more world vs full HUD; E interaction, C inventory, F2 map editing. Distinct `coopege_hybrid_combat_2026_10_26_` save/asset/terrain keys, without importing parent saves.

**Portable capsule:** `COOPEGE_WALKA_HYBRYDOWA_2026-10-26.zip`, 17 entries, 928366 bytes, SHA-256 `36fc568d3eda4871d949ee31dae9c2d83c2b0ecd7beb44cd03d3e1c0a711581b`. Chat conversation artifact, **not a proven independent off-platform backup**. Does **not** contain Owner video/frames. Source and playable specimen are also pinned in GitHub experiment branch; immutable historical builds retained.

## 3. Verified evidence vs open claims

| Scope | Current status |
|---|---|
| Cold extract, SHA manifest, independent rebuild of same HTML | **PASS** (rechecked 26 Oct) |
| Browser QA: single tap, hold/release, T AUTO, facing/front-vs-rear, geometry/walls, overlay/pause, A/B soft contact | **PASS in tested cases** (rechecked) |
| Natural historical rat AI encounter, B+T with no Space | **PASS in one tested run**; still a scripted run using real world update |
| Original RPG loop: leave town, chest, equip actual armour, return and buy merchant potion | **PASS** in simulated keyboard+pointer Chromium run; long walk fast-stepped |
| Three class starts and presence/validation of five floor data layers | **PASS limited**; not full floor transition/quest coverage |
| Owner experiential judgement | **PARTIAL:** likes non-overlap; dislikes per-hit button burden. New AUTO/hold model *not tested by Owner*. |
| Persistence after reload on real browser origin, full co-op, balance, performance and fatigue over time | **UNPROVEN**; do not call them PASS |

**Independent follow-up witness (26 Oct):** 10 ZIP-contained Chromium scripts were rerun after cold extraction and all exited 0. Separately the byte-exact **GitHub repo-native** `build_from_repo.py` (blob `bf98eba3…`) and `smoke_hybrid.py` (blob `740089e1…`) were executed in a reconstructed repository layout; both PASS, and the builder generated Git blob `462f5fdb…`. This verifies retrieval/build from the committed minimal source, not merely a conversation ZIP claim.\n\n**Recent QA caveat (26 Oct cleanup):** One attempt at the RPG regression reached the merchant but failed only at screenshot writing because the freshly unzipped test directory was root-owned and not writable by a different executor. Rerunning with valid write permissions passed through real purchase. This is a harness/environment issue, not evidence of a gameplay defect. Don't convert environment failures to game defects or erase genuine failures.

**Open product question:** Does B+T turn the hero when idle in an annoying way? Does hold-Space help in dense dungeons? Does maintaining bodily contact across A/B and other classes preserve good play feel? Owner's actual A/B human verdict is more valuable here than more arbitrary thresholds.

## 4. Lineage: witnesses, not competing "latest versions"

All below are intentionally distinct test specimens on the **same isolated experiment branch**, not seven things to merge or maintain as separate products:

| Witness | What it established, what it did NOT |
|---|---|
| `Coopege_One_World_Studio_Trial.html` | One map for actors/editor; F2/undo, courier reroute; no real Studio or gameplay-feel proof |
| `expedition/Coopege_Expedition_Outpost.html` | Chest/loot/merchant loop; **critical old bug:** effective renderer did NOT show authored signs/chest |
| `material-choice/Coopege_Wyprawa_Woz_2026-10-25.html` | Corrected effective renderer; material cart affects real collisions, projectiles and monster route, but shallow tactical value vs melee rats |
| `adventure-view/Coopege_Przestrzen_Przygody_2026-10-25.html` | V world view 480→590 (+22.9% vertical pixels); former invisible HUD hitboxes and shared save key fixed, but not proven more fun |
| `combat-ab-2026-10-26/Coopege_Walka_Przestrzenna_AB_2026-10-26.html` | Manual directed attack, sector/LOS, soft separation; **old B dealt damage before swing made visual contact** |
| `combat-impact-2026-10-26/Coopege_Kontakt_Zamachu_AB_2026-10-26.html` | Corrected damage timing ~135 ms within sword animation; per-press Space still high burden |
| `combat-hybrid-2026-10-26/Coopege_Walka_Hybrydowa_AB_2026-10-26.html` | CURRENT test candidate, hold-Space + T AUTO and soft separation across modes; Owner verdict pending |

Do not multiply further specimens by inertia. Keep the original donor and earlier builds intact, including their **FAILs**, as reproducible counterexamples. `main` remains Owner's protected branch, unchanged at `1b3f4fbc7834a7503a43770236ca0930e5799c9e`. Pre-existing PRs #1–#8 are other historical tracks; **do not merge or close them as cleanup**.

## 5. Responsible next movement / working contract

1. **First recover current reality** from the two links in §2, exact SHA and latest Owner judgement; don't read 43 KB of old appended plans as commands. The archive above is for targeted provenance lookup only.
2. **Validate a genuine player-scale question:** crowded dungeon comfort/steering, with A/hold/B+T and actual world feedback. Consider whether idle auto-turn usurps intended facing. Use recorded Owner experience as partial evidence; don't invent a fresh Owner approval.
3. **Intervene sparingly:** one grounded, reversible correction *only if a current bug or experience friction is supported*. Retest normal RPG loop and input/hitbox/save isolation. No reflexive new engine, quest, editor, mode, PR or report; don't delay real play behind endless harness work.
4. **Report succinctly:** active state → evidence → material limits → next action, with one playable link. Change this document only at a meaningful transition; do not append nightly "latest" paragraphs. Preserve old versions via Git history. Technical agents should work from sources, not route QA through Owner. User attention is costly.
5. **Concurrent-agent hygiene:** the recovery and experiment branch HEADs visibly changed **during** the 26 Oct cleanup audit. Refetch live HEAD and exact file SHA immediately before EVERY write; compare/reconcile on mismatch instead of overwriting another agent's update. GitHub file updates should use the current blob SHA as an optimistic concurrency guard. Never infer that a previously observed old document is still current.\n6. **Data and agency:** no raw private video, Browser/Jaskinia material, personal saves or unapproved secrets in public repo/artifacts. Don't delete historical experiments or change `main`/other agents' work during hygiene. File existence, playable local HTML, release hosting and real human quality are different truths.

**Handoff is complete when a new agent can identify ONE testable current artifact, ONE verified limitation, and ONE meaningful next experiment without asking Owner to paste old transcripts.**

