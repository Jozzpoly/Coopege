# Coopege — plan kontrolowanego restartu

- Docelowy runtime: **Coopege_v0.01**
- Docelowe Studio: **Coopege_Studio_v0.1**
- Data: **2026-06-12**
- Strategia: **nowy rdzeń + kontrolowana migracja istniejącego dorobku**

## 1. Decyzja wykonawcza

Projekt powinien zostać zrestartowany architektonicznie, ale nie może wyrzucić działającego prototypu.

Obecna gra i Studio zawierają dużo wartościowego contentu i sprawdzone workflow. Ich założenia jednoplikowe i single-player są jednak zbyt głęboko osadzone, aby stanowiły profesjonalny długoterminowy rdzeń lokalnego coopa oraz grafowych narzędzi do tworzenia contentu.

Dlatego:

- zachowujemy obecne artefakty bez zmian jako legacy referencję;
- wyciągamy z nich użyteczne dane i zachowania;
- budujemy nowy modułowy runtime i project-first Studio;
- używamy fixture’ów migracji i testów regresyjnych, aby zapobiegać cichej utracie danych;
- pojedyncze, łatwe do uruchomienia HTML generujemy dopiero na etapie builda.

## 2. Co przenosimy

### Z gry

- pięciopoziomowy świat 200×200;
- ręcznie zaprojektowane lokacje i ekologię spawnów;
- pojęcia walkability i przejść;
- odczucie klas oraz walki;
- dane potworów i przedmiotów jako referencję balansu;
- proceduralne grafiki jako placeholdery;
- koncepcję manifestu assetów;
- wiedzę z walidacji całego projektu;
- użyteczne quality-of-life.

### Ze Studia

- natychmiastowy podgląd runtime;
- bibliotekę assetów i podmianę PNG;
- edycję wielopoziomowej mapy;
- edycję obiektów i walidację;
- atomowe operacje projektu;
- checkpointy i recovery;
- eksport standalone;
- przejrzysty workflow dla osoby nieprogramującej.

### Z testów i review

- znane poprawne sumy legacy;
- 15 przechodzących scenariuszy integracyjnych;
- zapisane ograniczenia;
- przypadki błędnych referencji, pakietów i assetów.

## 3. Czego nie kopiujemy do nowego rdzenia

- jednego globalnego gracza;
- bezpośredniego czytania klawiszy w logice aktorów;
- autorytatywnej symulacji variable-step;
- wspólnego RNG gameplayu i efektów wizualnych;
- własności celów i pocisków opartej na referencjach obiektów;
- ID klasy pełniącego rolę ID postaci;
- jednego globalnego aktywnego piętra jako nieuniknionej reguły świata;
- późnego nadpisywania update/render/combat wrapperami;
- przechowywania danych projektu głównie w wykonywalnym HTML;
- bezpośredniego odczytu dowolnych globali iframe przez Studio;
- regexowego patchowania runtime jako głównej architektury builda;
- osobno kopiowanych walidatorów;
- hardkodowanych executorów jako jedynego sposobu tworzenia nowych mechanik.

## 4. Nowe granice systemów

```text
Dane projektu Coopege
        │
        ├── Wspólne schematy i walidacja
        │
        ├── Coopege Studio
        │      ├── ProjectStore
        │      ├── CommandBus / Undo-Redo
        │      ├── Edytory
        │      └── klient mostu podglądu
        │
        └── Coopege Runtime
               ├── GameWorld
               ├── Fixed Tick
               ├── systemy gameplayowe
               ├── renderer
               ├── adaptery wejścia
               └── host mostu podglądu
```

Autorytetem jest snapshot projektu, nie działający iframe.

## 5. Równoległe tory prac

### Tor A — fundament runtime

- GameWorld i EntityStore;
- stabilne ID;
- model aktorów;
- fixed tick;
- deterministyczny RNG;
- komendy wejścia;
- Event Bus;
- ruch i kolizje;
- własność walki;
- snapshot save;
- abstrakcja kamery.

### Tor B — fundament Studia

- ProjectStore;
- wspólna walidacja schematów;
- Command Pattern dla undo/redo;
- historia checkpointów;
- wersjonowany most;
- preview i diagnostyka;
- import/eksport projektu;
- standalone build;
- podstawowy browser workspace.

### Tor C — migracja i ciągłość contentu

- archiwizacja legacy;
- ekstraktor świata/contentu/assetów;
- raport migracji;
- golden fixture’y;
- inwentaryzacja parity;
- mapowanie starych ID na stabilne ID Coopege;
- raport nieobsługiwanych zachowań;
- sceny regresyjne oparte na starej grze.

Tory łączą się na jawnych bramkach kamieni milowych.

## 6. Pierwszy pakiet implementacyjny

### Zadanie 1 — workspace

Utworzyć monorepo, główne skrypty, formatowanie, testy i build.

Akceptacja:

- czysta instalacja na Windows;
- jedno udokumentowane polecenie uruchomienia;
- jedno polecenie testów;
- jedno polecenie buduje oba docelowe HTML.

### Zadanie 2 — archiwizacja i weryfikacja legacy

Skopiować dostarczone pliki i raporty do `legacy/reference/`.

Akceptacja:

- SHA-256 zgadzają się;
- skrypt weryfikujący wykrywa przypadkową zmianę.

### Zadanie 3 — ADR

Zapisać decyzje:

1. project-first;
2. modułowy TypeScript i generowane single-file buildy;
3. stabilne ID oraz kontekst własności;
4. fixed tick i rozdzielone RNG;
5. protokół Runtime–Studio;
6. nowy rdzeń + legacy migracja.

### Zadanie 4 — schemat projektu v1

Minimalny zakres:

- manifest;
- world/floor;
- tile definitions;
- klasa gracza;
- potwór;
- umiejętność;
- spawn;
- manifest assetów.

Akceptacja:

- wersjonowane JSON fixture’y;
- jeden walidator dla runtime, Studia i migratora;
- błędy zawierają strukturalne ścieżki.

### Zadanie 5 — ekstraktor legacy

Uruchomić zarchiwizowaną grę w automatycznej przeglądarce i wykorzystać jej API do eksportu:

- mapy;
- contentu;
- manifestu assetów;
- odpowiednich proceduralnych i własnych PNG.

Akceptacja:

- deterministyczny eksport;
- raport migracji;
- zweryfikowane piętra i referencje;
- brak zmiany plików legacy.

### Zadanie 6 — shell runtime

Zaimplementować:

- boot;
- fixed GameClock;
- GameWorld;
- EntityStore;
- deterministyczny RNG;
- osobny render loop;
- diagnostykę.

Akceptacja:

- świat wykonuje dokładnie N ticków;
- różny FPS renderowania nie zmienia checksumu świata.

### Zadanie 7 — shell Studia

Zaimplementować:

- otwarcie projektu;
- walidację;
- zapis/eksport;
- diagnostykę;
- okno preview;
- handshake mostu.

Akceptacja:

- Studio otwiera fixture bez runtime;
- preview jest opcjonalne;
- błędne komunikaty mostu są odrzucane.

### Zadanie 8 — pierwszy grywalny slice

Dodać:

- jedno piętro;
- jednego gracza;
- ruch;
- kolizje;
- jednego potwora;
- jeden atak;
- jeden pocisk/efekt;
- śmierć/reset;
- minimalny HUD.

Akceptacja:

- jawna własność source/target;
- deterministyczny replay;
- brak globalnego singletonu gracza.

### Zadanie 9 — pierwsze parity Studia

Najpierw:

- widok mapy i pędzel;
- asset browser;
- formularze potwora/klasy/umiejętności;
- transakcja całego projektu;
- historia checkpointów.

Akceptacja:

- właściciel wykonuje widoczną zmianę i podgląda ją bez edycji kodu.

### Zadanie 10 — slice dla dwóch graczy

Dopiero po przejściu bramek nowego single-player:

- join flow;
- przypisanie gamepada;
- dwóch aktorów;
- wspólna kamera;
- target/threat;
- attribution nagród;
- save wielu postaci.

## 7. Najważniejsza korekta Studia

Legacy Studio zaczyna od wczytania gry HTML i wyciąga z niej API. Nowe Studio zaczyna od otwarcia projektu Coopege.

Legacy:

```text
Game HTML → Tibia APIs → stan Studia → spatchowany Game HTML
```

Nowy model:

```text
Pliki projektu → wspólny ProjectStore → edytory Studia
                                   ├→ snapshot preview
                                   └→ standalone build runtime
```

To jest najważniejsza korekta architektury Studia.

## 8. Undo, checkpointy i historia

Używamy jednego systemu komend projektu zamiast osobnych historii mapy i contentu.

Komenda definiuje:

- ID i etykietę;
- dotknięte ścieżki projektu;
- warunki wejściowe;
- apply;
- revert;
- opcjonalne łączenie operacji;
- dane diagnostyczne.

Checkpointy przechowują wiele punktów odzyskania, a nie jeden nadpisywany rekord.

Diff projektu powinien być deterministyczny i możliwie czytelny dla człowieka.

## 9. Polityka migracji

Każda kategoria otrzymuje status:

- `MIGRATED`;
- `MIGRATED_WITH_TRANSFORM`;
- `PLACEHOLDER`;
- `UNSUPPORTED`;
- `MANUAL_REVIEW_REQUIRED`.

Nie wolno cicho przybliżać nieobsługiwanej logiki.

Początkowy cel migracji:

- geometria świata;
- linki pięter;
- starty;
- pozycje NPC;
- wejścia;
- grupy spawnów;
- definicje potworów;
- parametry klas;
- istniejące parametry umiejętności;
- referencje questów;
- definicje przedmiotów;
- manifest assetów i PNG.

Hardkodowane zachowanie legacy staje się:

- jawną definicją nowego systemu;
- tymczasowym adapterem zgodności;
- albo pozycją `UNSUPPORTED` w raporcie.

## 10. Kontrola zakresu

Pierwszy nowy build nie potrzebuje pełnego parity contentu.

Ma udowodnić:

- poprawną architekturę;
- deterministyczną symulację;
- project-first Studio;
- ścieżkę migracji;
- jeden grywalny loop;
- gotowość fundamentu do lokalnego coopa.

Nie zaczynamy jednocześnie pełnego Ability Composer, AI Graph, Talent Tree, Item Editor, Quest/Dialogue Graph i prefabów-regionów.

Kolejność:

1. wspólny projekt i schematy;
2. aktorzy i efekty runtime;
3. Ability Composer;
4. Item Editor;
5. Talent Tree;
6. AI Graph;
7. Quest/Dialogue Graph;
8. prefaby/regiony/triggery.

## 11. Kiedy istnieje `Coopege_v0.01`

Nazwy używamy dopiero, gdy build:

- pochodzi z nowych modułowych źródeł;
- ładuje wersjonowany projekt Coopege;
- używa GameWorld i stabilnych ID;
- posiada fixed-step;
- rozdziela RNG symulacji i grafiki;
- zawiera co najmniej jeden grywalny loop walki;
- wystawia nowy wersjonowany most;
- przechodzi testy fundamentu;
- nie jest starym plikiem Tibii ze zmienionymi napisami.

## 12. Kiedy istnieje `Coopege_Studio_v0.1`

Nazwa obowiązuje dopiero, gdy Studio:

- jest project-first;
- używa oficjalnych wspólnych schematów;
- otwiera i waliduje projekt bez uzależnienia od nieprzezroczystego HTML gry;
- łączy się z runtime wersjonowanym mostem;
- ma projektowe undo/redo;
- ma checkpointy/recovery;
- eksportuje nazwany runtime build;
- zawiera przynajmniej pierwszy istotny workflow authoringowy.

## 13. Bezpośredni następny etap

Rozpoczynamy **M0**: repozytorium, archiwizacja legacy, ADR, schema v1 i ekstraktor migracji.

Najwcześniejszy sensowny przepływ:

```text
legacy pliki
   ↓
ekstraktor migracji
   ↓
fixture projektu Coopege
   ↓
wspólny walidator
   ↓
minimalne Studio preview
   ↓
minimalny deterministyczny runtime
```

Ta kolejność chroni istniejący dorobek i nie pozwala nowemu projektowi odziedziczyć starej architektury.
