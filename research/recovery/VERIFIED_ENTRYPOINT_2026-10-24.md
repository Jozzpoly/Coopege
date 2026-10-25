# Coopege: independent recovery checkpoint — 2026-10-24

## Owner intent correction — source recheck, 2026-10-25

**Do not canonize the historical game structures.** The Owner said in September 2026 that the original Tibia was his most complete game and that he had genuinely played it for 30–120 minutes, but its exact three classes, talent trees, monster roster, quests, consumables, combat and map were in many respects *production constraints rather than desired fixed end-state*. The task is to protect authored provenance, accumulated playable RPG richness, adventure/feel and future possibilities while challenging obsolete gameplay and architecture. Three classes / five floor IDs are valuable **recovery and regression witnesses only**, NOT unchangeable product requirements.

**Jaskinia as shared creator vision:** the Owner confirmed on 2026-10-25 that historical Tibia Studio and Jaskinia are parts of one enduring authoring ambition, yet explicitly requested NOT to abruptly redirect the current gameplay campaign into large-scale integration. [Owner-approved Jaskinia Compass](https://github.com/Jozzpoly/Jozz-Cave-Workbench/issues/5): one user-facing experience, not necessarily one codebase; creator control and safe return are more important than technology stack. Jaskinia v6 material identity/versioning and windows are *technical candidate donors*, NOT proven universal authoring UX. The Owner has **negatively judged Jaskinia's Ruch** as practically useless for his creative needs; DO NOT describe it as a qualified, Owner-approved feature donor. The user's direct manipulation should be evaluated on real creative freedom, not green synthetic tests.

**Experience gap and coordination:** At this checkpoint no Owner-accepted playtest demonstrates that the new Coopege candidates are better games than original Tibia. Technical courier/terrain test passes do not close this gap. The Jaskinia public v6.4.1 preview is a 2026-10-19 snapshot covering 26 public projects and has no Coopege entry; it is NOT a verified one-click route to the latest playable Coopege candidates. Do not silently assume public preview equals the Owner's private artifact. Build and host are separate evidence; avoid sharing browser save/storage across an untrusted origin. Before additional authoring-platform work, establish a genuinely accessible **single RPG candidate** and compare the player experience with original Tibia, without overburdening the Owner with QA for basic bugs.


## 2026-10-25 — authoring and actor topology consistency, isolated result

**Exact verified build** [Coopege_One_World_Studio_Trial.html](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-one-world-authoring-2026-10-25/experiments/coopege-one-world-authoring/Coopege_One_World_Studio_Trial.html), on isolated `experiment/coopege-one-world-authoring-2026-10-25`. Git blob `e94a46e03fa8b60a5402523d06dc0e6f9f956133`, SHA-256 `6b1487182105e1ec973dbd20de56912c405eb9413abd3266954c0f3543a7ba6d`, 361206 bytes. [Polish README/limits](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-one-world-authoring-2026-10-25/experiments/coopege-one-world-authoring/README_PL.md). This branch is descended from the October 24 one-world trial; `main` remains untouched.

**Why:** the previous [issue #9](https://github.com/Jozzpoly/Coopege/issues/9) demonstrated that courier could walk through a wall placed *after* path planning. This successor trial keeps original RPG classes, map and enemies and adds a tiny in-game editor (F2, mouse tile painting, Ctrl+Z/Y, export/import verified terrain patch), plus courier walkability checks and route recalculation/blocked waiting. Browser tests: 21 assertions PASS; real-player wall collision y≈86.5 vs y≈95.7 after undo, exact tile type undo, invalid patch import refused before mutation, three classes and five floor IDs still available. Bounded Node VM: five routing cases PASS, including obstacle mid-route, blocked destination and reopening; these are not a full in-browser AI/restart proof. Stubbed-localStorage rehydration PASS; **real-origin persistence remains UNTESTED** because localhost navigation was administrator-blocked. No Owner game-feel verdict, no full combat/floor transition/quest/asset regression.

**Reproducibility:** authoring conversation created `COOPEGE_ONE_WORLD_AUTHORING_TRIAL_2026-10-25.zip` (14 members, 1751627 B, SHA-256 `fb6cf1a27ac2e0962260bd78f49dc2bf67466d894de104161d31d6bb770c619a`) with base HTML, editor source, generator, Chromium tests, Node VM witness and MANIFEST. The self-contained playable HTML is committed byte-exact in GitHub, package is a conversation artifact not a verified independent backup.

**Honest verdict:** better editor and shared topology **are proven only in tested scope**, but an exciting and visually distinctive new Coopege is not. Do not mistake tile editor for the historically requested Studio (sprites/animation/content/quests/skills/AI graph). Next meaningful move is a side-by-side Owner-visible RPG playtest and selective architecture research, not inexorable expansion of the old monolith.

---


## SECOND SESSION 2026-10-24 — execution supersedes yesterday's plan

Isolated playable source now exists **outside main**, at [experiments/coopege-one-world/Coopege_One_World_Trial.html](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-one-world-trial-2026-10-24/experiments/coopege-one-world/Coopege_One_World_Trial.html), branch `experiment/coopege-one-world-trial-2026-10-24`. This is the exact byte-identical tested standalone HTML: 347851 B, SHA-256 `c825eabcf2df1b202fb2d70780bf0d1e2ed786c7ffcc6313c028d33109e08f81`, Git blob `4b01df77d42d7a0cf042d4e40a29b3d1cb309355`. [README & limits](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-one-world-trial-2026-10-24/experiments/coopege-one-world/README.md).

This is a **single-runtime feasibility witness**, not a gameplay acceptance nor an architecture endorsement: original Tibia 3 classes, authored world, existing rats/combat/merchant remain; original map courier can be attacked, rescued or left to die; merchant gains limited stock from delivered crate or recovered bag. Original browser save/roster/settings/asset keys are isolated. Chromium class and core save tests pass; K/L browser-origin save and full-floor transitions UNTESTED. Separate archive `COOPEGE_ONE_WORLD_TRIAL_2026-10-24.zip` (4,523,541 B, SHA-256 `4f2fbaea2b32adc2ac8d91473b489c84b32d5403a752a62166f0cc2ac8a4ebe1`) carries source generator and reproducible tests in the authoring conversation, but the archive **is not in GitHub**.

**NEXT:** Owner-facing real A/B game feel and gameplay richness vs original Tibia; investigate assistance value (in 15 simulated unattended runs courier arrived 13 times, died twice); verify browser storage, test map/floor/quest regressions; then decide whether this mechanic deserves adoption or redesign. Avoid promoting current tech proof to canonical game, avoid expanding original monolith by inertia, keep optional one-world world dynamics in service of exciting RPG. Nothing merged into main, preexisting PRs preserved.

---

This is an agent-facing EVIDENCE ENTRYPOINT, not an architecture freeze, a promise of gameplay quality, or an endorsement of the previous agent.

## Fresh independent witness (25 Oct 2026) — conditional, not a new roadmap

- [Issue #9: courier movement across a tile blocked **after** route planning](https://github.com/Jozzpoly/Coopege/issues/9) contains an independent, three-condition Node VM counterexample against **unchanged One World Trial source**: open path → passes; obstacle before planning → detours; obstacle introduced during movement → courier traverses newly blocked tile. **Scope:** old trial module under bounded `walkable` stub, *not* proven against later live terrain-authoring builds. If working on dynamic world topology, check the exact current build before deciding whether this witness applies; otherwise leave it alone. Neither issue creation nor this pointer is a confirmed read receipt from the local agent. No Owner action implied.

## Owner intent and safety
Build ONE independent Coopege game/world fulfilling the original Tibia x Coopege dream: a compelling, authored RPG experience with exploration, satisfying combat and meaningful development, its own identity and more credible physical/social causality; later cooperative play and accessible creation. Historical classes/quest structures/roster/map are preserved as recoverable donor evidence, not obligatory final designs. Historical Tibia is a gameplay-content donor, not a mandate to keep its old engine/feel. F1 is an idea donor, not an excuse to reduce the whole game to a tiny laboratory. Never turn Coopege into a subsidiary of Feniks, or introduce separate player-facing realities. Owner reports prior agent breach of trust; nature of misconduct unknown: don't assert guilt beyond the Owner's statement. Preserve legacy; avoid destructive or default-branch changes until justified.

## Grounded source provenance
- Original Tibia: main:legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html, 338570 B, SHA-256 cd7d0d7527847ebd3f4ddb2c5a8c18d292517815c4989b8f4bd40b0fc5ce900c, Git blob ee03e6250585d8ee9d5965d17abf73e1c0403cdc. Two Library ZIP copies are byte-identical; CRC passed.
- Historical M7 (Library): 806880 B, SHA-256 a7f5f83b7fc53d9e159aad08989d82d003d70ec46dad71f15efc57f26f7e3523. Browser runtime starts and moves; quality unproven.
- A1 PR #2: experiments/coopege-a1/Coopege_A1_Tibia_Donor.html, ref experiment/coopege-a1-tibia-donor-2026-10-23, 342146 B SHA-256 92b35b3271602cdbb5da7349b08066b15c9e45e994c36d2ec7e70f52214892a0. Exported map/content matched original Tibia except two timestamps in one sample; does NOT prove runtime equivalence.
- B5 PR #8 exact head bd961b81bc493a3cb941c58271af6100fddb63de, CI https://github.com/Jozzpoly/Coopege/actions/runs/40026581032. Limited green tests: the unit payout test manually sets kills to eight; natural browser delivery test killed none. Do not claim a complete RPG quest test.
- C1, E1, F1 were found in ChatGPT Library dated 2026-10-23/24, AFTER B5, and are not the GitHub PR sequence. F1 Library file Coopege_F1_Naprawa_Zakleszczenia.html, 166727 B SHA-256 4a5371533fe9d88fa5d6b27e2aa188c30f816eec4a1d640a53caeead2617d448. Quarantined donor, not canonical source.

## Repeated browser and simulation evidence (2026-10-24)
- Original Tibia plays all three classes; natural Warrior movement and Space combat works. An older checkpoint asserted 338→337 while the quest showed 2/8 and EXP30; a fresh repeated natural route gave **338→337, quest 1/8, EXP15** (consistent). The asserted discrepancy was NOT REPRODUCED; don't call it a confirmed bug or infer broad combat correctness.
- F1 control (no input, 40s virtual Chromium time): porter outbound at 10s, HP24 and sheltering at 20s, dead at 30s; merchant stock remains zero.
- F1 intervention with actual natural keys (S ~5s, D 570ms, S 1250ms, Space 4 times 650ms apart): one rat killed, player HP 100→76, porter arrives and deposits cargo, merchant stock 0→3. Repeated in Chromium; no injected NPC teleport/stock mutation.
- F1 player knowledge of merchant stock stayed old until physical return to merchant. This is a *local authored knowledge gate*, not generalized agent cognition.
- The F1 worker uses predefined waypoint arrays, simple local line-of-sight, proximity and attack rules. The phase sheltering actually STOPS the porter near the rat, and cannot be called successful retreat or living AI. Player proximity affects rat targeting.
- F1 core save/restore compared equal after continuation; BROWSER SAVE UI NOT PROVEN due to about:blank localStorage policy in browser harness. No new-game Owner feel approval.

## Interpretation
DEFENDED: original authored game is retrievable and runs; A1 retains original authored content export; F1 has one contingent material/player-knowledge consequence; the C1/E1/F1 artifacts exist beyond the last public PR.
NOT DEFENDED: a better new game; rich AI; comprehensive combat accounting correctness; complete architectural reuse; real-origin persistence; full 5-floor/quest semantic restoration in F1; external independent backup.

## Tomorrow: execution, not report proliferation
1. Open actual Tibia and F1 and recheck combat accounting beyond a single randomly varying route; investigate the older inconsistent observation without presenting it as a verified bug. Compare what the *player* experiences, not only DOM/schema/test passes.
2. Investigate one-world integration seam with minimal regression to authored place, classes, skills, NPC trade, gear, inventory and floor topology. Reject iframe/sidecar game worlds and rushed stuffing F1 into fragile monolith. Evaluate alternatives on evidence.
3. Build ONLY an isolated, falsifiable playable vertical slice after feasibility check; test natural complete routes, state recovery and side-by-side Owner-feel quality. A better RPG is the output, not more labs.
4. Keep provenance, hashes, explicit FAIL/UNPROVEN and reversible changes. Do not merge #1–#8, revive June M8 LAN as today's direction, or delete historical data.

## Portable evidence rescue capsule
Originating conversation artifact: COOPEGE_RESCUE_EVIDENCE_2026-10-24.zip, SHA-256 c71e1004d2e862ae00c3676a0a3274acc368abbfe0c7984df4c3b4be9e66b8b5, size 2,685,581 B. Contains original Tibia, A1, F1 (quarantined), screenshots/JSON, test script, MANIFEST.sha256 and longer START_HERE.md. This GitHub branch contains documentation only, not active gameplay code. Nothing here verifies a backup truly stored outside ChatGPT/GitHub.
