# Coopege M5 — raport bezpiecznego języka gameplayu

- Data: 2026-06-13
- Workspace: `coopege@0.5.0-m5`
- Kamień milowy: M5 — zamknięty po końcowym `npm test`
- Następny kamień milowy: M6 — Ability Composer i authoring grafów

## Werdykt

M5 ustanawia wspólną, bezpieczną podstawę dla mechanik coopa i przyszłych edytorów. Podstawowy atak nie zadaje już obrażeń przez bezpośredni wyjątek w `GameWorld`; przechodzi przez zwalidowany graf oraz dwufazowy plan operacji. Questowy kill credit nie jest już dopisywany w hardkodowanej funkcji nagród — wykonuje go data-driven trigger `actor.died`.

Najważniejsza korzyść dla coopa polega na tym, że każdy graf otrzymuje jawny kontekst `sourceEntityId`, `ownerPlayerId`, cel, domenę i tick. P1, P2, potwór, przyszły przedmiot albo trigger mapy korzystają z tego samego interpretera, zamiast osobnych ścieżek kodu.

## Zaimplementowany zakres

### Schema projektu v2

- bieżący projekt i migracja Srebrnej Bramy mają `schemaVersion: 2`;
- dodano `gameplay.schemaVersion: 1`;
- umiejętności wskazują stabilny `graphId`;
- dostępna jest deterministyczna migracja v1→v2;
- fixture legacy schema v1 pozostaje nienaruszonym źródłem regresji;
- runtime, Studio, walidator i build korzystają ze wspólnego formatu v2.

### Język i rejestry

- węzły: Condition, Target Query, Action, Effect, End;
- osobne typowane rejestry prymitywów;
- sześć domen: ability, item-effect, talent-modifier, ai-action, quest-reaction, map-trigger;
- triggery zdarzeń gameplayowych;
- deterministyczne sortowanie targetów;
- execution trace i licznik kroków;
- limit 1..256 kroków, domyślnie 64;
- całkowity zakaz cykli w language v1;
- brak `eval`, `Function` i wykonywalnego kodu z projektu.

### Integracja z GameWorld

- atak gracza i potwora wykonuje graf umiejętności;
- nearest-hostile query respektuje rodzaj źródła, zasięg, facing i preferred AI target;
- operacje są najpierw planowane i prewalidowane, potem commitowane;
- DamageContext zachowuje źródło i właściciela gracza;
- trigger `actor.died` przyznaje wspólny quest kill credit;
- event wrapper uruchamia triggery i blokuje rekurencyjne ponowne wejście tego samego eventu;
- błędy są emitowane jako `gameplay.execution_failed` i widoczne w diagnostyce runtime.

### Fixture sześciu domen

Projekt fundamentu zawiera sześć kontrolowanych grafów/bindingów:

1. ability — podstawowy atak;
2. item-effect — leczenie tonicem;
3. talent-modifier — Guardian Focus;
4. ai-action — treningowy atak AI;
5. quest-reaction — credit po śmierci potwora;
6. map-trigger — leczniczy sigil.

Ability i quest reaction są podłączone do bieżącego gameplayu. Pozostałe cztery przechodzą ten sam interpreter i walidację w testach, ale ich pełne systemy authoringowe nie są jeszcze gotowe.

## Wyniki automatyczne

### TypeScript i Node

- `npm run typecheck`: PASS;
- testy Node: **53/53 PASS**;
- brak testów pominiętych i niezaliczonych.

Nowe testy M5 obejmują:

1. deterministyczną migrację v1→v2 oraz obecność sześciu domen;
2. odrzucenie nieznanego prymitywu, niepoprawnego parametru i cyklu;
3. atomowe odrzucenie błędnego grafu przez `AtomicProjectHost`;
4. zatrzymanie interpretera przed commit po przekroczeniu budżetu;
5. wykonanie sześciu domen przez te same rejestry z zachowaniem ownershipu;
6. deterministyczny trigger `actor.died` naliczający credit tylko dla potwora.

### Golden fixture migracji

- `npm run verify:migration`: **51/51 PASS**;
- legacy fixture schema v1, świat 5×200×200 i 45 PNG zachowują zapisane SHA-256;
- plik v2 jest generowany osobno i nie zmienia referencyjnego fixture’u v1.

### Chromium

Przechodzi **8/8** scenariuszy:

1. minimalny runtime;
2. pełny runtime Srebrnej Bramy;
3. most Runtime–Studio, atomowe odrzucenie, undo i sandbox;
4. 45/45 assetów runtime;
5. lokalny coop, nagrody i save v2;
6. drużynowa zmiana piętra;
7. M5 gameplay language: schema v2, 6 grafów, 6 domen, dwóch graczy, grafowy atak, data-driven quest credit i 0 execution failures;
8. authoring Studia: PNG, map delta/undo, content, checkpoint i standalone export.

## Stabilizacja scenariusza M5

Pierwsza pełna bramka ujawniła flakiness nowego testu Chromium. Test wysyłał pojedynczy impuls ataku P1, a potwór mógł zmienić pozycję pomiędzy klatką ustawienia snapshotu a przetworzeniem komendy. Nie zwiększono timeoutu. Test został przebudowany na ciągłą, wirtualną komendę P2 podawaną do dokładnie tego samego logicznego slotu co fizyczny gamepad. Po przyznaniu creditu komenda jest natychmiast czyszczona.

Dzięki temu test sprawdza język gameplayu i ownership coopa bez zależności od pojedynczej granicy klatki.

## Kontrola kierunku architektury

- wspólny interpreter zamiast executorów P1/P2: PASS;
- brak dowolnego JavaScriptu w contentcie: PASS;
- jawny ownership każdej operacji: PASS;
- plan przed mutacją świata: PASS;
- deterministyczne query i kolejność triggerów: PASS;
- schema z migracją zamiast cichego złamania projektu: PASS;
- Studio i runtime używają tej samej walidacji: PASS;
- wszystkie testy M0–M4 nadal przechodzą: PASS.

## Znane ograniczenia po M5

- pełny model przedmiotów, talentów i mapowych triggerów jeszcze nie istnieje; ich bindingi są fundamentem i fixture’ami;
- Studio nie ma jeszcze wizualnego edytora grafów;
- language v1 nie wspiera cykli, opóźnień, równoległych gałęzi ani podgrafów;
- parametrów prymitywów nie opisuje jeszcze wspólny katalog metadanych UI;
- commit prewaliduje obsługiwane operacje, lecz nie ma jeszcze ogólnego mutation journal dla nieoczekiwanego błędu programistycznego w połowie commitowania;
- fizyczny gamepad nadal wymaga ręcznego testu na komputerze właściciela;
- runtime nadal aktywuje jeden kontrolowany spawn treningowy zamiast wszystkich 338 authored spawnów.

## Kryteria akceptacji M5

- wspólny, wersjonowany język gameplayu: PASS;
- sześć domen na jednym interpreterze: PASS;
- brak wykonywalnego kodu w definicjach: PASS;
- ownership coopa zachowany: PASS;
- podstawowy atak działa przez graf: PASS;
- quest reaction działa przez trigger: PASS;
- błędny graf nie zmienia aktywnego projektu: PASS;
- deterministyczność i limity wykonania: PASS;
- pełna regresja Node, migration i Chromium: PASS.
