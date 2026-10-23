# E1 · real Owner blockade, audited root cause · 24 Oct 2026

**Status: MATERIAL FINDING / current world contact is NOT adequate.** Owner playtest: pushing the box/cart into the porter immobilized **both**. Neither the box/cart nor the porter could be moved afterward. A real game-breaking agency failure, discovered immediately in normal play **after** CI was green. Treat this feedback as stronger than earlier test-completion language.

## Exact source / provenance
- Experimental branch: `experiment/coopege-e1-worker-cargo-2026-10-24`, game source at [`1fef0b3`](https://github.com/Jozzpoly/Coopege/commit/1fef0b3aa5215212793b0a313c6a90bc1bba86bf), exact successful scripted [CI 40039626442](https://github.com/Jozzpoly/Coopege/actions/runs/40039626442). Later commits through `9a41b9c` were documentation-only.
- This report adds a reproducer. **No gameplay fix and no new owner-approved game** is claimed. Main, older experiments, Jaskinia, Feniks untouched.
- Isolated executable: `node research/coopege-e1/contact_deadlock.audit.mjs`. It reads the *actual* `src/core.js`, `src/episode.js` and source witness, constructs legal contact on real walkable original raster (90.5, 101.5–103.27), neutralizes rats ONLY within the targeted test, then advances the ordinary `step` API at 60 Hz. `--gate` intentionally exits **nonzero**: this is a known uncorrected quality gate, not a green build target.

## Measured reproduction on unchanged E1 game source
- Initial worker↔cart gap: 0.77 (nonoverlapping by both collision rules).
- The worker legally approaches until gap **0.705**; worker collision threshold is **0.700** (`rWorker .25 + rCart .47 - .02`).
- `canCartOccupy` requires gap at least **0.750** (`rCart .47 + rWorker .29 - .01`) for **every attempted substep**. Because existing gap is now 0.705, even an outward movement of the cart first fails the stricter test. A numerical **one-way trap**, regardless of whether the desired direction *increases* separation.
- From the reachable player side, 100 fixed-tick drag frames: cart 0.000 movement. A subsequent 120-tick push: cart 0.000; worker 0.000. With the worker moved away in a separate controlled setup, same pointer drag moves cart about 0.24965 world units. This validates the mechanism, not the exact Owner play geometry.
- `movePlayerWithContact` only transfers limited player motion to **one hard-coded cart**. No push propagation via cart↔worker or worker↔cart. `updateWorker` walks directly at fixed authored waypoints, and when `canOccupy` fails, it has **no reroute, local avoidance, yielding, back-off, request or intentional stop explanation**. The actor's `phase` remains outbound and its intent is not revisited.
- `canOccupy` / `canCartOccupy` also handle player, worker, rats, named NPCs differently. Rats chase worker in a separate physics-like loop and collision checks are not symmetrical. The current 'body physics' is hand-written cross-special-casing, not a shared contact/constraint model.
- Important limit: this reproduces a **representative deterministic legal lock**, not the exact Owner's state (their save/input trace was not captured). Other positions may permit a lateral walk-around or pull. Don't claim every such jam is mathematically unrecoverable.

## The deeper design failure
E1's scripted journey tests were too cooperative. CI asserted a courier path, rat hazard and delivery/restock, not **adversarial combinations** of movable props + other actors + player agency. A user discovered the broken negative case in minutes. We protected source continuity and green tests better than we protected credible play.
This is separate from aesthetics: A1 remains a richer RPG experience, E1 adds a narrow causal systems experiment. Mechanical tests alone can't justify promotion. Don't respond by building E2 NPCs or a prettier E1 before resolving the contact/agency contract.

## Product-level invariants (not "unstick NPC on every block")
1. **World truth:** solids cannot overlap/teleport and forces do not pass through static walls. A physically plausible obstruction may remain obstructed.
2. **Shared contacts:** player, porter, box/cart, creatures and walls must obey mutually consistent geometry/motion constraints. Starting in a *legal* configuration must never create a state where merely moving bodies **apart** is disallowed.
3. **Intent versus execution:** NPC movement requests can fail; NPCs must observe the failure and respond as meaningful actors (side-step, look for route, adjust speed, ask for help, stop, oppose pushing, eventually give up), without omniscience or magical collision overrides. Successful movement is not guaranteed. No infinite zero-progress routines.
4. **Interaction affordances:** when physically reasonable, a nearby actor/cart can be moved, pulled, turned or negotiated around using ordinary controls. If impossible because of weight/support/blocked access, failure is intelligible. No `3`/E-to-move-a-cell, forced teleport, automatic path rescue or free passage through collisions.
5. **Test behaviour at human-relevant limits:** continuous contact, different approach angles, corner/wall/actor sandwich, trapped player, multiple actors, variable tick rates, persistence/reload, combat and awareness. Measure both contact invariants **and possible recovery**.
6. **Feel still matters:** play at real zoom/control, visible contact feedback and consequences. Evaluate with A1 as complete-game baseline. The material system is a donor, not the whole game.

## Alternatives to falsify (do not decide now)
A. Unified *small* circle-contact solver with one radius definition, signed separation/penetration allowance, reciprocal impulses and minimal sweep and projection. Low integration cost, but risk of reinventing a brittle rigid-body solver. Must handle tangential glancing/push chains, not merely equalize .70/.75.
B. Isolated 2D rigid-body trial (Rapier 2D or Box2D 3.x) with true dynamic cart, deliberate player/worker character strategy, solid authored tile collider subset, resistance and reasonable mass. Official docs: https://rapier.rs/docs/user_guides/javascript/rigid_bodies/ , https://rapier.rs/docs/user_guides/javascript/character_controller/ , https://box2d.org/documentation/ . Rapier's character controller requires explicit configuration to apply impulses to dynamic bodies; **installing any solver does not automatically grant actor intelligence, fair agency, fun or memory**.
C. Simpler abstract/soft-contact model with explicit constraints and a small number of intentional movable objects, if A/B adds excessive cost without game-feel gain. Must **still** prove no artificial one-way traps, real recovery and truthful blocking.

Compare these on the **same locked contact geometry, alternate exits and save/restore** before choosing. Do not canonicalize simulation modes or final architecture.

## Next run, with clear stop rules
1. Verify current HEAD and baseline, run the red `--gate` to recover the exact failure.
2. Build tiny disposable A/B/C **contact playgrounds** outside Coopege game branch if needed. Instrument contacts (body IDs, normals, clearance, blocked reason, requested/applied movement, worker decision). Avoid generic architecture and unrelated art.
3. Play/test trapped cart/worker from ≥3 orientations, push, pull, wall squeeze, two bodies, recovery without teleport, and adverse state after save. If a test only swaps bad result for overlap or ghosting, reject it.
4. Once a contact scheme is credible, test NPC response to *meaningful* blockade as a separate cognition layer. Blocking a passage can be legitimate gameplay; an NPC who keeps trying forever or turns into an immovable bolt is not.
5. Integrate only a well-falsified thin seam into E1 and directly compare the resulting human-scale RPG experience with A1. Then resume actual scene quality/visual/character-richness work, not more "physics for physics's sake".
6. Preserve one living checkpoint `research/coopege-c1/ACTIVE.md`; keep Owner updates sparse and decisive. Don't request another Owner manual bug report as a prerequisite.

**Gate now: FAIL.** No auto-promotion or Owner play request until a playable recovery scenario and a truly better scene exist.
