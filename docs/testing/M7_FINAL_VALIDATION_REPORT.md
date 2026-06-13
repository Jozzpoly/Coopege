# M7 FINAL VALIDATION CANDIDATE — TEST REPORT

- Wersja: **0.7.3-m7-validation-candidate**
- Data: **2026-06-13**
- Status: **TECH_VERIFIED / NOT SUCCESSOR_REVIEWED / NOT OWNER ACCEPTED**

## Cel

Domknąć M7 jako świadomy fundament przed M8: prawdziwe ścieżki gracza, przenośność Windows, spójne przekazanie agentów i brak uprzywilejowania P1.

## Najważniejsze poprawki finalnej rewizji

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
| Doctor | 17 PASS / 1 env WARN / 0 FAIL |
| Handoff | 24 PASS / 0 FAIL |
| Portability | 21 PASS / 0 WARN / 0 FAIL |
| TypeScript | PASS |
| Node | 90/90 PASS |
| Migration | 52/52 PASS |
| Legacy | 4/4 PASS |
| Chromium | 9/9 PASS |
| Ability Composer | PASS |
| Dev-server reuse | PASS |
| Gameplay Gate | 27 000 solo + 27 000 C0; saves 6/6 PASS |
| Asset Vault | 45/45 PNG + manifest/contact sheet PASS |
| Clean package | fresh `npm ci`, build, check, doctor, handoff, portability, legacy, server reuse and gameplay gate PASS |

## Kontrprzykłady

Sprawdzono między innymi: P2 bez gamepada, P2 odłączany przy trzymanym klawiszu, schody przez normalny input, save/load po transition, wszystkie 24 przejścia osiągalne, konflikt dwóch schodów, P2 dołączający po zmianie piętra, uszkodzony save, atlas o złych wymiarach, ponowny launcher, czysty lockfile i brak prywatnych URL-i.

## Ograniczenie infrastruktury testowej

Headless Chromium/CDP w długich, wielokrotnie powtarzanych seriach kontenerowych bywa niestabilne mimo ukończenia scenariuszy. Testy są izolowane, limitowane czasowo i mają retry; pełne 9/9 oraz Ability Composer zostały potwierdzone. Decydująca walidacja odbywa się na Windowsie Przemka.

## Otwarte

Ręczny owner test, feel, balans, czytelność mapy i dłuższa realna sesja. M8 nie zostało rozpoczęte. `SUCCESSOR_REVIEWED` i `OWNER_ACCEPTED` pozostają false.
