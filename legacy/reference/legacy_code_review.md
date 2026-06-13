# Tibia Enchanted — poważny code review i audyt narzędzi developerskich

**Data audytu:** 12 czerwca 2026  
**Audytowane pliki:**

- `Tibia_Enhanced_v14_1_DevAPI.html`
- `Tibia_Developer_Studio_v3_1.html`

## 1. Werdykt wykonawczy

Po audycie i poprawkach zestaw jest już **realnie użytecznym narzędziem developerskim**, a nie tylko demonstracją interfejsu. Dobrze obsługuje obecny zakres pracy nad:

- wyciąganiem, podglądem, eksportem i podmianą atlasów PNG;
- edycją pięciopoziomowej mapy 200×200;
- punktami startowymi, przejściami, NPC, wejściami i spawnami;
- tworzeniem nowych potworów opartych na danych;
- tworzeniem prostych questów zabijania potworów;
- edycją parametrów trzech istniejących klas i istniejących aktywnych umiejętności;
- walidacją spójności contentu, mapy i assetów;
- transakcyjnym zastosowaniem całego projektu;
- zapisaniem samodzielnego pliku HTML zawierającego grę, mapę, content i własne PNG.

Najważniejsza zmiana architektoniczna polega na odejściu od traktowania mapy, grafik i contentu jako trzech niezależnych zbiorów. Silnik udostępnia teraz `TibiaProjectAPI`, które waliduje zależności i stosuje cały projekt jako jedną transakcję z rollbackiem.

**Ocena uczciwa:** narzędzie jest gotowe do szerokiego rozwijania obecnej gry, lecz nie jest jeszcze kompletnym edytorem wszystkich mechanik RPG. Nowe typy AI, całkowicie nowe aktywne umiejętności, nowe klasy, dowolne drzewka talentów, przedmioty, rozgałęzione questy i dialogi nadal wymagają rozbudowy silnika o kolejne rejestry wykonawcze albo bezpieczny język zachowań.

## 2. Zakres audytu

Review objął:

1. analizę przepływu danych między Studiem a grą;
2. kontrolę API assetów, mapy, contentu i całego projektu;
3. sprawdzenie odwracalności operacji oraz historii undo/redo;
4. kontrolę walidacji importowanych pakietów;
5. testy dużych eksportów i samodzielnych buildów;
6. testy zależności potwór → quest → spawn → asset;
7. testy usuwania, zmiany ID, undo i redo;
8. testy mapy na wszystkich pięciu poziomach;
9. analizę przyszłej rozbudowy o umiejętności, drzewka, AI, przedmioty i questy;
10. analizę bezpieczeństwa i długu technicznego.

## 3. Najważniejsze problemy znalezione i poprawione

### 3.1. Problemy krytyczne

#### C-01 — punkt startowy istniał tylko wizualnie w Studio

**Problem:** przeniesienie znacznika startu modyfikowało projekt mapy, ale silnik nadal korzystał z wcześniejszych stałych miejsca startowego.

**Skutek:** mapa wyglądała poprawnie w edytorze, lecz nowa postać lub reset mogły uruchamiać gracza w starym miejscu.

**Poprawka:** miejsce startowe jest teraz częścią mutowalnego modelu świata, jest importowane, eksportowane i stosowane przez `TibiaMapAPI`.

**Status:** naprawione i przetestowane.

#### C-02 — niezależne stosowanie contentu i mapy niszczyło poprawne operacje wieloetapowe

**Przykład:** usunięcie potwora oraz jego spawnów jest poprawną operacją końcową. Gdy content i mapa były walidowane osobno, chwilowy stan pośredni zawierał nieznane ID albo osierocone spawny.

**Poprawka:** dodano `TibiaProjectAPI`, które:

- waliduje content, assety i mapę razem;
- sprawdza referencje między systemami;
- stosuje je w kontrolowanej kolejności;
- przy błędzie odtwarza poprzedni content, assety i mapę.

**Status:** naprawione i przetestowane także na celowo niepoprawnym potworze `ghost`.

#### C-03 — undo operacji kaskadowych nie było atomowe

**Problem:** zmiana ID lub usunięcie potwora aktualizowały questy, spawny i PNG, lecz historia contentu przechowywała tylko wcześniejszy content. Cofnięcie mogło przywrócić potwora bez spawnów albo ze złym kluczem grafiki.

**Poprawka:** operacje międzydomenowe przechowują atomowy snapshot:

- contentu;
- mapy;
- własnych assetów;
- aktualnej kategorii i zaznaczenia w edytorze.

Undo i redo przywracają teraz cały stan projektu.

**Status:** naprawione; przetestowano zmianę ID z własnym PNG oraz usuwanie potwora z questem i spawnem.

#### C-04 — przejścia między piętrami pozostawiały osierocone kafle schodów

**Problem:** przesunięcie lub usunięcie linku mogło pozostawić kafel schodów bez odpowiadającego mu przejścia.

**Poprawka:** każde przejście zapisuje `underA` i `underB`, czyli typy kafli znajdujące się pod oboma końcami. Usunięcie, przesunięcie albo undo przywraca wcześniejszy teren.

**Status:** naprawione i przetestowane.

#### C-05 — silnik contentu był częściowo zahardkodowany według nazw potworów

**Problem:** statystyki i ataki specjalne wykorzystywały rozgałęzienia zależne od konkretnych identyfikatorów, np. skeleton/dragon/yeti. Samo dopisanie wpisu do tabeli nie tworzyło kompletnego potwora.

**Poprawka:** dodano `TibiaContentAPI` oraz kontrolowane rejestry wykonawcze. Nowy potwór może mieć:

- własne statystyki;
- tier, rozmiar, szybkość, zasięg aggro, doświadczenie i złoto;
- proceduralny fallback graficzny;
- automatycznie tworzony slot `monster.<id>`;
- jeden z dozwolonych typów ataku specjalnego.

**Status:** znacząco poprawione. Dowolne nowe AI nadal nie jest dostępne bez dopisania nowego wykonawcy w silniku.

### 3.2. Problemy wysokiego priorytetu

#### H-01 — narzędzie obiektów resetowało własny tryb pracy

Dodawanie lub przesuwanie obiektu mogło być anulowane przez zmianę aktywnego narzędzia. Przepływ został uporządkowany i przetestowany na NPC, spawnach, wejściach i przejściach.

#### H-02 — undo/redo obejmowało tylko kafle

Dodano historię snapshotów dla startu, NPC, wejść, spawnów i przejść. Edycje kafli nadal używają lżejszych różnic zamiast pełnego snapshotu.

#### H-03 — link mógł prowadzić na to samo piętro

Takie przejście nie ma poprawnej semantyki schodów i mogło tworzyć błędne pętle. Studio i API odrzucają teraz linki z `z === toZ`.

#### H-04 — słaba walidacja RLE

Importer sprawdza obecnie:

- obecność wszystkich pięciu pięter;
- format par `[wartość, liczba]`;
- poprawność wartości kafla;
- dodatnią, całkowitą długość serii;
- dokładnie 40 000 kafli na piętro;
- zakres współrzędnych obiektów;
- spójność linków, spawnów i identyfikatorów.

#### H-05 — PNG i pakiety nie miały wystarczających ograniczeń

Dodano limity rozmiaru, maksymalny wymiar 8192×8192, weryfikację lokalnego `data:image/png;base64`, limity całego pakietu i odrzucanie zewnętrznych URL.

#### H-06 — eksport ZIP mógł przeciążać stos lub pamięć

Zastąpiono operacje oparte na rozpakowywaniu bardzo dużych tablic bezpiecznym składaniem buforów. Testowy ZIP zawierał 45 plików PNG i manifest.

#### H-07 — ukryta karta mapy była centrowana przy zerowym rozmiarze

Pierwsze wejście do mapy mogło pokazywać poprawne dane z błędnym offsetem. Widok jest teraz inicjalizowany po faktycznym pokazaniu i zmierzeniu kontenera.

#### H-08 — lista potworów w edytorze spawnów nie odświeżała się po utworzeniu potwora

Nowy potwór jest natychmiast dostępny w selektorze spawnów. Odświeżanie następuje również po undo/redo, zmianie ID i imporcie.

#### H-09 — brak niezawodnego checkpointu

Dodano zapis checkpointu w IndexedDB oraz pamięciowy fallback, gdy przeglądarka blokuje bazę, np. w nietypowym kontekście `srcdoc` lub automatycznym teście.

### 3.3. Problemy średnie i techniczne

- poprawiono `pointercancel`, aby przerwany gest nie gubił części wykonanej edycji;
- ujednolicono obsługę DPI canvasu;
- dodano zgodność głównych wersji silnika podczas importu projektu;
- dodano automatyczną synchronizację parametrów aktualnie używanej klasy po imporcie contentu;
- uporządkowano cooldown łucznika tak, aby parametry talentów wpływały na tę samą wartość, której używa wykonawca umiejętności;
- dodano bezpieczne kodowanie danych osadzanych w `<script type="application/json">`;
- dodano trwały format projektu Studia i osobny format runtime silnika.

## 4. Aktualna architektura

### 4.1. `TibiaAssetAPI`

Odpowiada za:

- manifest grafik;
- proceduralną rasteryzację istniejących grafik;
- import lokalnych PNG;
- usuwanie podmian;
- eksport całego pakietu lub tylko zmian;
- dynamiczne tworzenie specyfikacji grafiki dla nowych potworów.

### 4.2. `TibiaMapAPI`

Odpowiada za:

- teren pięciu poziomów;
- punkt startowy;
- NPC, wejścia, przejścia i grupy spawnów;
- import i eksport RLE;
- testy dostępności uwzględniające rzeczywisty footprint gracza;
- testy bram i wejść;
- testy progresji oraz rozmieszczenia spawnów;
- statystyki runtime potworów.

### 4.3. `TibiaContentAPI`

Odpowiada za:

- definicje potworów;
- proste questy;
- parametry istniejących klas;
- parametry istniejących aktywnych umiejętności;
- walidację referencji oraz zakresów danych;
- synchronizację contentu z działającą sesją gry.

### 4.4. `TibiaProjectAPI`

Jest warstwą integralności całego projektu. Zapobiega sytuacji, w której każdy podsystem osobno jest składniowo poprawny, lecz ich połączenie jest niespójne.

## 5. Testy wykonane

### 5.1. Testy składniowe

- JavaScript silnika: `node --check` — **PASS**
- JavaScript Studia: `node --check` — **PASS**

### 5.2. Uruchomienie i wykrywanie API

- uruchomienie gry w prawdziwym Chromium;
- wykrycie `TibiaAssetAPI`, `TibiaMapAPI`, `TibiaContentAPI`, `TibiaProjectAPI`;
- wersja silnika 14.1.0;
- brak błędów strony.

**Wynik:** PASS.

### 5.3. Nowy potwór

Scenariusz:

1. utworzenie nowego wpisu potwora;
2. zastosowanie contentu;
3. sprawdzenie runtime;
4. sprawdzenie automatycznego slotu graficznego.

**Wynik:** potwór działa, jest widoczny w API i posiada asset proceduralny — PASS.

### 5.4. Obiekty mapy i historia

- dodanie NPC;
- undo;
- redo;
- porównanie liczby obiektów.

**Wynik:** 133 → 134 → 133 → 134 — PASS.

### 5.5. Punkt startowy

- przeniesienie 88,84,Z0 → 90,86,Z0;
- zastosowanie mapy w grze;
- odczyt runtime;
- undo i ponowne zastosowanie.

**Wynik:** runtime odzwierciedla zmianę i cofnięcie — PASS.

### 5.6. Przejścia

- próba utworzenia linku na tym samym piętrze — poprawnie odrzucona;
- link Z0 → Z1 — poprawnie utworzony;
- kafle końców zmienione na 12 i 13;
- `underA` i `underB` zachowane;
- undo przywróciło liczbę linków i wcześniejsze kafle.

**Wynik:** PASS.

### 5.7. Zmiana ID potwora z własnym PNG

- utworzenie potwora;
- podmiana grafiki PNG;
- zmiana ID;
- zastosowanie projektu;
- sprawdzenie starego i nowego klucza assetu.

**Wynik:** stary klucz znika, nowy zachowuje PNG — PASS.

### 5.8. Operacja kaskadowa

Scenariusz:

1. nowy potwór;
2. quest odwołujący się do potwora;
3. spawn potwora;
4. usunięcie potwora z zależnościami;
5. walidacja i zastosowanie projektu.

**Wynik:** potwór, quest i spawn zostały usunięte bez osieroconych referencji — PASS.

### 5.9. Atomowe undo/redo między contentem, mapą i assetami

- undo zmiany ID przywróciło stary potwór i stary klucz PNG;
- redo ponownie przeniosło oba elementy na nowe ID;
- undo usunięcia przywróciło potwora, quest, spawn i PNG;
- redo usunęło wszystkie cztery elementy.

**Wynik:** PASS.

### 5.10. Walidacja całego świata

- mapa 200×200;
- piętra -2, -1, 0, 1, 2;
- brak zablokowanych celów;
- brak celów bez prześwitu;
- brak nieosiągalnych celów;
- wszystkie testowane bramy i wejścia przechodzą;
- progresja spawnów przechodzi.

**Wynik:** PASS.

### 5.11. Rollback niepoprawnego projektu

Do istniejącej grupy spawnów wprowadzono nieznany typ `ghost` bez definicji contentu.

**Wynik:** projekt został odrzucony przed mutacją; wcześniejsze ID potworów pozostały bez zmian — PASS.

### 5.12. Ochrona assetów

- zewnętrzny URL zamiast lokalnego PNG — odrzucony;
- niepoprawny pakiet — odrzucony;
- limity wymiarów i rozmiaru aktywne.

**Wynik:** PASS.

### 5.13. Eksport

- ZIP: 46 wpisów, w tym 45 PNG i `manifest.json`;
- projekt: pięć pięter i content;
- samodzielny build: około 666 KB w scenariuszu testowym;
- ponowne uruchomienie builda w Chromium;
- wykrycie nowego potwora, API projektu i poprawnej mapy.

**Wynik:** PASS.

### 5.14. Checkpoint

- poprawny fallback pamięciowy, gdy IndexedDB jest zablokowane;
- przywrócenie zmienionej nazwy potwora.

**Wynik:** PASS.

## 6. Eksperymenty myślowe i najbardziej prawdopodobne use cases

### 6.1. Grafik chce przerobić teksturę orka

**Przepływ:** wybiera asset → eksportuje atlas → edytuje w programie graficznym → importuje PNG → ogląda wynik w działającej grze → zapisuje build.

**Ocena:** dobrze obsłużone.

**Brak:** historia wersji konkretnego PNG i porównanie przed/po.

### 6.2. Animator chce dodać bardziej złożony atak

Studio obsługuje atlas i podgląd klatek, ale silnik nadal oczekuje określonego układu klatek i stanów.

**Ocena:** częściowo obsłużone.

**Brakuje:** timeline, długości poszczególnych klatek, markerów trafienia, socketów broni, hitboxów i eventów animacji.

### 6.3. Mapper tworzy nowe podziemie

Może malować teren, tworzyć przejścia, spawny, NPC, wejścia i testować osiągalność.

**Ocena:** dobrze obsłużone dla obecnej skali.

**Brakuje:** zaznaczenia prostokątnego, kopiuj/wklej, stampów, prefabów pomieszczeń, autotilingu, regionów logicznych, triggerów i warstwy dekoracji niezależnej od terenu.

### 6.4. Designer tworzy nowego potwora „Wisp”

Może utworzyć definicję, statystyki, proceduralną grafikę lub PNG, spawn i quest.

**Ocena:** dobrze obsłużone dla zwykłego potwora.

### 6.5. Designer chce „Wisp”, który teleportuje się i łączy błyskawicą z innymi Wispami

Obecnie dostępne są tylko zarejestrowane wykonawcy specjalni. Taki potwór wymaga nowego wykonawcy w kodzie silnika.

**Ocena:** nieobsłużone bez programowania.

**Wniosek:** kolejnym dużym modułem powinien być Behavior Graph albo ograniczony DSL zachowań.

### 6.6. Balancer zmienia parametry klas

Istniejące klasy można stroić, a aktywna postać jest synchronizowana.

**Ocena:** obsłużone.

**Brak:** tworzenie czwartej klasy oraz definiowanie jej ekwipunku startowego, UI, animacji i własnej logiki.

### 6.7. Designer tworzy całkowicie nową umiejętność

Można stroić istniejące wykonawce `whirlwind`, `arrowRain` i `fireball`, lecz nie tworzyć dowolnej nowej logiki.

**Ocena:** częściowo obsłużone.

**Potrzebne:** rejestr efektów i kompozytor umiejętności, np. pocisk → trafienie → obrażenia → status → eksplozja → odrzut.

### 6.8. Designer buduje nowe drzewko rozwoju

Można edytować istniejące pola i parametry, ale nowy identyfikator talentu nie dostaje automatycznie zachowania w silniku.

**Ocena:** fundament istnieje, właściwy edytor drzewek jeszcze nie.

### 6.9. Użytkownik usuwa potwora używanego przez wiele systemów

Studio pokazuje liczbę zależnych questów i spawnów, wykonuje kaskadę oraz pozwala ją atomowo cofnąć.

**Ocena:** dobrze obsłużone.

### 6.10. Użytkownik importuje uszkodzony projekt

Walidacja odrzuca błędne RLE, nieznane ID, złe linki i niepoprawne PNG. Transakcja nie pozostawia częściowo zmienionej gry.

**Ocena:** dobrze obsłużone.

### 6.11. Użytkownik ładuje projekt ze starej lub przyszłej wersji

Studio sprawdza główną wersję silnika, ale nie posiada jeszcze pełnego systemu migracji schematów.

**Ocena:** bezpieczne odrzucenie istnieje; automatyczna migracja jeszcze nie.

### 6.12. Użytkownik ładuje złośliwy plik HTML jako grę

Iframe używa `allow-scripts` i `allow-same-origin`, ponieważ Studio musi bezpośrednio wywoływać API gry. Taka kombinacja **nie jest silną granicą bezpieczeństwa**.

**Ocena:** należy ładować wyłącznie zaufane lokalne buildy gry.

## 7. Macierz gotowości funkcji

| Obszar | Ocena | Stan |
|---|---:|---|
| Eksport i podmiana grafik | 4.5/5 | Gotowe do pracy |
| Podgląd atlasów i klatek | 4/5 | Gotowe, bez zaawansowanego timeline |
| Edycja mapy | 4/5 | Użyteczna, brakuje prefabów i zaznaczeń |
| Przejścia i piętra | 4.5/5 | Dobrze zabezpieczone |
| Spawny i walidacja progresji | 4/5 | Użyteczne |
| Nowe potwory danych | 3.5/5 | Działa, ograniczona logika specjalna |
| Balans klas | 3/5 | Trzy istniejące klasy |
| Nowe klasy | 1/5 | Silnik nadal zakłada trzy klasy |
| Strojenie istniejących skilli | 3/5 | Działa |
| Nowe mechaniki umiejętności | 1.5/5 | Brak kompozytora efektów |
| Drzewka talentów | 1/5 | Brak pełnego modelu zachowań |
| Proste questy kill-count | 2.5/5 | Działa |
| Rozgałęzione questy/dialogi | 0.5/5 | Brak edytora grafowego |
| Przedmioty i ekwipunek | 0.5/5 | Nieudostępnione w Content API |
| NPC i dialogi | 1/5 | Pozycje są edytowalne, treść nie |
| Integralność danych | 4.5/5 | Transakcje i walidacja |
| Odzyskiwanie pracy | 3.5/5 | Checkpoint + fallback |
| Rozszerzalność kodu | 2.5/5 | API poprawia sytuację, monolit pozostaje |

## 8. Co nadal wymaga krytycznej poprawy

### 8.1. Monolityczne pliki HTML

Silnik ma ponad 3000 linii, a Studio skupia dużą liczbę odpowiedzialności w jednym skrypcie. Jest to wygodne do przesyłania i uruchamiania, ale coraz bardziej ryzykowne przy rozwoju.

**Ryzyka:**

- przypadkowe zależności między globalnymi systemami;
- trudniejsze testy jednostkowe;
- trudniejsze mergowanie zmian;
- większe ryzyko regresji podczas vibe codingu;
- brak wyraźnych granic między modelem, UI i adapterem runtime.

### 8.2. Ręczne schematy zamiast wspólnego, wersjonowanego kontraktu

Walidatory są znacznie lepsze, ale formaty nadal są opisane kodem. Docelowo powinny istnieć wspólne JSON Schema lub odpowiednik oraz migracje `v1 → v2`.

### 8.3. Historia mapy może zużywać dużo pamięci

Edycje obiektów przechowują snapshot całych pięciu pięter. Przy 100 dużych operacjach może to kosztować dziesiątki megabajtów wraz z narzutem JavaScriptu.

**Docelowo:** Command Pattern i różnice obiektowe zamiast pełnego snapshotu terenu.

### 8.4. Brak systemu pluginów albo bezpiecznego języka zachowań

Bez tego każda naprawdę nowa mechanika nadal wymaga edycji silnika. Nie należy rozwiązywać tego przez bezpośrednie wstrzykiwanie dowolnego JavaScriptu z projektu, bo pogorszyłoby to bezpieczeństwo i możliwość walidacji.

### 8.5. Brak automatycznego zestawu regresyjnego w repozytorium

Testy zostały wykonane w Chromium, ale powinny zostać zachowane jako stały zestaw Playwright i uruchamiane po każdej zmianie.

## 9. Zalecana architektura następnego etapu

### Priorytet P0 — stabilizacja fundamentu

1. Rozdzielić źródła na moduły:
   - `engine-core`;
   - `content-schema`;
   - `map-runtime`;
   - `asset-runtime`;
   - `project-runtime`;
   - `studio-ui`.
2. Zbudować wersjonowane schematy i migracje.
3. Dodać stałe testy Playwright oraz testy jednostkowe walidatorów.
4. Wprowadzić jeden `ProjectStore` i Command Bus zamiast wielu częściowo niezależnych stanów.
5. Dodać eksport czytelnego changelogu projektu i diffu między checkpointami.

### Priorytet P1 — rzeczywiste narzędzie do tworzenia contentu

1. **Ability Composer** oparty na efektach:
   - projectile;
   - area;
   - damage;
   - heal;
   - status;
   - knockback;
   - summon;
   - teleport;
   - chain;
   - conditional.
2. **Behavior Graph** potworów:
   - sensory;
   - selekcja celu;
   - ruch;
   - cooldowny;
   - fazy HP;
   - współpraca grupowa;
   - ucieczka i wezwanie pomocy.
3. **Talent Tree Editor** z węzłami, krawędziami, wymaganiami i efektami z tego samego rejestru.
4. **Item/Equipment Editor**.
5. **Quest Graph i Dialogue Editor**.
6. Edytor mapy z copy/paste, prefabami, stampami, regionami i triggerami.

### Priorytet P2 — narzędzia produkcyjne

- lokalizacja tekstów;
- audio i efekty dźwiękowe;
- profiler wydajności;
- podgląd kosztu spawnów i AI;
- porównanie buildów;
- eksport/import paczek modów;
- system zaufanych pluginów;
- integracja z Git albo przynajmniej czytelne, deterministyczne pliki JSON.

## 10. Ostateczna odpowiedź na pytanie projektowe

### Czy narzędzie zaspokaja obecne potrzeby developerskie?

**Tak**, dla map, assetów, szerokiego balansu, nowych zwykłych potworów, spawnów, prostych questów i przygotowania samodzielnych buildów.

### Czy pozwala wprowadzać „wszelakie nowości” bez dotykania silnika?

**Nie.** I obecnie byłoby nieuczciwe tak twierdzić. Każda nowość mieszcząca się w istniejących kontraktach danych jest obsługiwana. Całkowicie nowa logika wymaga nowego wykonawcy lub przyszłego grafu/DSL.

### Czy fundament pod dalszą rozbudowę jest właściwy?

**Tak, po wprowadzeniu Content API i Project API fundament jest wyraźnie lepszy.** Następny krok powinien jednak polegać na modularizacji i budowie kompozytora efektów, a nie na dalszym dokładaniu kolejnych wyjątków do jednego pliku HTML.

