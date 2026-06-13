# ADR — Stabilne ID i jawna własność

## Status
Zaakceptowane — 2026-06-12

## Decyzja
Każda encja runtime otrzymuje stabilne `entityId`. Efekty i obrażenia przenoszą jawne `sourceEntityId`, `ownerPlayerId`, `targetEntityId`, przyczynę oraz tick.

## Konsekwencje
- ID klasy nie jest ID postaci.
- Nie powstaje globalny skrót gracza ani kopia logiki `PL2`.
- Attribution XP, lootu i questów jest testowalne.
