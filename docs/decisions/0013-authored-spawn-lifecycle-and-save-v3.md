# ADR-0013 — Authored spawn lifecycle i save v3

- Status: **zaakceptowany**
- Data: **2026-06-13**
- Milestone: **M7**

## Kontekst

Zmigrowany świat zawiera 338 authored spawn definitions. W M2–M6 runtime materializował jedynie technicznego potwora w pobliżu startu, więc mapa i zapis nie odzwierciedlały prawdziwego świata. Utworzenie wszystkich potworów jako stale aktywnych aktorów byłoby kosztowne, utrudniałoby coop oraz przeczyło przyszłemu modelowi autorytatywnego hosta LAN.

## Decyzja

Rozdzielamy trzy poziomy stanu:

1. `SpawnDefinition` — authoring i dane projektu;
2. `SpawnRuntimeState` — kanoniczna, trwała i serializowalna instancja spawnu;
3. `MonsterActor` — leniwie materializowany aktor tylko wtedy, gdy symulacja go potrzebuje.

Każda instancja otrzymuje stabilne ID wynikające ze spawn ID i indeksu: `<spawnId>.instance.<NNN>`. ID aktywnego aktora również wynika z instance ID, a nie z kolejności klatek lub globalnego licznika.

Aktywacja:

- mierzy dystans do najbliższego żywego gracza na aktywnym piętrze;
- nie uprzywilejowuje P1;
- używa osobnego promienia aktywacji i większego promienia dezaktywacji;
- respektuje deterministyczny limit aktywnych aktorów;
- sortuje kandydatów po stanie walki, dystansie i stabilnym ID.

Stan HP, threat, pozycji, cooldownu i respawnu pozostaje w `SpawnRuntimeState` również podczas snu. Respawn postępuje niezależnie od kamery i renderowania.

Save v3 zapisuje wszystkie kanoniczne stany spawnów, sloty graczy i aktywnych aktorów. Load waliduje dokładną zgodność instance ID z bieżącym projektem, odrzuca orphan state i rekonstruuje aktywne aktory ze stanu kanonicznego. Save v1 i v2 mają jawne migracje do v3.

## Konsekwencje pozytywne

- Pełne 338 spawnów żyje jako stan świata bez 338 aktywnych aktorów.
- P2 może samodzielnie aktywować własny region.
- Kamera, DOM i render FPS nie wpływają na lifecycle.
- Save/load w połowie walki odtwarza identyczną przyszłość symulacji.
- Stan nadaje się do serializacji jako snapshot autorytatywnego hosta LAN.
- Diagnostyka rozróżnia authored, active, sleeping, respawning i capped.

## Koszty i ograniczenia

- Save v3 jest większy, ponieważ przechowuje pełny stan 338 instancji.
- Aktualnie aktywne piętro jest wspólne dla drużyny; niezależne piętra graczy nie są wspierane.
- Placement solver jest deterministyczny i bezpieczny, ale nie zastępuje ręcznej korekty źle zaprojektowanych spawnów w Studio.
- M7 nie implementuje jeszcze transportu sieciowego ani predykcji klienta.

## Odrzucone alternatywy

- **338 stale aktywnych MonsterActorów** — zbyt kosztowne i trudniejsze do synchronizacji.
- **Aktywacja względem P1 lub kamery** — łamie coop i autorytatywną symulację.
- **Reset stanu po wyjściu z regionu** — powoduje exploity i niespójny respawn.
- **Losowe entity ID przy każdej aktywacji** — uniemożliwia stabilny save/replay/LAN.

## Weryfikacja

- 8 dedykowanych testów M7;
- regresja Node 70/70;
- Chromium: pełny runtime 338 spawnów, coop, piętra i save v3;
- Gameplay Gate 0.1: 15 minut symulowanego solo + 15 minut C0, po 6 cykli save/load i 2 przejścia pięter na tryb.
