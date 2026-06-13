# Coopege M7 + M7A — raport testów

- Data końcowej weryfikacji: **2026-06-13**
- Wersja workspace: **0.7.1-m7a**
- Zakres: **authored spawns, save v3, Gameplay Gate 0.1, Asset Vault**

## Wynik końcowy

Końcowe `npm test` zakończyło się kodem wyjścia **0**. Osobno uruchomiono `npm run verify:legacy`, `npm run test:gameplay-gate` oraz `unzip -t` dla paczki Asset Vault.

| Bramka | Wynik |
|---|---:|
| TypeScript strict | PASS |
| Node | PASS 70/70 |
| Golden migration | PASS 51/51 |
| Chromium główny smoke | PASS 8/8 |
| Chromium Ability Composer | PASS 1/1 |
| Chromium razem | PASS 9/9 |
| Legacy byte integrity | PASS 4/4 |
| Gameplay Gate 0.1 automated | PASS_AUTOMATED |
| Ręczny playtest właściciela 15 min solo + 15 min C0 | **OTWARTE** |

## M7 — przypadki krytyczne

Dedykowane testy potwierdzają:

1. 338 authored definitions rozwija się do 338 stabilnych runtime instances, ale liczba aktywnych aktorów jest limitowana.
2. Aktywacja bierze najbliższego żywego członka drużyny; P2 budzi region bez P1.
3. Uśpienie i reaktywacja zachowują HP, threat i stabilne ID.
4. Respawn biegnie podczas snu i respektuje authored `respawnTicks`.
5. Hysteresis nie tworzy duplikatów po wielokrotnym wejściu/wyjściu.
6. `count > 1` i spawn w ścianie prowadzą do unikalnego, deterministycznego, walkowalnego placementu.
7. Save v3 w połowie walki odtwarza wszystkie stany i identyczny dalszy checksum.
8. Ponowne zastosowanie projektu po usunięciu instancji nie pozostawia orphan IDs.

Runtime Chromium potwierdza pełny świat pięciu pięter, 338 authored instances, leniwą materializację, limit 48, save v3, coop, przejście piętra i zgodność assetów.

## Gameplay Gate 0.1 — automatyczny soak

Każdy tryb wykonał 27 000 fixed ticks, czyli 15 symulowanych minut przy 30 Hz.

| Metryka | Solo | Coop C0 |
|---|---:|---:|
| Symulowane minuty | 15 | 15 |
| Maks. aktywnych aktorów | 14 | 15 |
| Przejścia pięter | 2 | 2 |
| Cykle save/load | 6 | 6 |
| Gameplay execution failures | 0 | 0 |
| Nagrody/kill credits | 51 | 77 |

Bot testowy jest celowo prosty. Obaj gracze kończą symulację martwi, dlatego wynik nie jest dowodem poprawnego balansu ani funu. Jest dowodem ciągłości lifecycle’u, save/load, pięter i deterministycznej symulacji. Ręczna sesja właściciela pozostaje wymagana.

Pełne dane wydania: `docs/testing/M7_GAMEPLAY_GATE_0.1.json` (kopia raportu wygenerowanego w `.build/gameplay-gate-0.1.json`).

## M7A — Asset Vault

- Oficjalny vault: 45 PNG, 5 kategorii, 48 plików łącznie z manifestem/contact sheet/README.
- Manifest: `coopege-asset-pack`, schema v1.
- Kontrole: safe path, CRC-32, PNG signature, 1–4096 px, 4 MB/PNG, ID mapping, dimensions, SHA-256.
- Batch import dwóch PNG wykonuje jedną komendę snapshot i cofa oba pliki jednym undo.
- Po customizacji eksport manifestu poprawnie rozróżnia 44 `legacy-placeholder` i 1 `custom`.
- Standalone runtime ładuje 45/45 assetów po edycji.
- `unzip -t dist/Coopege_M7A_Asset_Vault.zip`: brak błędów.

## Naprawa infrastruktury Chromium

Pierwotny runner mógł zawisnąć bez limitu komendy CDP. Dodano jawne timeouty, izolowane browser contexts oraz jeden współdzielony proces Chromium dla głównej serii. Testy zachowują izolację danych, ale nie płacą kosztu i ryzyka uruchamiania ośmiu procesów przeglądarki pod rząd.

## Znane ograniczenia

- Brak ręcznego Gameplay Gate właściciela; automatyczny soak nie ocenia sterowania, czytelności, tempa i balansu.
- Drużyna działa nadal na wspólnym aktywnym piętrze i wspólnym ekranie.
- Brak transportu LAN, hosta, klienta, predykcji i reconnectu — to M8.
- Asset Pack v1 obejmuje tylko PNG; contact sheet ma format HTML.
- Maksymalny limit aktywnych potworów i promienie są obecnie parametrami runtime, nie panelem ustawień Studia.
