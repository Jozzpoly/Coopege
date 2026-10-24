# Coopege: independent recovery checkpoint — 2026-10-24

This is an agent-facing EVIDENCE ENTRYPOINT, not an architecture freeze, a promise of gameplay quality, or an endorsement of the previous agent.

## Owner intent and safety
Build ONE independent Coopege game/world fulfilling the original Tibia x Coopege dream: authored RPG richness, accessible exploration, three-class combat/gear/quests/trade, its own identity and more credible physical/social causality; later cooperative play and accessible creation. Historical Tibia is a gameplay-content donor, not a mandate to keep its old engine/feel. F1 is an idea donor, not an excuse to reduce the whole game to a tiny laboratory. Never turn Coopege into a subsidiary of Feniks, or introduce separate player-facing realities. Owner reports prior agent breach of trust; nature of misconduct unknown: don't assert guilt beyond the Owner's statement. Preserve legacy; avoid destructive or default-branch changes until justified.

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
