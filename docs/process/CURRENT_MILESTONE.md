# CURRENT MILESTONE - M8 LAN FOUNDATION / VS-3 CLIENT

## Status

**M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**
**M8 IMPLEMENTATION IN_PROGRESS / VS-1 AND VS-2 COMPLETE**

Niezależny L2 Inheritance Review zakończył się `PASS` 2026-06-14. Kontrakt VS-1 i autorytatywny host Node VS-2 są ukończone. `implementationStarted=true`; następny rezultat to klient runtime VS-3.

## Dokumenty obowiązkowe

1. `PROJECT_STATE.json`
2. `AI_PROJECT_MEMORY.md`
3. `docs/process/LAST_HANDOFF.md`
4. `docs/process/OWNER_FEEDBACK.md`
5. `docs/process/M8_LAN_VERTICAL_SLICE_PLAN.md`
6. `docs/decisions/0018-m8-lan-authoritative-host-and-websocket-protocol.md`
7. `docs/decisions/0019-party-respawn-anchor-and-save-normalization.md`
8. `docs/reviews/M8_ENTRY_L2_INHERITANCE_REVIEW_2026-06-14.md`
9. `docs/product/COOPEGE_ROADMAP.md`
10. `docs/process/M8_LAN_HOST_VS2.md`

## Ukończone VS-1

- osobny protokół `coopege-lan` v1, niezależny od WebSocketu i DOM;
- hello/welcome/reject z engine version, project ID, checksum i tokenem sesji;
- client input z `inputSeq`, `clientTick`, timestampem i `PlayerCommand`;
- ograniczony snapshot prezentacyjny z ACK, active floor, graczami, aktorami, eventami i diagnostyką;
- deterministyczne kodowanie JSON oraz limit 64 KiB;
- walidacja compatibility, unikalności ID i active floor;
- admission inputu: ownership, session/player identity, duplicate, out-of-order i tick age;
- testy protokołu oraz aktualizacja package-lock.

## Poprawka fundamentu

`OF-001` ma status `FIXED_NEEDS_RETEST`. P1 i P2 używają jednej kotwicy respawnu drużyny, respawn wybiera wolne pole, a loader naprawia stare save'y z rozbieżnym `spawnPosition`. Decyzja: ADR-0019.

## Ukończone VS-2

- `apps/lan-host` uruchamia jeden autorytatywny `GameWorld` 30 Hz;
- HTTP i WebSocket `/lan` działają w tym samym procesie i na tym samym porcie;
- dwa równorzędne połączenia dostają stabilne sloty, reconnect token i ACK własnego inputu;
- brak komendy daje neutralny input następnego ticka;
- snapshoty 10 Hz zawierają aktywne encje i eventy, ale nie save v3;
- disconnect nie usuwa gracza ani świata;
- host ładuje save, wykonuje autosave i zapisuje świat przy komendzie `shutdown`;
- `npm run test:lan-host` potwierdza realny HTTP + dwa WebSockety + ACK + ping/pong + shutdown save.

## Następny rezultat VS-3

Runtime w trybie `lan-client` nie tworzy lokalnego `GameWorld`. Adapter wejścia wysyła `PlayerCommand`, klient buforuje dwa snapshoty, interpoluje pozycje i pokazuje diagnostykę połączenia bez zatwierdzania gameplayu.

## Kolejność

1. **VS-1 - COMPLETE:** kontrakt i walidatory `@coopege/lan-protocol`.
2. **VS-2 - COMPLETE:** host HTTP + WebSocket z autorytatywnym fixed tickiem.
3. **VS-3 - NEXT:** runtime `lan-client` z interpolacją dwóch snapshotów.
4. VS-4: timeout, disconnect, reconnect lub bezpieczne zwolnienie slotu.
5. VS-5: latency/jitter/drop i 15-minutowy playtest na dwóch urządzeniach.

## Potwierdzony baseline

TypeScript PASS, Node 107/107 PASS po aktualizacji stanu, host smoke PASS. Pełna bramka `npm run validate` musi zostać wykonana po przebudowie `dist` i manifestów przed przekazaniem zmian.

## Poza pierwszym zakresem

- publiczne serwery, konta, matchmaking i NAT traversal;
- prediction, rollback i host migration;
- rozbudowa walki, progresji i Studio.

Feedback właściciela przyjmuj przez czat i utrwalaj w `OWNER_FEEDBACK.md`, synchronizując dokumentację, kod, testy i gotowy `dist`.
