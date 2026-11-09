# Coopege Studio × Jaskinia — następna kampania: dossier i warianty (Superpowers)

**Data:** 2026-11-09. **Status:** RESEARCH / PRZYGOTOWANIE KAMPANII, **niezatwierdzony wybór drogi i nie plan implementacji**. Następna implementacja wymaga wybrania drogi i zatwierdzenia osobnego projektu doświadczenia; dopiero wtedy powstaje specyfikacja i plan wykonania według Superpowers. Nie jest to polecenie dla Opusa/Astry ani zgoda na merge, deploy, zmianę produkcji czy przenoszenie prywatnych danych.

**Właściciel intencji:** Jozz. **Opracowanie i omylne hipotezy:** linia Browser GPT Coopege. **Adresat:** agenci pracujący nad Coopege, Jaskinią, Feniks Studio i niezależnymi laboratoriami. Nie zastępuje głosu Ownera ani aktualnego Commons.

**Jedno zdanie:** Odzyskać ambicję pełnego, ręcznie używalnego Studia RPG i radykalnie podnieść ergonomię dzięki Jaskini, ale utrzymać niezależność Coopege jako gry, zachować prawo przebudowy i nie wprowadzać globalnego formatu światów.

## 1. Materiał źródłowy i hierarchia wiarygodności

### Decyzje Ownera, nie nasze domysły

- 9 XI: **„ten edytor nowy od copeege jest ogolnym antyprzykładem”**. Historyczne Studio było ambitne; potrzeba czegoś dojrzalszego, zbudowanego „na bazie Jaskini albo w niej”. Nie promować październikowego F2 jako wzorca tylko dlatego, że działa w grze.
- 9 XI: mocno potwierdził możliwość organizowania jednej sesji pracy z instrumentów (mapa, biblioteka, potwór, gra, niezależne przełączanie i resize), bez obowiązku uruchomienia symulacji przez cały czas. **To jest poparcie idei doświadczenia, nie wybór liczby procesów, formatu świata, bibliotek i hostingu.**
- 9 XI: Opusowie i Astra tworzą fundamenty Jaskini, a inne laboratoria mogą równolegle eksperymentować z edytorami i przekazywać wyniki. Linia Coopege pozostaje odpowiedzialna **także za dobre RPG**, nie tylko technologie dla Jaskini.
- 9 XI, szerszy kierunek: gruntowna przebudowa starej Jaskini (aktualne dane, Cloudflare, plastyczne fundamenty), profesjonalne edytory jako drugi duży etap; równoległe badania labów są dopuszczone wcześniej. [Dokładny zapis Ownera w Commons](https://github.com/Jozzpoly/Jozz-Commons/blob/main/glos-jozza/2026-11-09-gruntowna-przebudowa-starej-jaskini.md).
- Historyczna, nadal istotna [Dusza Coopege](https://github.com/Jozzpoly/Coopege/blob/1b3f4fbc7834a7503a43770236ca0930e5799c9e/docs/product/COOPEGE_SOUL.md): fun, autorski świat, coop, grywalność, dostępne narzędzia, eksport samodzielnej gry; nie podmieniać tego na infrastrukturalne R&D.

### Potwierdzone przez poprzednią rundę (zakres dowodu w źródłowym raporcie)

[Audyt interaktywny z 9 XI](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-editor-structure-2026-11-09/experiments/editor-structure-2026-11-09/STUDIO_ARCHAEOLOGY_2026-11-09.md): historyczne Tibia Developer Studio v3.1 na prawdziwym silniku pozwoliło w izolowanym Chromium wykonać paint/undo/redo, move/undo NPC, change monster HP, apply, export standalone HTML i uruchomić wynik ponownie. **PASS wyłącznie wymienionych ścieżek, nie długiej sesji autorskiej w Operze.** Przy węższych oknach realnie zawodziła nawigacja i nakładały się panele.

[Raport Coopege M3](https://github.com/Jozzpoly/Coopege/blob/1b3f4fbc7834a7503a43770236ca0930e5799c9e/docs/testing/M3_AUTHORING_PARITY_TEST_REPORT.md) i [M7](https://github.com/Jozzpoly/Coopege/blob/1b3f4fbc7834a7503a43770236ca0930e5799c9e/docs/testing/M7_FINAL_PLAYTEST_CANDIDATE_REPORT.md): project-first i lepsze testy/undo/preview, ale **zakres M3 celowo nie obejmował pełnego quest/NPC/region/prefab authoringu**. M7 poprawił transitions runtime, lecz pełny CRUD nadal był długiem. Nie nazywać tego automatycznie „regresem każdej funkcji” — dopasowanie zmieniło się, a wykonanie części ścieżek legacy wymagało JSON.

[Kontrpróba PR #11](https://github.com/Jozzpoly/Coopege/pull/11): przesunięcie kafli może zostawić portal i NPC w złym miejscu; przeniesienie rozpoznanych przejść naprawia część problemów, ale **nie definiuje pełnej semantyki lokacji**. 6 symulacji na danych i 3 testy odrzucenia w V8, bez potwierdzonego node-native CI, owner UX czy gry. **Nie awansować próbki do architektury Studio.**

[Astra, Feniks Studio 14–16 X](https://github.com/Jozzpoly/Feniks-Studio/blob/main/docs/research/2026-10-16-wspolny-warsztat.md): równie ważne jest własne tworzenie drugiego, nieprzygotowanego miejsca, odrębność dokumentu od renderera, warianty i zapis, eksperymenty z własnymi materiałami; **historyczny plan wykonania z 15 X zatrzymany**. Feniks nie jest automatycznie tą samą mapą ani tym samym runtime co Coopege.

[Asset Lab 01/02, Commons](https://github.com/Jozzpoly/Jozz-Commons/blob/main/eksperymenty/2026-11-09-asset-lab-02/HANDOFF-OPUS-ASTRA.md): rzeczywista ręczna poprawka przez Ownera i spontaniczna próba zmiany podziałów okien — dowód potrzeby komponowania stanowiska; nie dowód, że konkretny model API hosta został zatwierdzony. [Materialne Relacje 02](https://github.com/Jozzpoly/Jozz-Commons/blob/main/wplywy/2026-11-09-browser-sprawczosc/materialne-relacje-02-WNIOSKI.md) daje odrębny język gestów/relacji, bez Owner UX PASS.

### Uczciwe ograniczenia

- Nie mamy jeszcze **Owner PASS** żadnego z projektowanych nowych wariantów Studia. Historyczny program miał ambicję i demonstracyjny roundtrip, ale nie został dziś oceniony przez Ownera na długiej sesji.
- Nie wykonano audytu całego nowego kontraktu Jaskini pod kątem bezpieczeństwa, zmiany originu, undo, wieloletniego przechowywania ani dwóch równoczesnych edycji.
- Coopege nie udowodniło jeszcze jakości feel/funu względem oczekiwanego RPG; to osobna obowiązująca oś jakości, nie „późniejszy bonus”.
- Linki do `main` innych projektów to ruchome źródła. Przed pracą ponownie odczytać ich SHA. Rewizje przy Coopege poniżej są przypięte: Coopege `main` `1b3f4fb`; stara Jaskinia `7fcedfa`; nowa Jaskinia `f33a851` (odczyt 9 XI). Niczego nie publikowano na produkcję.

## 2. Przeciwnicy naszych intuicji — research zewnętrzny

Nie szukamy nazwy nowego frameworka. Badamy **wartości operacyjne**, a także granice istniejących rozwiązań.

| Źródło | Konkretny mechanizm wart zbadania | Czego nie dowodzi / ryzyko dla nas |
|---|---|---|
| [Tiled: terrain](https://docs.mapeditor.org/en/stable/manual/terrain/), [templates](https://doc.mapeditor.org/en/stable/manual/using-templates/), [objects](https://doc.mapeditor.org/en/stable/manual/objects/) | Malowanie **rodzaju terenu** z automatycznym dobraniem sąsiadów; instancje i właściwości dziedziczone z szablonów; mapowe obiekty z referencjami i podglądem przed umieszczeniem | Gotowy Tiled nie rozumie Coopege questów, gameplayu i intencji miejsca; integracja może kosztować mniej niż własny editor, ale nie jest automatyczną odpowiedzią na pełne Studio |
| [LDtk: IntGrid / Auto-layers](https://ldtk.io/docs/general/auto-layers/), [entities](https://ldtk.io/docs/general/editor-components/entities/) | Oddzielanie znaczeń i automatycznej grafiki, definiowane encje z ograniczeniami, warstwy mapy | Reguła lub zmiana definicji może zaktualizować wiele lokacji; dyskretny model 2D nie może niejawnie stać się globalną ontologią Feniksa |
| [TrenchBroom: linked groups](https://trenchbroom.github.io/manual/latest/) | Edycja konstrukcji jako powiązanych grup, transformacje, wyjątki przez chronione właściwości, pokazywanie links i map issues | Propagacja może nadpisać lokalną pracę; grupowanie geometrii nie oznacza przeniesienia kwestii własności, questów czy relacji społecznych |
| [Blender: Workspaces](https://docs.blender.org/manual/en/latest/interface/window_system/workspaces.html) | Komponowanie zadań z różnych typów edytorów, przełączanie i odzyskiwanie układów | Jego workspace zapisuje się w pliku .blend; dla nas **nie ma powodu** automatycznie utożsamiać przenośnego dokumentu z prywatnym układem stanowiska |
| [Godot: EditorPlugin](https://docs.godotengine.org/en/stable/classes/class_editorplugin.html), [UndoRedo](https://docs.godotengine.org/en/4.4/classes/class_editorundoredomanager.html) | Rozszerzanie hosta o pracownię domenową; historia cofania związana ze sceną, a nie jeden przypadkowy globalny stack | Wejście w ciężki obcy silnik/editor nie pasuje bezpośrednio do preferencji Ownera; rozwiązanie historii jest wskazówką semantyczną, nie copy-paste kodu |

**Hipoteza obalająca samodzielną budowę:** jeśli Tiled/LDtk plus cienki domenowy bridge pozwolą Ownerowi tworzyć szybciej i szerzej, a przeniesienie rezultatów do Jaskini jest bezproblemowe, nowy własny map editor może być dziś złym wydatkiem. Udowodnić przewagę, nie ogłaszać jej.

**Hipoteza obalająca „wszystko w Jaskini”:** jeżeli laboratorium standalone działa szybko i niezawodnie, a Jaskinia-host wprowadza istotny koszt bezpieczeństwa, cyklu iframe, storage, skrótów albo wersjonowania — zachować samodzielny produkt i włączyć go później przez cienką integrację. Obejmowanie Jaskinią całej implementacji nie jest celem.

## 3. Sposoby wykonania — do wyboru, NIE zatwierdzone

### A — historyczne Tibia Studio jako donor / reanimacja w Jaskini

Zachować szeroką istniejącą funkcjonalność, wstawić do Jaskini i stopniowo wymieniać UX. **Mocne:** tania archeologia, realny silnik i eksport, szybkie rozpoznanie. **Słabe:** monolit HTML, powiązanie z kopią runtime w iframe, sztywne panele, ryzyko utrwalenia legacy. **Werdykt:** dobry *wzorzec porównawczy*, słaby punkt wyjścia dla wieloletniego systemu.

### B — Coopege-owned Studio z możliwością używania w Jaskini (REKOMENDACJA WARUNKOWA)

Coopege posiada semantykę gry, trwały autorski projekt, operacje i walidację. Instrumenty można uruchamiać samodzielnie, a Jaskinia dostarcza **hostowaną ergonomię i kompozycję pracy**. Dane i operacje nie polegają na życiu iframe/okna. **Mocne:** odzyskiwalny produkt i niezależna gra, rzeczywiste sprzężenie z domeną, reuse M3–M7. **Słabe:** może powstać wiele półbibliotek i adapterów bez jednego czytelnego UX; bez odpowiednich granic Jaskini dwa runtime'y mogą udawać jeden. Nie przesądzać liczby procesów ani konkretnego host API przed próbą.

### C — zewnętrzny dojrzały map editor + Coopege bridge + Jaskinia dla orkiestracji

Tiled/LDtk mapują teren, obiekty i warstwy; Coopege buduje tylko specjalistyczny authoring RPG oraz pipeline runtime. **Mocne:** wysoka używalność gotowych operacji, tanie badanie ergonomii. **Słabe:** model danych i eksportu obcego narzędzia może narzucać ograniczenia; trudniej stworzyć jedną naturalną sesję i mobilne/webowe doświadczenie Domu. **Werdykt:** poważna opcja porównawcza, nie substytut wizji.

**Warunek wyboru:** każdy wariant powinien być oceniony na tej samej reprezentatywnej pętli oraz na jednym **nieprzygotowanym** nowym zadaniu Ownera. Nie wybierać drogi przez deklarowaną modularność, liczbę funkcji czy własne przywiązanie agentów.

## 4. Proponowana kampania discovery → design → execution (bramki, nie daty)

### D0 — higiena źródeł i testów (przygotowane, do odtworzenia)

**Wynik:** źródła v3.1, M3–M7, F2, C1–C3, gałąź PR #11, Astry Studio, API Jaskini i świeże Owner feedback są czytelnie powiązane. Nie przepisywać całej historii. Dla każdego faktu: artefakt + rewizja + sprawdzona ścieżka + niewiedza; dowody automatyczne nie awansują na Owner UX.

**Potrzebna kontrola:** odtworzyć testy źródłowe PR #11 w natywnym środowisku repo, nie tylko interpretacji w V8; zweryfikować przy świeżych plikach przypadek legacy Quest JSON, assety i cold build. Bez tego tylko historyczny opis.

### D1 — porównanie operacji twórczych, nie ekranów

**Wynik:** macierz *gest → skutek → edytowalny dokument → runtime → powrót* obejmująca co najmniej:
- malowanie i przebudowę terenu wraz z auto-przejściami;
- wstawianie, przenoszenie, grupowanie i kopiowanie obiektów/fragmentów (w tym schody/NPC/quest anchors) z zakresem zmiany **jawnie** wybranym przez autora;
- podmianę grafiki potwora i korektę jego właściwości / zachowania;
- obejrzenie i zagranie w wynik, następnie dalszą zmianę;
- odzyskanie pracy po zamknięciu i alternatywę projektu.

Zmierzyć wstępne tarcie na istniejącym Studio i porównać z Tiled/LDtk tam, gdzie domena pasuje. **Nie zakładać**, że przenoszenie całego regionu jest najważniejszym gestem.

### D2 — warianty projektu doświadczenia (Superpowers: brainstorming i wybór)

Wiadomość z 2–3 rzeczywistymi podejściami (A/B/C) i kontrargumentami; świadomy wybór Ownera. Następnie **projekt doświadczenia**, nie implementacji: co dokładnie twórca może zrobić bez pisania kodu, co już działa, co nie ma działać, co jest anti-goalem, i jak poznamy porażkę. Wybrać konkretny sposób wykonania i najmniejszą spójną **wielozdolnościową** sesję, nie kilka niezależnych mini-przycisków. Podać Ownerowi projekt do oceny przed budową.

### D3 — plan implementacji po zatwierdzonym projekcie

Użyć Superpowers writing-plans. Wskazać konkretne pliki, interfejsy i testy, włączyć TDD i niezależne sprawdziany kodu, przy zachowaniu odizolowanego miejsca pracy. **Nie uruchamiać** tej fazy z historycznej gałęzi PR #11 bez wybranego designu. Nie modyfikować przez przypadek powłoki Jaskini Opusów.

### D4 — wykonanie wybranego authoring loop

Wynik ma być **używalną, samodzielną zdolnością**, a nie atrapą UI ani zestawem operacji wykonywanych wyłącznie przez testy. Minimum to przekrojowa sesja:
- w istniejącej Srebrnej Bramie twórca modyfikuje teren i obiekt;
- edytuje realną cechę potwora i powiązany asset;
- preview pokazuje zmianę, a **cold runtime** uruchamia ją po eksporcie;
- undo nie miesza dokumentu, runtime'u i układu okien;
- zapis/odczyt nie psuje wcześniej stworzonego dzieła.
Dla edycji w działającym świecie przewidzieć eksperyment, nie deklarować jako obowiązkowe technicznie na starcie.

### D5 — test falsyfikacyjny i decyzja transferowa

**Owner robi własne, nieprzygotowane drugie zadanie bez dopisywania specjalnego kodu przez agenta.** Kluczowe obserwacje: spontaniczne gesty, czas poświęcony na walkę z narzędziem, skalowanie/resize/focus, utrata kontekstu, chęć powrotu, rozszerzanie własnego pomysłu. Testować także okno 760 px, skrajne powiększenie, brak assetu, dwie otwarte edycje, nieudany zapis, nowy origin i konflikt skrótów Opery.

Sukces techniczny i autorski raportować osobno. Gdy któraś droga oblała, zachować wynik i **porzucić bez ceremonialnego dopracowywania**. Dopiero sprawdzone zachowania i falsyfikatory przekazać Opusom/Astrze jako nacisk na host, nie wymaganie kopiowania konkretnych klas czy API.

## 5. Najważniejsze zagrożenia i próby obalenia

| Zagrożenie | Próba, która może nas obalić |
|---|---|
| Stworzymy kolejne F2, tylko ładniejsze | Twórca próbuje zmienić grafikę, statystyki i rozmieszczenie jednego potwora bez asysty kodującej. Jeśli się nie da: **FAIL** |
| Zabetonujemy jeden model RPG w Jaskini | Ten sam host przyjmuje 2D Coopege i inny nie-mapowy lab bez modyfikowania domenowego rdzenia. Jeśli nie: hostowy kontrakt podejrzany |
| Pozorujemy „jedną sesję”, a mamy osobne kopie danych | Edycja jednej rzeczy w wielu widokach ma spójny cel/rewizję; rozbieżne instancje są jawnie oznaczone, nie udają tego samego świata |
| Silnik przekłamuje projekt | Próba i cold runtime czytają świadomie wskazany snapshot; brak cichego przepisania autorskiego źródła przez zniszczenia runtime |
| Nadmiernie automatyzujemy intencję | Przenosimy obiekt/relację z celowymi lokalnymi wyjątkami, widzimy zagrożenia i mamy wybór, nie przymusową korektę |
| Utracimy pracę przez UI lub origin | Zmiana layoutu, F11/focus, nowy origin i restart nie wymazują dzieła, a nieudany zapis jest jawny |
| Wydajemy pracę w ciemno | Wyniki Node/Chromium i screenshoty nie są nazywane Owner UX PASS; potrzebne realne niewyreżyserowane użycie |
| Przebudowa Studia pochłonie całą grę | W każdym większym etapie jest też materialna poprawa w grywalnym Coopege lub przynajmniej jawny koszt i ocena względem game feel |
| Wydamy pół roku na to, co Tiled robi dziś | Porównawcza ścieżka z istniejącym edytorem pozostaje do obalenia przed własną implementacją dużego zakresu mapowego |

## 6. Różne historia/undo/zapis — nie jedna magiczna komenda

To pytania badawcze i kryteria UX, **nie** zatwierdzony zestaw typów:
- **Dokument autorski** (teren, instancje, definicja potwora, asset, wariant) — trwa niezależnie od okien. Historia zmian odzwierciedla intencję autora.
- **Stan wykonawcy** (runtime gry, AI, kolizje, aktorzy, aktualna wyprawa) — może bazować na danej rewizji projektu; może mieć własną trwałość, ale nie przejmuje automatycznie praw do autorskiego źródła.
- **Stan stanowiska** (okna, panele, skróty, skupienie, kamera) — odtwarzalny, ale cofanie podziału okna nie powinno cofać wcześniejszej pracy nad mapą.
- **Pochodne i eksport** (standalone HTML, atlas PNG, uproszczona mapa dla innego runtime) — muszą podawać, jaką rewizję i jakie znaczenia zachowują lub tracą.
- **Osobista ocena Ownera** — nie jest wynikiem testów technicznych i nie należy jej spłaszczać do historii commitów.

## 7. Co przekazujemy Jaskini; czego nie narzucamy

Wspólna **potrzeba**, nie kontrakt narzucony z tej gałęzi:
- autor może swobodnie składać stanowisko i używać kilku współpracujących widoków, zachowując dzieło przy resize/zamknięciu;
- organ może pozostać samodzielny, a Jaskinia nie musi wiedzieć, czym wewnętrznie jest quest, mapa albo shader;
- wspólne obiekty są wskazywane przez odpowiedzialnego właściciela i jawne wersje/uprawnienia, nie przez współdzielony globalny mutable object;
- host nie udaje, że `hello/state` to już transakcyjne authoring API;
- rozszerzanie możliwości Jaskini przez Opusów/Astrę może przebiegać niezależnie od tej linii bez wymuszenia dołączenia Coopege do konkretnej gałęzi.

**Nie zamawiać jeszcze:** frameworka pluginów, uniwersalnego save formatu, wspólnego keymapu wszystkich gier, pełnego CRDT, automatycznej migracji lokalnego storage, jednego symulatora 2D/2.5D ani wspólnej klasy `World`.

## 8. Reguły długoterminowego przekazywania wiedzy

To **jeden kanoniczny dokument rozpoznania** na tę kampanię; szczegółowe wyniki testów pozostają w `STUDIO_ARCHAEOLOGY_2026-11-09.md` i w PR #11. Nie kopiować tego tekstu do pięciu issue.

- Gdy pojawi się *nowe* źródło, zapisać obok twierdzenia: **proweniencja → dokładne środowisko / SHA → poziom dowodu → ograniczenie → co je obala**. Każde powtórzenie ma wskazywać tę samą pozycję, nie tworzyć nowe „ustalenie”.
- Dla ważnych rozstrzygnięć używać **OWNER / OBSERVED / TECH PASS / HYPOTHESIS / REJECTED / OPEN**. Nie nazywać syntetycznego testu dowodem preferencji twórczej.
- Jeśli wniosek zostaje obalony, **nie usuwać śladu**; dodać bezpośrednie `SUPERSEDED BY` i wskazać test/feedback. Nie przedłużać życia martwej propozycji przez samą obecność w README.
- Komentarze w repo pozostałych agentów tylko wtedy, gdy nowy wynik może zmienić ich decyzję. W innym przypadku aktualizować dokument źródłowy i nie dokładać pracy czytania.
- Nie publikować prywatnych JSON Ownera, zapisów gry, jego prywatnych rozmów ani danych z Opery; cytować tylko autoryzowane fragmenty jego decyzji w obecnym wspólnym kontekście.
- Po wyborze i realnym Owner teście z tego dossier powinna zostać **krótka karta decyzji** z wyborem, źródłami, zdyskwalifikowanymi opcjami i warunkiem ponownego otwarcia sporu. Nie przemieniać całego badania w wieczną roadmapę.

## 9. Jedno otwarte rozstrzygnięcie

**Czy pierwsza kampania ma oddać Ownerowi przekrojowy obieg pracy nad prawdziwym RPG (mapa + obiekt/potwór + grafika + działająca gra, wariant B), czy celowo rozpocząć od reanimacji historycznego Studia jako tymczasowego szerokiego warsztatu (A), czy od integracji z dojrzałym edytorem map (C)?** Rekomenduję B jako cel, A i C jako kosztowe kontrpróby. Nie pytamy dziś Ownera o wybór biblioteki UI i wewnętrznych typów.

**Stan na koniec przygotowania:** rozpoznanie, źródła, przeciwnicy hipotez, bramki, kryteria i dalsza droga są gotowe do wspólnego omówienia. **Specyfikacja i plan implementacyjny pozostają otwarte** do wybrania podejścia; niczego nie wdrożono ani nie scalono.
