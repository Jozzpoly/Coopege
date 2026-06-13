# Coopege M4 — raport lokalnego coopa dla dwóch graczy

- Data: 2026-06-12
- Workspace: `coopege@0.4.0-m4`
- Kamień milowy: M4 — zamknięty po końcowym `npm test`
- Następny kamień milowy: M5 — wspólny język gameplayu

## Werdykt

M4 spełnia kryteria technicznego vertical slice’u lokalnego coopa. Dwóch graczy działa w jednym `GameWorld` i korzysta z tej samej implementacji aktora, systemów ruchu, walki, zapisu oraz replayu. Nie dodano osobnego update’u, osobnego systemu kolizji ani zestawu wyjątków „P2”.

Automatyczna sesja Chromium potwierdza dołączenie P2, wspólną walkę, prawidłowe nagrody, zapis dwóch slotów, opuszczenie P2 i identyczne odtworzenie snapshotu v2. Osobny scenariusz przenosi całą drużynę na inne piętro pełnego zmigrowanego świata.

## Zaimplementowany zakres

### Gracze i wejście

- kolekcja graczy zarządzana przez `GameWorld`;
- wspólna fabryka `PlayerActor`;
- rozdzielone `playerId`, `entityId`, `classId` i `slotId`;
- `InputRouter` mapujący fizyczne lub wirtualne sloty na `PlayerCommand`;
- P1: klawiatura i mysz;
- P2: pierwszy gamepad przez Gamepad API;
- dołączenie P2 przyciskiem Start/A albo przez UI;
- join/leave bez rekonstruowania świata i bez resetowania P1.

### Kamera i ograniczenie rozdzielenia drużyny

- wspólne kadrowanie wszystkich żywych graczy na aktywnym piętrze;
- dynamiczny zoom na podstawie bounding boxu i marginesu 4 kafli;
- miękki tether 10 kafli;
- twardy tether 14 kafli;
- deterministyczna korekta pozycji respektująca kolizje.

### Walka, AI i nagrody

- jawny `DamageContext` z `sourceEntityId`, `ownerPlayerId` i `targetEntityId`;
- threat przechowywany osobno dla każdego gracza;
- wybór celu AI według threat zamiast globalnego gracza;
- friendly fire wyłączony;
- nagrody party/proximity w promieniu 12 kafli;
- całkowite XP `round(maxHp × 1.2)` oraz złoto `round(maxHp ÷ 8)`;
- stabilny podział całkowitoliczbowy, z resztą preferującą killera;
- tymczasowy token lootu dla killera;
- wspólny drużynowy kill credit questa.

### Piętra, zapis i replay

- `transitionParty` przenoszące wszystkich graczy jako zespół;
- czyszczenie target/threat przy zmianie piętra;
- save `coopege-save` schema v2;
- zapis wielu graczy, slotów, nagród, threat, RNG i aktywnego piętra;
- jawna migracja save v1→v2;
- checksum obejmujący stan wieloosobowy;
- deterministyczny replay dwóch graczy niezależny od render FPS.

## Wyniki automatyczne

### TypeScript i Node

- `npm run typecheck`: PASS;
- testy Node: **47/47 PASS**;
- brak testów pominiętych i niezaliczonych.

Dwanaście testów M4 obejmuje:

1. stabilne ID dwóch graczy i slotów;
2. niezależne mapowanie `InputRouter`;
3. join/leave bez resetu P1;
4. jednoczesny ruch obu graczy;
5. threat i target AI wielu graczy;
6. party rewards, loot killera i wspólny quest credit;
7. miękki/twardy tether;
8. wspólną kamerę;
9. save v2 i identyczny checksum po load;
10. migrację v1→v2;
11. drużynową zmianę piętra;
12. deterministyczny replay przy różnym render FPS.

### Golden fixture migracji

- `npm run verify:migration`: **51/51 PASS**;
- pełny świat, content i 45 PNG zachowują zapisane SHA-256.

### Chromium

Przechodzi **7/7** scenariuszy:

1. minimalny runtime;
2. pełny runtime Srebrnej Bramy;
3. most Runtime–Studio, atomowe odrzucenie, undo i sandbox;
4. wspólny AssetResolver — 45/45 grafik;
5. lokalny coop — P2, walka, nagrody, save v2 i restore;
6. drużynowa zmiana piętra na pełnym świecie;
7. authoring M3 — PNG, map delta/undo, content, checkpoint i standalone.

## Stabilizacja testu przeglądarkowego

Pierwsza końcowa bramka M4 ujawniła flakiness scenariusza Chromium: bot testowy poruszał P2 podczas walki, więc zależnie od czasu pierwszej klatki mógł oddalić się od celu. Nie zwiększono po prostu timeoutu. Scenariusz został przebudowany tak, aby:

- utworzyć deterministyczny snapshot pozycji testowych;
- ustawić jednopunktowe HP przeciwnika;
- wykonać atak P2 bez ruchu;
- sprawdzić reward event;
- odłączyć P2;
- wczytać snapshot i porównać go natychmiast po load.

Po tej zmianie pełny scenariusz przechodzi bez zależności od momentu pierwszej klatki renderowania.

## Kontrola kierunku architektury

- brak `PL2` i skopiowanych systemów drugiego gracza: PASS;
- urządzenie fizyczne oddzielone od komendy gameplayowej: PASS;
- AI i nagrody nie zależą od globalnego gracza: PASS;
- fixed-step i replay pozostają deterministyczne: PASS;
- save ma wersję i migrację: PASS;
- reguły coopa są zapisane w ADR-0010: PASS;
- multiplayer sieciowy nie został przedwcześnie rozpoczęty: PASS.

## Znane ograniczenia po M4

- fizyczny kontroler nie został jeszcze ręcznie sprawdzony na komputerze właściciela; automat używa wirtualnego źródła komend do tego samego slotu;
- runtime nadal aktywuje jednego potwora treningowego zamiast wszystkich 338 spawnów;
- authored linki pięter nie wywołują jeszcze `transitionParty`;
- loot jest licznikiem tokenów, nie systemem przedmiotów;
- quest credit jest technicznym licznikiem, nie pełnym systemem questów;
- brak downed/revive, rosteru, wyboru klasy P2 i indywidualnych profili;
- kamera i tether wymagają playtestu dwóch ludzi pod kątem odczucia, mimo poprawności geometrycznej.

## Kryteria akceptacji M4

- dwóch graczy działa w jednej powtarzalnej sesji: PASS;
- dwa niezależne źródła komend: PASS;
- wspólna kamera i tether: PASS;
- AI wielu graczy: PASS;
- jawna własność obrażeń i nagród: PASS;
- drużynowa zmiana piętra: PASS;
- zapis i odtworzenie wielu postaci: PASS;
- brak skopiowanej logiki drugiego gracza: PASS;
- pełna bramka testów: PASS.
