# Coopege — A0: dokument autorski zamiast następnego edytora M7

**10 XI 2026 · status: isolated R&D donor, NOT Jaskinia, NOT Owner UX PASS, NOT READY FOR MERGE.**

## Owner intent / relevance

Jaskinia has been the Owner's everyday *Home* for launching and using projects since its inception. Coopege must remain a distinct RPG and domain owner, but its future authoring **workspace** should be composed using Jaskinia's freely arranged windows and presets — with better ergonomics than today's host. No need to rebuild a duplicate launcher, window shell, or Studio inside the game. October's F2 mini-editor is an explicit anti-pattern. The June M7 Studio/PR #12 is historical UX evidence only, **not** the implementation base.

The owner tested a live authored Rat with HP **5,555,555** and then **5** to check immediate impact on game behavior; he deliberately chose the Dragon texture as a joke, not by accident. October `TibiaContentAPI` currently disallows HP >100,000. Document this mismatch and study the simulation limits before changing validation.

## Exact game source

This research branch is based on `experiment/coopege-portable-return-2026-10-26` — not `main`, not M7.

Use the existing donor: `../continuity-2026-10-26/Coopege_Powrot_Do_Swiata_2026-10-26.html`, **397,096 bytes**, SHA-256 `01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff`.

`TibiaProjectAPI.importProject` already validates and applies content/map/assets (with runtime side effects). There is **no matching full-project `exportProject` API**. F7 *Powrót do świata* contains only `save, roster, settings, assets, terrain_patch`; it does **not** include authored monster/class/skill/quest definitions. A gameplay save is not a complete authoring document.

## Isolated implementation

`authoring-document.js` uses only existing domain APIs and exposes `window.CoopegeAuthoringDocument`. It does not register a new UI, inject a new workspace, send `postMessage`, write `localStorage`, or autosave.

- `capture()`: collect content, all five map floors + spawn/links/areas, and only non-procedural custom PNG overrides.
- `validate()`: check capsule format, target world/engine, completeness, and native domain constraints.
- `preview()`: show affected monster IDs, floors, classes and custom texture additions/removals/replacements **before** changing the runtime; no mutation.
- `download()`: user-initiated JSON file download. No automatic cloud upload.
- `apply()`: pre-decode PNGs to prevent native silent image failure; call native transactional import; verify authored structures and exact PNG bytes/metadata afterward. Undo via explicit `undoLastApply()` is one-level and **RAM only**.
- Native importer normalizes an omitted `spawnGroup.eliteCount` to `0`. Comparison permits only this known, empirically observed normalization; it does not simply ignore all spawn data.

**Warning:** `importProject` replaces content/map/assets, reconstructs spawn actors, may reposition the player and can remove custom textures omitted from the file. It is **not** a merge with a running adventure. Preview and backup must remain mandatory concepts in any future real UX. The current adapter is not safety-qualified for valuable Owner data.

## Evidence (isolated Chromium)

The bundled `smoke_authoring.py` is designed to reproduce these observations on the EXACT donor file, in separate Chromium documents using `page.set_content` (normal `file://` navigation was blocked by the research environment):

1. Real `rat` HP **25→5**, new name, real map tile `z0 (118,95)` **0→2**, and registered custom PNG `monster.rat` (16×16).
2. Capture of all three domains; real browser JSON download (≈432 KB pretty-printed). Validation/preview identifies affected items.
3. In a second fresh document: import rehydrates HP, name, tile and custom PNG; then `undoLastApply()` restores 25 HP, original terrain and no custom PNG. Native map playability `ok:true`.
4. Foreign-world, incomplete and out-of-range packages rejected.
5. A malformed PNG URL passed **native schema validation**, but the image could not decode. The wrapper catches this before any world replacement. Verified no mutation to HP/map/texture state; zero page errors.

**Important provenance:** the local research version of this adapter ran the full Playwright scenario and passed. The checked-in Python scenario reproduces the same fixtures against the checked-in JS; **GitHub Actions has not yet executed this particular branch**. No claims of live Opera, actual authoring UX, network co-op or durable browser-origin persistence.


### Negative witness: no-op import is NOT neutral to living actors

Separate [`runtime_reset_probe.py`](./runtime_reset_probe.py) performs a **test-only, read-only actor-reference instrumentation** (does not edit the donor on GitHub). Actual game start with warrior key `1`: **338 alive**; simulate one defeated actor by setting test-only actor HP to 0: **337 alive**; import a freshly exported **identical** authored project: **338 alive**, and the old actor reference is gone. Native reports `applied:true`, playability `ok:true`. No page errors. This is strong evidence that the existing importer is a **cold reconstruction**, not suitable as an unnoticed hot update during combat. Do **not** use it every time a designer drags a parameter. Hot patch requires a deliberately different semantics or safe simulation pause/commit boundary. The test did not perform natural player combat; the defeated-actor condition was imposed through a contained test hook.

## Run/reproduce (agent-facing)

Install Python Playwright and a Chromium binary, adjust the executable path in `smoke_authoring.py` if needed, then from any directory:

`python experiments/coopege-one-world-authoring/authoring-capsule-2026-11-10/smoke_authoring.py`

No Owner profile, site data or project storage is used. Do not run against valuable live work without backups and a real verification policy.

## Deliberately not built

No Studio panels, no launch-in-game F2, no host-level API contract, no telemetric recorder, no global Jaskinia schema, no migration of old saves and no canonical gameplay. B01/B02 remain archived in [PR #12](https://github.com/Jozzpoly/Coopege/pull/12); the new evidence belongs to the October playable line.

## Next meaningful questions, not a forced roadmap

1. *Hot apply vs cold apply*: what must survive a domain edit in a living simulation? Differentiate document revision, actor instance, spawn lifecycle, selected world object and adventure save. Do not silently invoke `spawnAll` on every slider tick.
2. *Independent authoring + adventure*: what is the smallest durable authoring artifact that is reliably recoverable without overwriting the player's adventure? Validate save/reopen/continue on a real hosted origin before calling it complete.
3. *Owner-shaped UX in Jaskinia*: can a user point to a real Rat on the map, deliberately edit the definition or one exceptional occurrence, and return to the *same* living world, with genuinely configurable views/presets? This belongs to Coopege+host integration research, not an inherited M7 tab layout.
4. *RPG still matters*: better feel, richer authored regions, useful AI, and co-op need separate real playtests. A good JSON format is not progress in gameplay by itself.

**No merge, no deployment, no Jaskinia main edits.** This experiment should increase available choices, not force a new architecture.
