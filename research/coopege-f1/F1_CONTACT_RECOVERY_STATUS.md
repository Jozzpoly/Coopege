# Coopege F1 — Owner lockup recovery trial, not production physics
**24 Oct 2026 · isolated research branch, based on E1.**

## Source Owner incident
Owner physically blocked the porter using a wooden box/cart and was unable to move either afterward. This is a **player-observed GAMEPLAY FAIL**, not just a visual problem. The predecessor's red reproducer and root-cause audit remain protected at `research/coopege-e1/`. Do not suggest Owner tries the old mechanism again.

## Distinguish causes
1. **Numeric reciprocity failure:** worker-to-cart permitted radius `.25+.47-.02=.70`; inverse cart-to-worker disallowed anything below `.47+.29-.01=.75`. A legally approached gap `.705` trapped *even outward* movement. Player-to-worker thresholds also differed (`.525` versus `.58`) before F1.
2. **Actor cognition/execution failure:** porter only pursued fixed route points with zero progress handling. Hard collision was correct to resist forward movement, but the actor couldn't try a sidestep or communicate blockade.
3. **Scope/experience failure:** previous CI verified scripted deliveries and showed a visually impoverished world, not adversarial human manipulation and recovery. A1/Tibia is still richer as a game.

## F1 implemented (hypothesis, not canonical architecture)
- Shared player/worker/cart circle clearances use the same pair radius/tolerance `CONTACT_SLOP=.02`. Crucially, when a **legacy/pre-existing overlap** exists, a bounded cart substep that *strictly improves separation* may escape even before reaching the nominal minimum clearance. Movement that deepens penetration remains prohibited. Authored solid tile collisions remain hard.
- Player gripping cart remains a **continuous, proximity-limited pointer action**, not old key-triggered one-grid-cell movement. No instant relocation.
- Porter receives a **bounded local** cart detour: after detecting failure it checks two lateral candidate points and a continuation point against the same actual world collision/actor placement. It can choose a safe side, visibly sidestep, resume mission and persist its small intention through save/load. If no side is possible, records an observed blocked condition instead of tunnelling. This is not general pathfinding or emergent language.
- Player-to-porter clearance now uses matching `.28+.25-.02=.51` both ways. F1 has a separate browser localStorage identity `coopege-f1-contact-recovery-v1` and episode identity. Older builds are untouched.
- C1/E1 existing runtime actions, authored map, worker's vulnerable rat contact, merchant finite stock, persistence and restricted player knowledge remain in place.

## Evidence, gates and residual risk
- **Original exact E1 witness:** cart/worker legal approach `.77 -> .705`, outward hand-guidance 0, cart opposing push 0, worker stays still. Old F1 precursor reproducible in Node; the red gate lives at `research/coopege-e1/contact_deadlock.audit.mjs --gate`.
- **F1 isolated local Node matrix:** outward drag recovers roughly `.24965` world units for 4 axial plus 2 diagonal approaches, without reversing toward worker; 13 locally run targeted tests passed, including inward wall of contact, save during detour, independent worker return/rat threat. Exact CI additional contracts include two-body reversibility and a deliberately impossible flanking corridor.
- **F1 CI exact built source:** initial completed [PASS #40043192930](https://github.com/Jozzpoly/Coopege/actions/runs/40043192930) at `7cc8f0bae87c296d678890ac37dbb21ec3b082a8`. This was followed by a small real player↔porter symmetry improvement in source SHA `50fccfbb512a26eceb3862de0801415aff084e23`. Latest exact-source retest is [run #40043474893](https://github.com/Jozzpoly/Coopege/actions/runs/40043474893). **PASS:** exact-HEAD full CI completed successfully, including authored source integrity, former red blockade, 6-angle contact matrix, player↔porter contact, truly blocked passage, save/reload, normal-player Chromium expedition, unattended porter Chrome, and SHA-pinned A1 comparison. The latest commit after that SHA may contain only documentation.
- The test layouts are **controlled, reproducible physical configurations**, not captured coordinates from the Owner's actual play session. No guarantee every natural wall-sandwich or mass-of-actors state is recoverable.
- Known untested/high-risk edges: multiple movable bodies and force propagation chains, dynamic walls/editable geometry, arbitrary polygonal body shape/rotations, portable carried objects contacting actor stacks, stronger/weak characters, movement at varying tick sizes, contact near corners and high-speed tunnelling, actual human feel. The current rat↔worker response is still separately scripted; this is not a world-wide shared solver.
- Free movement need not always be possible. A cart blocked hard against a wall should NOT phase through it. A resident may choose to stay blocked or refuse; it must be intelligible and permit realistic player agency.

## Next direction — deliberately limited
Do NOT bolt a dozen new actor states onto F1. The first decision-changing next experiment is a **separate, small collider stress bench**, with identical staged human-relevant jam scenarios, comparing:
A. this thin shared-clearance + local detour;
B. an actual Rapier 2D or Box2D 3.x solver with explicit body type and control assumptions;
C. an intentionally simple abstract contact alternative when physically valid feel outweighs engineering complexity.
Measure recovery, tunnelling, angular contacts, collisions through 2–3 objects, effects of inertia/contact on control feel, portable state, deterministic/reproducible state and time/authoring cost. If one option dominates, port only the winning narrow seam into **an authored, rich RPG scene**. There is no reason to canonize F1, a new engine or architecture on a single lockup.

User-facing acceptance remains: does normal direct manipulation **feel right and allow reasonable troublemaking without world deadlocking**? Compared to A1, current art/gameplay quality is still FAIL, regardless of CI. Preserve the old builds, `main`, and Jaskinia.
