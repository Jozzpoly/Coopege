# ADR — Nowy rdzeń i kontrolowana migracja

## Status
Zaakceptowane — 2026-06-12

## Decyzja
Budujemy nowy rdzeń, a legacy zachowujemy bez zmian jako referencję i źródło migracji.

## Konsekwencje
- Każdy element migracji otrzymuje jawny status.
- Nieobsługiwane zachowania są raportowane, nie przybliżane po cichu.
- Nowego gameplayu nie dopisujemy do legacy głównej linii.
