# Coopege Studio B01 — raport pierwszej kampanii authoringu

**Data:** 10 XI 2026. **Status:** SOURCE BRANCH WIP / kompaktowe doświadczenie działające na osobnej, dawnej paczce M7 / OWNER UX UNTESTED / **DO NOT MERGE**.

## Intencja

Owner zatwierdził drogę B: niezależne Studio Coopege z możliwością korzystania z organizacji stanowiska Jaskini. Nie narzuca to architektury Jaskini Opusów i Astry. Realnym celem jest ambitny warsztat tworzenia całego RPG, a nie pięciokafelkowy F2, który Owner nazwał antyprzykładem. B01 jest **pierwszą czynnością przekrojową**, nie gotowym Studiem ani finalnym modelem sesji.

[Spec tej próby](../superpowers/specs/2026-11-10-coopege-authoring-thread-design.md) · [plan i bramki](../superpowers/plans/2026-11-10-coopege-authoring-thread.md) · [wcześniejsza archeologia](https://github.com/Jozzpoly/Coopege/blob/experiment/coopege-editor-structure-2026-11-09/experiments/editor-structure-2026-11-09/STUDIO_ARCHAEOLOGY_2026-11-09.md) · [szersze dossier w Commons](https://github.com/Jozzpoly/Jozz-Commons/blob/main/wplywy/2026-11-09-coopege-studio-kampania/RESEARCH_BRIEF.md)

## Co powstało w KODZIE ŹRÓDŁOWYM (gałąź od main)

- `apps/studio/src/spawn-inspection.ts`: funkcje odczytu *wszystkich* spawnów na danym polu i dokładnego ID, bez edycji projektu; `tests/spawn-inspection.test.ts` (3 testy).
- `apps/studio/src/map-editor.ts`: nowy tryb `inspect` zamiast nakładania wskazania na pędzel, lewostronny inspektor spawnów, jawny wybór wielu wpisów, `focusSpawn` po ID z doborem piętra i centrum mapy, brak komendy ProjectStore podczas samego wskazania. Po odświeżeniu projektu selekcja ma nie nawigować do skasowanego spawnu.
- `apps/studio/src/content-browser.ts`: `selectMonster`, pokazanie dokładnego assetu i listy wystąpień tego potwora na mapie.
- `apps/studio/src/asset-browser.ts`: `selectAsset` bez niejawnego fallbacku.
- `apps/studio/src/main.ts`: jedynie domenowa nawigacja między już istniejącymi instrumentami, z niezmienionym autorytetem `ProjectStore`.
- `apps/studio/template.html`: przycisk „Wskaż obiekt”, inspektor po lewej (nie schowany z prawej przy węższych oknach), nowe akcje contentu i próba uporządkowania header/tabów przy 761–1200 px.
- `tools/test/browser-smoke.mjs`: nowy scenariusz e2e z rzeczywistym spawnem, nawigacją, HP edit → preview → undo. **Test ten jest zapisany, ale nie został jeszcze wykonany na buildzie TEJ gałęzi.**

Bazą jest `Coopege/main` `1b3f4fbc7834a7503a43770236ca0930e5799c9e` (aktualne M8 LAN ma własne niedomknięte retesty Ownera). Nie ingerowano w `main`, w branchy opiekunów LAN, ani w starą i nową Jaskinię. PR #11 dot. relokacji regionu pozostaje odrębnym badaniem; żadnego cherry-pick jego kodu.

## WYKONANE, INDEPENDENTLY OBSERVED — nie mylić z kompilacją źródła

### 1. TDD helper

W izolowanej kopii testów: najpierw RED (brak modułu), potem minimalna implementacja i GREEN: **3/3 PASS** w Node (dwa spawny na jednym polu, różne piętra, ID, brak mutacji). Dodatkowo pobrano **dokładne źródło helpera z gałęzi** i wykonano uproszczoną wersję bez TS typów w V8 na prawdziwym migracyjnym `coopege.project.v2.json`, z **338 spawnami**: odpowiedni spawn, exact ID, nieznany ID i brak mutacji. NIE jest to `npm run check` repo.

### 2. Prawdziwy M7 — samodzielna paczka, *osobny wariant badawczy*

Z własnej Biblioteki Ownera materializowano zachowany skompilowany `Coopege_Studio_v0.1(2).html` (ok. 1.4 MB). W niezależnej kopii instrumentowano jego istniejące moduły M7, dodając ten sam przepływ nawigacji; nie tworzono nowego silnika, mapy ani syntetycznych obiektów. Artefakt dla Ownera: `Coopege_Studio_B_Experiment_01.html` — plik dostarczony w rozmowie; **nie** jest kompilatem bieżącej gałęzi TypeScript.

W izolowanym Chromium + Python Playwright:
- realny projekt: `coopege.silver_gate_legacy`, Smok `monster.legacy.dragon`, spawn `spawn.legacy.apex_dragon_nest.dragon.1` na piętrze z2 przy **(168,24)**, tekstura `texture.legacy.monster.dragon`;
- mapa → wybór dokładnego spawnu → `Edytuj potwora` → definicja → `Pokaż grafikę` → asset → wybór miejsca → mapa → natywny pointer click → definicja;
- nawigacja: **bez zwiększenia rewizji autorskiego projektu**;
- istniejący formularz: HP Smoka **290 → 297**, odczekanie na `previewStudioRevision`, Undo **→ 290**; **PASS**, zero `pageerror`;
- oddzielny test: import zmodyfikowanego rzeczywistego atlasu 256×256 przez Asset Vault, HP Smoka **290 → 303**, akceptacja w podglądzie → **eksport samodzielnej gry** → *cold* uruchomienie w nowym dokumencie; runtime potwierdził **HP 303 i dokładne nowe PNG**, zero `pageerror`: **PASS**;
- przy 1024×768 inspektor był dostępny po przewinięciu lewej kolumny; klik na „Edytuj potwora” fizycznie przełączył na poprawną definicję w Chromium, bez błędu JS.

Wyniki te potwierdzają **możliwość domenowego obiegu na istniejącym silniku M7**, nie ukończenie jego źródłowego portu ani ergonomii hosta Jaskini.

## Granice oraz niespełnione bramki

- **SOURCE BUILD UNVERIFIED:** nie wykonano `npm run typecheck`, `npm run check`, `npm run test:browser`, `npm run build` na nowym branchu. W obecnym środowisku GitHub był dostępny przez connector, lecz brak poświadczeń pozwalających sklonować prywatne repo do procesu Node/tsc. Zmodyfikowany `browser-smoke.mjs` przeszedł kontrolę składni (po zastąpieniu importów na potrzeby izolowanego parsera), ale nie przeprowadził e2e źródłowej gałęzi.
- Różnica testowanej paczki M7 i rozwijanej gałęzi M8 **jest rzeczywista**. Sukces prototypu HTML nie rozstrzyga, czy źródłowa integracja kompiluje się i zachowuje w najnowszym buildzie.
- **USER UX UNVERIFIED:** atrakcyjność i wygoda ocenia Owner; lista paneli nadal jest sztywna, drobna i oparta na zakładkach. Przy 1024 części trzeba scrollować; przy 760 pionowy stack jest uciążliwy. To nie jest „dojrzała pracownia w Jaskini”.
- Nie sprawdzono kilku nakładających się spawnów poprzez realny klik ani recency konfliktów pomiędzy dwoma sesjami i originami.
- Klikanie spawnu wskazuje **wystąpienie** definicji potwora, a edycja HP tej definicji dotyka **wszystkich jej wystąpień**. W UI musi być to z czasem jednoznaczne dla twórcy; B01 jeszcze nie wprowadza pełnego wyjaśnienia zasięgu zmian.
- Nie odtworzono pełnych NPC, questów ani semantyki regionów z historycznej Tibii. Wariant B **nie może ich zapomnieć tylko dlatego, że bieżący schema M7 ich nie obejmuje**.
- Żadnej nowej kontroli nad grywalnością, walką ani feel Coopege; to pozostaje osobną współodpowiedzialnością naszej linii, wymaga przyszłych playtestów.

## Następne sprawdziany, zamiast deklarowania „done”

1. Odtworzyć gałąź w prawdziwym checkout Coopege, wykonać `npm run check` i browser smoke, naprawić ewentualne błędy test-first.
2. Przeprowadzić source-build e2e: wskazać realny obiekt, zmienić HP, undo, eksport i cold restart.
3. Udowodnić zachowanie stanu po zmianie układu/powrocie, bardzo wąski viewport i brak pomylenia definicji ze spawnem.
4. Dopiero potem Owner test funkcjonalności i spontanicznej twórczości; następną osobną kampanią ma być **komponowanie współpracujących instrumentów**, nie więcej małych tabów.
5. Współpraca Opus/Astra: udostępnić konkretne granice z testów (host-window life, focus, origin storage, pojedynczy dokument), nie narzucać do Jaskini niezweryfikowanego API.

**Werdykt:** domenowy pomysł B dostał pierwszy materialny eksperyment na prawdziwym M7 i w źródłach, ale wersja źródłowa pozostaje **WIP / niekwalifikowana do merge**. Zachować dowody, oddzielić je od planów i nie traktować eksperymentu jako ukończonego produktu.
