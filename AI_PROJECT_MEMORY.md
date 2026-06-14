# AI_PROJECT_MEMORY — COOPEGE

> Krótkie źródło prawdy technicznej. Szczegóły historyczne są w ADR-ach i raportach; wizja w dokumentach product.

- Wersja pamięci: **10**
- Data: **2026-06-14**
- Workspace: **0.8.0-m8-lan-vs3**
- Status: **M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**
- Ukończone: M7 Finalization / Owner Validation
- Aktywne: **M8 LAN Foundation / VS-4 Failures and Reconnect**
- M8 LAN: niezależny L2 Inheritance Review zakończony `PASS` 2026-06-14; VS-1, VS-2 i VS-3 są ukończone, następny krok to VS-4

## Start głównego agenta

1. `START_HERE.md`
2. `PROJECT_STATE.json`
3. ten plik
4. `docs/process/CURRENT_MILESTONE.md`
5. `docs/process/LAST_HANDOFF.md`
6. `docs/process/OWNER_FEEDBACK.md`
7. najnowszy `PLAYTEST_LOG.md`
8. wskazane ADR-y
9. przy pierwszym przejęciu roli: `COOPEGE_SOUL.md`, `AGENT_SOUL.md`, `PANTHEON.md`, roadmapa

Następnie wykonaj `npm ci --ignore-scripts` i `npm run validate`. Kod, testy i aktualne ADR-y wygrywają ze starym opisem.

## Niezmienne kontrakty

- modularny TypeScript i generowane standalone HTML;
- project schema v2 ze wspólnym walidatorem;
- fixed tick 30 Hz, deterministyczny RNG, stable IDs i checksumy;
- kanoniczny `GameWorld` niezależny od DOM, kamery i renderera;
- save v3, serializowalne authored spawns i jawny ownership graczy;
- brak arbitrary JavaScript w contencie;
- Studio preview przez wersjonowany `postMessage`, nonce i sandbox;
- zmiana schema/save/protocol/asset IDs wymaga migracji.

## Stan M7

- 5 pięter 200×200, 18 kafli, 3 klasy, 15 umiejętności, 6 potworów;
- 338 authored spawnów rozwijanych do 338 kanonicznych stanów; cap aktywnych aktorów 48;
- party-aware aktywacja bez uprzywilejowania P1, sleep/respawn/HP/threat poza kamerą;
- save v3 z graczami, slotami, RNG, piętrem i pełnym lifecycle spawnów;
- atomowe odrzucanie uszkodzonego save’a;
- 24 walidowane transitions uruchamiane realnym wejściem P1 albo P2 na schody;
- deterministyczny tie-break i bezpieczne rozmieszczenie drużyny;
- `TextureFrameLayout`, atlasy graczy 80×80 z zachowaną skalą i stabilnym pivotem;
- teren używa deterministycznych wariantów; animowane pozostają woda i lawa;
- aim myszy przeliczany co tick względem aktualnej kamery;
- P2: strzałki + prawy Ctrl/Numpad0 albo gamepad; edge-triggered join bez natychmiastowego rejoinu;
- Asset Vault: 45 PNG, manifest, contact sheet, import/export ZIP, SHA/CRC/layout validation;
- Windows-safe build, publiczny npm registry, gotowy `dist`, launchery i diagnostyka;
- drugi launcher tej samej kopii bezpiecznie używa działającego serwera; inna kopia na porcie daje jasny błąd.

## Wejście do M8

- L2 review: **PASS**, raport `docs/reviews/M8_ENTRY_L2_INHERITANCE_REVIEW_2026-06-14.md`;
- baseline ponownie potwierdzony bez odchyleń;
- architektura M8: autorytatywny host Node, obie przeglądarki jako równorzędni klienci WebSocket;
- klient wysyła tylko wersjonowane komendy, host składa `InputFrame` i posiada save;
- snapshot sieciowy jest osobnym formatem prezentacyjnym, nie save v3;
- pierwszy zakres nie obejmuje prediction, rollbacku, host migration ani publicznego internetu.

## Stan M8

- `@coopege/lan-protocol` v1 jest niezależny od transportu i od DOM;
- handshake sprawdza engine, project ID, checksum i token sesji;
- koperty obejmują hello/welcome/reject, input, snapshot, ping/pong i disconnect;
- wiadomości mają deterministyczne kodowanie JSON i limit 64 KiB;
- input admission odrzuca brak ownershipu, złą sesję, duplicate, out-of-order oraz zbyt stary/przyszły tick;
- snapshot prezentacyjny ma limity graczy/aktorów oraz kontrolę unikalności ID i active floor;
- `apps/lan-host` uruchamia autorytatywny `GameWorld` 30 Hz oraz HTTP/WebSocket `/lan`;
- dwa równorzędne połączenia dostają stabilne sloty, reconnect token i per-client ACK;
- host składa neutralny input dla brakujących komend i publikuje snapshoty 10 Hz;
- disconnect nie usuwa świata, a autosave i kontrolowany `shutdown` utrzymują ownership zapisu po stronie hosta;
- host serwuje grywalny `Coopege_M8_LAN_Client.html` z checksumą zgodną z projektem hosta;
- klient nie tworzy lokalnego `GameWorld`, wysyła `PlayerCommand` 30 Hz i renderuje snapshoty przez wspólny renderer;
- `LanSnapshotBuffer` odrzuca duplicate/out-of-order, ogranicza pamięć i interpoluje pozycje bez przechodzenia przez zmianę piętra;
- HUD klienta pokazuje RTT, ACK, input age, tick drift, snapshot rate, bufor i rejected inputs;
- lokalny C0 używa jednej kotwicy respawnu drużyny; starsze rozbieżne save'y są normalizowane.

## Potwierdzony baseline

- Doctor: **18 PASS / 0 WARN / 0 FAIL**
- Handoff gate: **PASS**
- Portability: **21 PASS / 0 WARN / 0 FAIL**
- TypeScript: **PASS**
- Node: **111/111 PASS**
- Golden migration: **52/52 PASS**
- Chromium: **10/10 PASS**
- Ability Composer: **PASS**
- Legacy: **4/4 PASS**
- Dev-server reuse: **PASS**
- LAN host/client smoke: **HTTP + 2 WebSocket + input ACK + ping/pong + native movement + render-only client + shutdown save PASS**
- Gameplay Gate: **27 000 ticków solo + 27 000 C0, saves 6/6 — PASS_AUTOMATED**
- Clean-package install/build/check/portability/handoff/legacy: **PASS**
- Owner playtest: **ACCEPT_WITH_DEBT, 2026-06-13**

## Otwarte ograniczenia

- wczesny content, balans i feel;
- brak pełnych osobnych clipów attack/death;
- transitions nie mają pełnego CRUD w Studio;
- P2 keyboard zależy od key rollover klawiatury;
- poprawka lokalnego respawnu C0 ma status `FIXED_NEEDS_RETEST`;
- brak timeoutów klienta, automatycznego reconnectu i kontrolowanych profili latency/jitter/drop;
- reconnect hosta istnieje na poziomie tokenu slotu, ale pełny UX i polityka zwolnienia slotu należą do VS-4;
- brak docelowych systemów itemów, questów/dialogów, talentów i authoringu AI;
- headless Chromium/CDP w długiej serii kontenerowej bywa niestabilne infrastrukturalnie; scenariusze mają timeouty, izolację i pełny pass, ale ręczna walidacja Windows pozostaje nadrzędna.

## Źródła

- status maszynowy: `PROJECT_STATE.json`
- zakres: `docs/process/CURRENT_MILESTONE.md`
- handoff: `docs/process/LAST_HANDOFF.md`
- protokół: `docs/process/AGENT_HANDOFF_PROTOCOL_V2.md`
- L2 review: `docs/reviews/M8_ENTRY_L2_INHERITANCE_REVIEW_2026-06-14.md`
- plan M8 LAN: `docs/process/M8_LAN_VERTICAL_SLICE_PLAN.md`
- decyzja sieciowa: `docs/decisions/0018-m8-lan-authoritative-host-and-websocket-protocol.md`
- host VS-2: `docs/process/M8_LAN_HOST_VS2.md`
- klient VS-3: `docs/process/M8_LAN_CLIENT_VS3.md`
- raport: `docs/testing/M7_FINAL_VALIDATION_REPORT.md`
- instrukcja testu: `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`
- trwały feedback właściciela: `docs/process/OWNER_FEEDBACK.md`
