# CURRENT MILESTONE — M8 LAN FOUNDATION / ENTRY REVIEW

## Status

**M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / NOT SUCCESSOR_REVIEWED**

M7 zostało jawnie zaakceptowane przez Przemka 2026-06-13. Aktywny następny etap to M8 LAN. Planowanie i audyt wejściowy są dozwolone; pierwsza zmiana implementacyjna wymaga niezależnego L2 Inheritance Review.

## Dokumenty obowiązkowe

1. `PROJECT_STATE.json`
2. `AI_PROJECT_MEMORY.md`
3. `docs/process/LAST_HANDOFF.md`
4. `docs/process/AGENT_HANDOFF_PROTOCOL_V2.md`
5. `docs/process/PLAYTEST_LOG.md`
6. `docs/process/OWNER_FEEDBACK.md`
7. `docs/product/COOPEGE_ROADMAP.md`
8. `docs/testing/M7_FINAL_VALIDATION_REPORT.md`
9. ADR-0003, 0004, 0008, 0010, 0011, 0013, 0014, 0015, 0016 i 0017

## Baseline

```powershell
npm ci --ignore-scripts
npm run validate
```

Oczekiwane: doctor bez FAIL, handoff bez FAIL, portability bez FAIL, legacy 4/4, TypeScript PASS, Node 94/94, migration 52/52, Chromium 9/9 + Ability Composer, server reuse PASS i Gameplay Gate PASS_AUTOMATED.

## Zamknięcie M7

Przemek potwierdził brak problemów z atlasami i animacjami terenu oraz zakończył M7 jako `ACCEPT_WITH_DEBT`. Odłożony problem lokalnego C0 z przestawianiem punktu respawnu solo jest zapisany w `OWNER_FEEDBACK.md` jako backlog i nie blokuje M8.

## Pierwszy rezultat M8 LAN

Po L2 review należy zbudować minimalny pionowy przekrój: autorytatywny host `GameWorld`, jeden klient LAN wysyłający input, wersjonowany handshake, snapshoty stanu, podstawowa interpolacja, czytelna diagnostyka połączenia oraz bezpieczny disconnect bez utraty save hosta.

Nie rozszerzaj jeszcze walki, progresji ani Studio. Priorytetem jest działający LAN na dwóch urządzeniach. Feedback właściciela przyjmuj przez czat i utrwalaj w `OWNER_FEEDBACK.md`, synchronizując wszystkie dokumenty bieżące.
