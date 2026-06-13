# Coopege M3 — raport parity głównych workflow authoringowych

- Data: 2026-06-12
- Workspace: `coopege@0.3.0-m3`
- Kamień milowy: M3 — zamknięty
- Następny kamień milowy: M4 — lokalny coop dla dwóch graczy

## Werdykt

M3 spełnia kryteria wyjścia. Właściciel może otworzyć zmigrowany projekt, podmienić grafikę PNG, edytować pięciopoziomową mapę i podstawowy content, cofnąć operacje, utworzyć checkpoint, zobaczyć zmiany w odizolowanym runtime oraz wyeksportować standalone HTML bez edycji kodu.

Preview i standalone build powstają z dokładnie tego samego zwalidowanego snapshotu `ProjectStore`.

## Zaimplementowany zakres

### Wspólny system assetów

- jeden `AssetResolver` dla runtime i Studia;
- obsługa kontrolowanych ścieżek projektu, proceduralnych placeholderów i PNG data URL;
- osadzanie 45 zmigrowanych PNG podczas builda;
- weryfikacja deklarowanego SHA-256 plików źródłowych;
- tekstury terenu i sprite’y aktorów w rendererze runtime.

### Asset Browser

- wyszukiwanie i lista assetów teksturowych;
- podgląd aktualnego źródła;
- import PNG z kontrolą typu, sygnatury, limitu 4 MB i wymiarów 1–4096 px;
- obliczenie SHA-256 także w opaque-origin bez `crypto.subtle`;
- atomowa podmiana z undo/redo;
- pobranie osadzonego PNG.

### Edytor mapy

- pięć pięter 200×200;
- viewport Canvas z cullingiem;
- pan i zoom;
- pędzel, gumka i pipeta;
- edycja punktu startowego;
- dodawanie i usuwanie spawnów;
- tekstury kafli i sprite’y spawnów;
- jeden stroke jako jedna odwracalna komenda delta.

### Content Browser

- klasy, umiejętności i potwory schema v1;
- edycja nazw, statystyk, powiązań umiejętności i assetów;
- duplikowanie oraz usuwanie z walidacją referencji;
- natychmiastowe wysyłanie poprawnego snapshotu do preview.

### Historia, recovery i eksport

- `CommandBus` z historią snapshot oraz delta;
- automatyczne recovery per `projectId`;
- historia checkpointów w IndexedDB z fallbackiem pamięciowym;
- strukturalna lista błędów walidacji;
- eksport JSON;
- eksport standalone HTML z bieżącego snapshotu.

## Wyniki automatyczne

### TypeScript i Node

- `npm run typecheck`: PASS;
- testy Node: **35/35 PASS**;
- brak testów pominiętych i niezaliczonych.

Najważniejsze pokryte przypadki:

- deterministyczna serializacja, RNG, fixed tick, replay i save/load;
- stabilne ID i kolizje `EntityStore`;
- jawny `DamageContext`;
- atomowe apply/undo/redo projektu;
- historia delta mapy;
- RLE encode/decode;
- zdalne i wykonywalne źródła assetów;
- wymagany rodzaj `texture` dla pól graficznych;
- punkt startowy na walkowalnym kaflu;
- zakaz usunięcia ostatniej wymaganej definicji contentu.

### Golden fixture migracji

- `npm run verify:migration`: **51/51 PASS**;
- pełna mapa, content i 45 PNG zachowują oczekiwane sumy.

### Chromium

Pięć scenariuszy przeglądarkowych przeszło:

1. minimalny runtime gameplay;
2. runtime na pełnej zmigrowanej Srebrnej Bramie;
3. most Runtime–Studio, atomowe odrzucenie, undo i sandbox;
4. wspólny AssetResolver: **45/45 gotowych, 0 błędów**;
5. pełny authoring M3:
   - import testowego PNG;
   - oczekiwany SHA-256 `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`;
   - mapowy stroke zapisany jako `delta`;
   - undo odtwarzające identyczne RLE;
   - edycja klasy;
   - checkpoint;
   - standalone runtime ze zmodyfikowanego snapshotu;
   - 45/45 assetów i 0 błędów standalone.

## Kontrola wizualna

- runtime pokazuje zmigrowane tekstury terenu i sprite gracza;
- map editor pokazuje rzeczywisty fragment piętra, paletę, start i tekstury;
- Asset Browser i Content Browser są czytelne w docelowym standalone Studio.

## Znane ograniczenia po M3

M3 nie oznacza pełnego parity wszystkich narzędzi legacy. Nadal poza zakresem pozostają:

- przejścia między piętrami, NPC, regiony i prefaby;
- przedmioty, ekwipunek, talenty, AI graph, quest graph i dialogi;
- przenośny wieloplikowy format `.coopege-project` i deduplikacja dużych bibliotek;
- pełna aktywacja 338 spawnów w gameplayu;
- lokalny coop.

Pełne PNG jako data URL są prawidłowym formatem wydania standalone, ale nie są docelowym magazynem bardzo dużych projektów.

## Kryteria akceptacji M3

- edycja zmigrowanego projektu bez zmiany kodu: PASS;
- project-first Studio: PASS;
- wspólna walidacja runtime/Studio/build: PASS;
- preview i standalone z tego samego snapshotu: PASS;
- odwracalne operacje assetów, mapy i contentu: PASS;
- checkpoint i recovery: PASS;
- działanie w prawdziwym Chromium: PASS.
