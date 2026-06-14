# M8 LAN — plan minimalnego vertical slice

## Cel użytkowy

Dwie przeglądarki na dwóch urządzeniach w tej samej sieci otwierają adres hosta, sterują niezależnymi graczami i widzą ten sam autorytatywny świat. Rozłączenie klienta nie zatrzymuje hosta ani nie uszkadza zapisu.

## Zakres pierwszej implementacji

1. `@coopege/lan-protocol`: handshake, input, snapshot, ping/pong, disconnect i walidacja kopert.
2. `apps/lan-host`: HTTP + WebSocket, ładowanie projektu, autorytatywny fixed tick 30 Hz, przydział dwóch slotów i host-only save.
3. `apps/runtime` w trybie `lan-client`: brak lokalnego `GameWorld`, wysyłanie wejścia, bufor dwóch snapshotów i interpolacja renderera.
4. `dist/Coopege_M8_LAN_Client.html` oraz komenda `npm run lan:host` z czytelnym adresem LAN i tokenem sesji.
5. Diagnostyka: connection state, RTT, input age, tick drift, snapshot rate, rejected packets i reconnect/disconnect reason.

## Kolejność zmian

### VS-1 — kontrakt bez transportu — COMPLETE 2026-06-14

- typy i walidatory protokołu;
- deterministyczne kodowanie JSON;
- limity wiadomości i kody odrzucenia;
- testy handshake, ownershipu, duplicate/out-of-order i compatibility reject.

Implementacja: `packages/lan-protocol/src/`; testy: `tests/lan-protocol.test.ts`.

### VS-2 — host w jednym procesie — COMPLETE 2026-06-14

- Node uruchamia `GameWorld` i serwuje klienta;
- oba urządzenia korzystają z tej samej ścieżki WebSocket;
- host składa neutralne brakujące wejścia w `InputFrame` następnego ticka;
- save/load jest dostępny tylko po stronie hosta.

Implementacja: `apps/lan-host/src/`; uruchomienie: `npm run lan:host`; smoke test: `npm run test:lan-host`. Host ma dwa sloty, reconnect token, snapshoty 10 Hz, autosave i kontrolowane zamknięcie przez `shutdown`.

### VS-3 — klient i interpolacja — NEXT

- adapter fizycznego wejścia tworzy `PlayerCommand`, ale nie `InputFrame`;
- klient wysyła rosnące `inputSeq`;
- renderer odtwarza `WorldSnapshot` bez mutowania symulacji;
- brak prediction/rollback w pierwszym pionowym przekroju.

### VS-4 — awarie i diagnostyka

- timeout, rozłączenie, ponowne połączenie lub bezpieczne zwolnienie slotu;
- kontrolowane 50–250 ms latency, jitter, 1–10% drop, duplikaty i zmiana kolejności;
- host nadal tickuje i zapisuje świat po utracie klienta.

### VS-5 — dowód na dwóch urządzeniach

- host Windows uruchomiony jedną komendą;
- drugie urządzenie otwiera podany adres LAN;
- 15 minut gry, walka, przejście piętra, save hosta, disconnect i ponowne wejście;
- raport, manifest i SHA-256 gotowego klienta/paczki.

## Kontrakty nienaruszalne

- klient nie zatwierdza damage, dropu, spawnu, save’a ani ticka;
- stabilne `playerId`, `entityId` i spawn instance ID przechodzą przez protokół bez remapowania;
- `GameWorld` pozostaje niezależny od DOM, WebSocketu i renderera;
- save v3 nie jest używany jako częsty snapshot sieciowy;
- P1 i P2 używają tej samej ścieżki protokołu i gameplayu.

## Poza pierwszym zakresem

- publiczne serwery, konta, matchmaking i NAT traversal;
- host migration;
- produkcyjny anty-cheat;
- client-side prediction, rollback i delta compression;
- nowe systemy walki, progresji lub Studio.

## Gate ukończenia

- testy protokołu i deterministyki są zielone;
- dwa fizyczne urządzenia przechodzą 15-minutowy playtest;
- utrata klienta nie zmienia ownershipu save’a ani nie zatrzymuje hosta;
- diagnostyka pozwala odróżnić latency, brak inputu, tick drift i błąd kompatybilności;
- gotowy klient HTML i host mają prostą instrukcję Windows.
