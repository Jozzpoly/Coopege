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

## Critical distinction: save ANY draft, apply only a validated one

A first review found a dangerous paternalistic regression in the initial adapter: it rejected exporting a designer's invalid/absurd draft because the game cannot run it. **Corrected:** `capture()` and `download()` now preserve a structurally complete authored document even if `TibiaProjectAPI.validateProject` rejects numerical values or playability; download returns `liveImportValid:false` and issues. Only `apply()` to the living game retains the existing native limits. Thus **5 555 555 HP can be preserved as authoring data** even though the Oct26 runtime currently rejects it. This is not a promise that combat supports the value, nor a final stance on safe validation. It is the distinction between **creating/saving** and **executing** a draft.

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

### Native definition-only update — another distinct semantics

A second [reproducible hot-definition probe](./hot_definition_probe.py) used the playable Oct26 runtime with the warrior started: a live Rat had 25/25 HP and the authored Rat definition was 25 HP. Calling native `TibiaContentAPI.importPackage(...,{respawn:false})` with definition HP **5** yielded **new definition 5**, while the SAME live Rat instance remained 25/25 HP and 338 actors remained alive. No JS errors. Therefore we have TWO different outcomes, each meaningful: `respawn:false` updates future authoring definitions but leaves active actor stats as-is; full `importProject` reconstructs actors (even on identical data). The experiment does not yet prove what happens when a naturally new Rat spawns. **Never call both behaviors simply 'instant apply'** without explicit policy about scope and time.

## Run/reproduce (agent-facing)

Install Python Playwright and a Chromium binary, adjust the executable path in `smoke_authoring.py` if needed, then from any directory:

`python experiments/coopege-one-world-authoring/authoring-capsule-2026-11-10/smoke_authoring.py`

No Owner profile, site data or project storage is used. Do not run against valuable live work without backups and a real verification policy.

## Deliberately not built

No Studio panels, no launch-in-game F2, no host-level API contract, no telemetric recorder, no global Jaskinia schema, no migration of old saves and no canonical gameplay. B01/B02 remain archived in [PR #12](https://github.com/Jozzpoly/Coopege/pull/12); the new evidence belongs to the October playable line.

## Checkpoint A0.1 — no-op, konflikty, selektywna zmiana (10 XI)

**CURRENT STATUS: WIP / DRAFT PR #13 / NO MERGE.** Design-level behavior observed in *disposable* Chromium with pinned Oct26 game HTML. The branch's exact Playwright scripts still need independent execution on a checked-out source; GitHub Actions run count 0 at this checkpoint. Local packaged smoke test PASSED, but the packaged adapter and the GitHub branch's JS had been divergent; source-branch JS logic was separately exercised with mock host including new no-op/conflict semantics. Do **not** report CI green.

**Critical new safeguards in branch source:**
- Strict authoring equivalence now compares **all** project sections, not just selected fields (the old verifier omitted entrances/spawns/playability). Only empirically generated timestamps (`content.exportedAt`, `map.world.exportedAt`, `assets.createdAt`) and omitted `spawnGroup.eliteCount→0` are normalized.
- `apply(unchangedCapsule)` returns `{unchanged:true,applied:false}`, does **not** invoke native import and therefore **does not respawn a defeated actor**.
- Changed authoring document requires explicit `apply(capsule,{mode:'cold-rebuild'})`; otherwise rejected **before** a native world rebuild. This is not a full interactive UI consent mechanism.
- After importing, `undoLastApply()` first checks whether the authored world has changed. On a conflict it refuses to overwrite newer authoring. Undo, when allowed, is still a **cold reconstruction of actor instances**, not normal gameplay Ctrl+Z.
- Save of a structurally complete but unexecutable creative draft remains allowed. Native execution validation remains separate.

**Concrete browser counterexample:** warrior runtime 338 actors; mark one Rat defeated in disposable test (337); `apply` with exactly the same authoring snapshot leaves **337 and the same live actor reference**. A *changed* capsule without explicit cold-rebuild is rejected without restoring the Rat. With explicit cold-rebuild the game reconstructs 338. Change a tile after that: undo reports conflict and retains both newly authored HP and tile. Restore just the tile to its imported value: undo can restore the previous authoring world. Test also detects changes to `map.entrances`, which the earlier comparator missed. [Reproducer `noop_conflict_probe.py`](./noop_conflict_probe.py).

**Future-instance experiment (distinct from existing actors):** a disposable Oct26 warrior run started with 338 actors. One live surface Rat was test-defeated, leaving 337. After changing the authored Rat HP from 25 to 5 with `respawn:false,syncPlayer:false`, the original Rat definition updated but the existing rat's object remained 25/25. An explicitly invoked native `respawn()` created a **new Rat with 5/5 HP** in the same spawn group. This confirms *future-only* semantics in this particular test, not instant modification of living actors, an undoable combat event or overall NPC behavior. [Reproducer](./future_spawn_probe.py).

**Selective HOT probe:** `TibiaContentAPI.importPackage(modified,{respawn:false,syncPlayer:false})` changes the authored Rat definition from HP 25→5 while an existing rat actor **retains HP 25/25**. A single `TibiaMapAPI.setTile` change and a separate `TibiaAssetAPI.registerTexture` PNG override can be made without replacing any of the 338 actor objects or disturbing the observed player position/HP/MP and quest counter; the test then reverses each change. This is **not** an atomic three-domain commit or a test that all gameplay systems are unaffected. [Reproducer `selective_hot_probe.py`](./selective_hot_probe.py).

**Important future test:** verify snapshot/trace consistency when a change arrives during a live encounter, when it changes collision beneath an actor or a quest-relevant tile, and after save-close-reopen on the actual target origin. Tests done by agents must not be promoted to an Owner UX result.

**Next intentional campaign A1:** design one *domain-scoped* authoring operation with a visible impact preview and an explicit selected execution policy:
(a) store as editable draft, (b) change future instances while keeping current actors, (c) rebuild a fresh test scene. Do **not** silently add a policy “mutate all currently alive creatures” without a separate valid runtime mechanism and falsification campaign. Jaskinia host composition and presets remain Opus/Astra's domain and Owner intent.


## Next meaningful questions, not a forced roadmap

1. *Hot apply vs cold apply*: what must survive a domain edit in a living simulation? Differentiate document revision, actor instance, spawn lifecycle, selected world object and adventure save. Do not silently invoke `spawnAll` on every slider tick.
2. *Independent authoring + adventure*: what is the smallest durable authoring artifact that is reliably recoverable without overwriting the player's adventure? Validate save/reopen/continue on a real hosted origin before calling it complete.
3. *Owner-shaped UX in Jaskinia*: can a user point to a real Rat on the map, deliberately edit the definition or one exceptional occurrence, and return to the *same* living world, with genuinely configurable views/presets? This belongs to Coopege+host integration research, not an inherited M7 tab layout.
4. *RPG still matters*: better feel, richer authored regions, useful AI, and co-op need separate real playtests. A good JSON format is not progress in gameplay by itself.

**No merge, no deployment, no Jaskinia main edits.** This experiment should increase available choices, not force a new architecture.
