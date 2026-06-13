# ADR — Fixed tick i rozdzielone RNG

## Status
Zaakceptowane — 2026-06-12

## Decyzja
Gameplay działa w stałym ticku. RNG symulacji, dropu i efektów wizualnych stanowią osobne strumienie.

## Konsekwencje
- FPS renderowania nie może zmieniać wyniku gameplayu.
- Cząsteczki nie zużywają losowań autorytatywnej symulacji.
- Replaye i checksumy mogą być powtarzalnie testowane.
