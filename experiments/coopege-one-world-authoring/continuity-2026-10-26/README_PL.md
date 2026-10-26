# Coopege — Powrót do świata · 26 października 2026

**Isolated, opt-in continuity pilot; NOT canon, not a universal save migrator, not an approved new combat model.** This is the same [hybrid RPG experiment](../combat-hybrid-2026-10-26/README_PL.md) plus one **F7 Powrót** panel. It does not overwrite previous specimens or alter main.

[**Standalone Coopege: Powrót do świata (HTML)**](./Coopege_Powrot_Do_Swiata_2026-10-26.html) · 397096 bytes · SHA-256 `01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff` · Git blob `031c39bc46551c41300e13b25db07ef3ee57448e`.

## Owner-visible flow

- Existing game controls unchanged: `B` spatial/manual vs legacy combat, `Space` tap/hold, `T` contextual autoattack, `WASD`, `V`, `E`, `F2`; **existing asset editor `F9` remains available**.
- **F7 → Pobierz moje dane JSON** generates a local file containing available character save, class roster, settings, edited terrain, and custom PNG assets of **this** build.
- **F7 → Sprawdź wcześniejszy zapis** checks known preceding same-world variant prefixes, **only upon explicit action**, if the browser shares their localStorage origin. It previews class/level, character count, authored tile count and asset count. No data is moved until separate consent.
- Or choose a portable `.json` file, preview it and choose **Zastosuj import**; new build's existing values get a rollback copy, previous build data remains untouched. Then explicitly **reload** the page. **Cofnij ostatni import** restores the previous target values.
- The new namespace is `coopege_continuity_2026_10_26_`. Incoming values must match `silver-gate-world-v11`, map v4, save v11, known prefix and bounded formats. Inconsistent map edits, wrong worlds, malformed input and suspicious keys are rejected before writes.

## Evidence — exact scope

- Browser Chromium PASS: F9 still opens the authoring asset panel; F7 is distinct. Visible file download and file-picker preflight are both real UI actions.
- Synthetic *previous-version save* preflight, explicit confirmation, target rollback, and simulation of a mid-import storage failure: PASS; old source data remains unchanged. Malformed JSON/unknown source/foreign world/prototype keys rejected.
- **Fresh-document reload with isolated fake localStorage:** player class, gold, and a real authored tile load correctly into the same RPG engine. This is not a normal-origin browser persistence test.
- Existing hybrid RPG regressions on this exact HTML: tap/hold/auto on real world rats, A/B body contact, three classes, five floor datasets and map validation, natural RPG loop of chest loot → equipping armour → returning → clicking merchant purchase — PASS in bounded Chromium scripts. Long walks advance the real `update()` without rendering every frame.
- ZIP `COOPEGE_POWROT_DO_SWIATA_2026-10-26.zip`: **9 entries, 511508 bytes, SHA-256 `da4e6cf0302763061b97b60ef13d4d2c2cf2c9b04f27823ecbdd30853e275b16`**; contains exact donor HTML, source adapter, builder, extended tests, synthetic reference screenshot and SHA manifest. ZIP CRC, SHA manifest, cold rebuild and cold test all PASS. The conversation ZIP is not verified off-platform backup.
- GitHub keeps [adapter](./continuity.js), [builder](./build.py), [minimal Chromium smoke test](./smoke_return.py) and [exact HTML](./Coopege_Powrot_Do_Swiata_2026-10-26.html). The full synthetic QA suite remains in the conversation ZIP.

## Limits and non-goals

**Not proved:** real Chrome/Opera `file://` or hosted-origin persistence, practical old-version import on Owner's browser, large custom PNG collections, forced browser crash atomicity, all legacy quest/floor transitions, subjective gameplay comfort. Old standalone files can have **different browser origins** and no export UI; therefore the new build cannot promise to discover their saves. If browser storage is partitioned, a known-prefix search can find nothing. Portable JSON transfers only between builds that explicitly support its format; older unmodified builds cannot automatically export the full state.

An import that fails during write attempts rollback, but catastrophic browser termination can still break multi-key atomicity. Back up portable JSON outside the browser before intentionally changing long-lived work. No network/cloud transfer, no automated cross-project access, no Jaskinia integration. Don't lock future architecture to permanent backward compatibility on the strength of this pilot.

**Next useful Owner/agent decision:** Does this genuinely make return-to-play easier? If not, revise the return workflow rather than proliferating transfer subsystems. Owner verdict on the hybrid autoattack remains pending; the user's confirmed positive feedback applies only to no-overlap, and his complaint concerns per-hit button burden.
