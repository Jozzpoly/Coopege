# M7 FINAL VALIDATION CANDIDATE — TEST REPORT

> **PÓŹNIEJSZY STATUS:** niezależny L2 Inheritance Review wejścia do M8 zakończył się `PASS` 2026-06-14. Poniższy status `NOT SUCCESSOR_REVIEWED` opisuje chwilę zamknięcia M7.

- Wersja zamykająca: **0.7.5-m7-owner-accepted**
- Data: **2026-06-13**
- Status: **TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / NOT SUCCESSOR_REVIEWED**

## Zamknięcie właścicielskie — 2026-06-13

Przemek potwierdził usunięcie problemów z atlasami tekstur i animacją/wariantami terenu oraz zdecydował o przejściu do M8. M7 zostaje zamknięte jako `ACCEPT_WITH_DEBT`. Odłożony problem lokalnego C0 z przestawianiem punktu respawnu solo ma status `BACKLOG` w `docs/process/OWNER_FEEDBACK.md` i nie blokuje M8 LAN.

## Cel

Domknąć M7 jako świadomy fundament przed M8: prawdziwe ścieżki gracza, przenośność Windows, spójne przekazanie agentów i brak uprzywilejowania P1.

## Najważniejsze poprawki finalnej rewizji

- poprawka owner feedback: P2 jest usuwany z threat aktywnych i uśpionych spawnów przed zapisem solo;
- stabilne warianty terenu wybierane z seeda i współrzędnych; animowane pozostają woda i lawa;
- atlasy graczy 80x80 zachowują skalę i pivot, ale mieszczą broń oraz stopy w czterech kierunkach;
- zgodne z Node 24 uruchamianie npm przez skrypty doctor, test i diagnostics na Windowsie;
- dynamiczny `TextureFrameLayout` i pivot zamiast hardcoded 32 px;
- 24 authored transitions uruchamiane wejściem P1/P2;
- P2 keyboard bez gamepada;
- aim myszy przeliczany względem bieżącej kamery;
- edge-triggered join P2 i ochrona przed natychmiastowym rejoinem;
- server reuse oraz wykrywanie innej kopii na zajętym porcie;
- publiczny registry, Windows-safe atomowy build i locked `npm ci`;
- Handoff Protocol v2, `PROJECT_STATE.json`, `LAST_HANDOFF.md` i automatyczny handoff gate;
- izolacja, timeouty i retry testów Chromium.

## Wyniki

| Bramka | Wynik |
|---|---:|
| Doctor | 18 PASS / 0 WARN / 0 FAIL |
| Handoff | 40 PASS / 0 FAIL |
| Portability | 21 PASS / 0 WARN / 0 FAIL |
| TypeScript | PASS |
| Node | 94/94 PASS |
| Migration | 52/52 PASS |
| Legacy | 4/4 PASS |
| Chromium | 9/9 PASS |
| Ability Composer | PASS |
| Dev-server reuse | PASS |
| Gameplay Gate | 27 000 solo + 27 000 C0; saves 6/6 PASS |
| Asset Vault | 45/45 PNG + manifest/contact sheet PASS |
| Reprodukowalność Asset Vault | 2 kolejne buildy, identyczny SHA-256 ZIP PASS |
| Ręczny browser QA | 2 graczy, kompletne atlasy, brak błędów konsoli, save P2 -> solo -> load PASS |
| Clean package | fresh `npm ci`, build, check, doctor, handoff, portability, legacy, server reuse and gameplay gate PASS |

## Kontrprzykłady

Sprawdzono między innymi: P2 bez gamepada, P2 odłączany przy trzymanym klawiszu, schody przez normalny input, save/load po transition, wszystkie 24 przejścia osiągalne, konflikt dwóch schodów, P2 dołączający po zmianie piętra, uszkodzony save, atlas o złych wymiarach, ponowny launcher, czysty lockfile i brak prywatnych URL-i.

## Ograniczenie infrastruktury testowej

Headless Chromium/CDP w długich, wielokrotnie powtarzanych seriach kontenerowych bywa niestabilne mimo ukończenia scenariuszy. Testy są izolowane, limitowane czasowo i mają retry; pełne 9/9 oraz Ability Composer zostały potwierdzone. Decydująca walidacja odbywa się na Windowsie Przemka.

## Otwarte

M7 jest zamknięte decyzją właściciela. Otwarte pozostają wczesny feel, balans i rozwój rozgrywki, ale nie są blockerami zakończonego milestone. M8 LAN przechodzi do entry review; `SUCCESSOR_REVIEWED` pozostaje false do niezależnego audytu następcy.
