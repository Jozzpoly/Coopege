# CURRENT MILESTONE - M8 LAN FOUNDATION / VS-4 FAILURES AND RECONNECT

## Status

**M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**
**M8 IMPLEMENTATION IN_PROGRESS / VS-1, VS-2 AND VS-3 COMPLETE**

Niezależny L2 Inheritance Review zakończył się `PASS` 2026-06-14. Protokół, autorytatywny host i grywalny klient renderujący snapshoty są ukończone. Następny rezultat to odporność połączenia VS-4.

## Dokumenty obowiązkowe

1. `PROJECT_STATE.json`
2. `AI_PROJECT_MEMORY.md`
3. `docs/process/LAST_HANDOFF.md`
4. `docs/process/OWNER_FEEDBACK.md`
5. `docs/process/M8_LAN_VERTICAL_SLICE_PLAN.md`
6. `docs/process/M8_LAN_HOST_VS2.md`
7. `docs/process/M8_LAN_CLIENT_VS3.md`
8. `docs/decisions/0018-m8-lan-authoritative-host-and-websocket-protocol.md`
9. `docs/decisions/0019-party-respawn-anchor-and-save-normalization.md`

## Ukończone VS-1 i VS-2

- wersjonowany `coopege-lan` v1 z compatibility i input admission;
- autorytatywny host Node z `GameWorld` 30 Hz, snapshotami 10 Hz i host-only save;
- dwa stabilne sloty, per-client ACK, reconnect token, ping/pong i neutralny fallback inputu;
- HTTP i WebSocket `/lan` na jednym porcie, token URL, autosave i kontrolowany `shutdown`.

## Ukończone VS-3

- `dist/Coopege_M8_LAN_Client.html` jest budowany i serwowany przez hosta;
- klient nie tworzy lokalnego `GameWorld` i wysyła tylko `PlayerCommand` przydzielonego gracza;
- snapshoty zawierają identyfikatory wizualne i promień aktora;
- bufor odrzuca duplicate/out-of-order, ogranicza pamięć i interpoluje graczy oraz potwory;
- wspólny renderer obsługuje lokalny runtime i snapshot LAN bez mutowania symulacji;
- HUD pokazuje connection state, RTT, ACK, input age, tick drift, snapshot rate, bufor i rejected inputs;
- Chromium potwierdza dwóch klientów, realny ruch klawiaturą, rendering świata i brak lokalnego save/API świata.

## Następny rezultat VS-4

1. Timeout nieaktywnego lub zerwanego klienta.
2. Czytelne powody disconnect/reject i kontrolowana polityka reconnectu lub zwolnienia slotu.
3. Kontrolowane profile 50-250 ms latency, jitter, 1-10% drop, duplicate i reordering.
4. Potwierdzenie, że host nadal tickuje i zapisuje świat po utracie klienta.

## Kolejność

1. **VS-1 - COMPLETE:** kontrakt i walidatory.
2. **VS-2 - COMPLETE:** autorytatywny host HTTP/WebSocket.
3. **VS-3 - COMPLETE:** grywalny render-only klient z interpolacją.
4. **VS-4 - NEXT:** awarie, timeout i reconnect.
5. VS-5: 15-minutowy playtest na dwóch fizycznych urządzeniach.

## Potwierdzony baseline

TypeScript PASS, Node 111/111 PASS, Chromium 10/10 + Ability Composer PASS, host smoke PASS i grywalny LAN browser smoke PASS. Końcowa bramka `npm run validate` musi przejść po aktualizacji manifestów.

## Dług przyjęty

`OF-001` lokalnego coopa ma status `FIXED_NEEDS_RETEST` i zgodnie z decyzją właściciela nie blokuje M8. Publiczne serwery, matchmaking, NAT traversal, prediction, rollback i host migration pozostają poza pierwszym zakresem.

Feedback właściciela przyjmuj przez czat i utrwalaj w `OWNER_FEEDBACK.md`, synchronizując dokumentację, kod, testy i gotowy `dist`.
