# COOPEGE — B0 / granica dziedziczenia (23.10.2026)

**Cel eksperymentu:** oddzielić aspiracje i autorski świat Ownera od starych metod implementacji. Nie rozpoczynać nowego monolitu, nie migrować wszystkich dawnych skryptów, nie ogłaszać nowego silnika. `main` i obie grywalne linie eksperymentalne pozostają nietknięte.

## Aktualny Owner intent (większy autorytet niż stare roadmapy)

Owner chce **jednej nowej gry Coopege**, spełniającej dawne marzenie stojące za Tibią i Coopege lepiej i ambitniej niż wtedy. Gra ma własną tożsamość, nie jest Feniksem w miniaturze. Główne zadanie teraz to **grywalne solo: przygoda, ruch, walka, eksploracja, miejscowy charakter, rozwój, twórcza kontrola**. Multimedia i co-op mogą rosnąć później; stare P1/P2, split-screen i M8 LAN nie są zobowiązaniami. Użytkownik zna już działający 2P i badania 1–6 z Multi_World: nie zaczynać nowej kampanii sieciowej.

**Ważna korekta z Owner-playtestu 22.10:** R0 od strony inżynieryjnej działa, lecz jako całość jest wyraźnie gorsze do grania niż Tibia v14.1. A1 jest bogatsze, ale dodawanie mechanizmów do monolitu Tibii też może być błędnym kierunkiem. Dwa PR są **donorami / benchmarkami, nie wybranym fundamentem**:
- [R0 #1](https://github.com/Jozzpoly/Coopege/pull/1): fizyczne wycofanie przeciwnika, LOS, geometria ataków, testy, browser.
- [A1 #2](https://github.com/Jozzpoly/Coopege/pull/2): bogatszy świat Tibii, kierunkowa garda — nadal stary monolit.

## Twardy eksperyment: geometria ≠ semantyka ≠ jakość

`audit-boundary.mjs` uruchamia **prawdziwą Tibię v14.1 w Chromium**, wywołuje `TibiaMapAPI.exportWorld()` i `TibiaContentAPI.exportPackage()`, następnie porównuje z realnym `project/migration/legacy-v14.1/coopege.project.v2.json`. Raport jest machine-readable. Nie zgaduje z regexów ani list README.

- **Geometria:** wszystkie 5 pięter, razem **200 000 / 200 000 kafli**, zgodne co do typu i pozycji.
- **Mieszkańcy:** 2 nazwane role (`healer`, `merchant`), których nowy model migracyjny nie przechowuje jako NPC.
- **Nazwane przejścia:** 13 miejsc (bramy, kuźnia, karczma, świątynia, itd.) — brak jawnych nazwanych wejść w modelu migracji. 12 linków źródła i 24 skierowane przejścia migracji nie oznacza automatycznie straty: reprezentacja grafu jest inna.
- **Questy:** 5 autorskich definicji z nagrodami nie przechodzi do `content.quests` ani analogicznej jawnej kolekcji. Migracja ma jednak *ogólny* `graph.quest.monster-kill-credit`: posiadanie wykonawcy nie oznacza zachowania pięciu sytuacji.
- **Zagrożenia:** 45 zaprojektowanych grup, 15 `special`, 5 tierów. Źródło ma nazwy, regiony, anchory, `leash`, `alert`, mieszany skład, **23 zadeklarowane miejsca jednostek elitarnych i jednego nazwanego bossa — Pradawnego Smoka Głębin**. Stary wykonawca realnie wykorzystywał m.in. `alertPack`, odległość pościgu i grupowy respawn; nie była to tylko martwa etykieta. Migracja ma **338/338 pojedynczych spawnów** i 45 fragmentów grupowych nazw w ID, ale **0/338 jawnych pól grupowego znaczenia**. Przykład: `deep_crypt_throne_host` — „Dwór martwego króla”, tier 5, `special=true`. Samo zachowanie jego smoków na mapie nie zachowuje dramaturgii ani formacji tego spotkania.

**Kwalifikacja:** to straty w jawnym modelu danych migrowanej gry, nie dowód, że każda podobna czynność jest niemożliwa w każdym kodzie runtime. Oryginalne historyczne treści nie są wzorcem jakości. Liczby kafli i spawnów nie mierzą przygody.

## B0: wąski most dla autorskich źródeł

`source-authored-witness.json` jest automatycznie generowanym *świadectwem źródłowym*, nie kanonicznym modelem gry. Przechowuje wyłącznie dane z **prawdziwych API oryginału**: 5 pięter i paletę, start, NPC, nazwane wejścia, linki, grupy, pozycje, definicje questów, potworów. Wprost wylicza obszary, których nie umie odzyskać (`EQUIP_DB`, sklepy, dialogi, png oraz executable semantics).

`validate-witness.mjs` ma być niezależnym od Tibii konsumentem, który potwierdza, że nazwana okolica jest przestrzennie osiągalna z punktu startowego. Nie przepisuje algorytmu walki ani logiki klasy, nie sprowadza NPC do twardego menu.

**Nie robić z tego schematu v1 ani dużego importera automatycznego.** Traktować jak historyczny zapis znaczeń, z którym kolejne wykonanie może negocjować. Użytkownik powinien móc później twórczo zmieniać te miejsca, także całkowicie je zastąpić.

## Krytyka trzech kuszących ścieżek

| Ścieżka | Pokusa | Falsyfikator |
|---|---|---|
| Łatać A1 w nieskończoność | Już ma RPG, klasy, loot i zadania | Ile kosztuje *jeden* naprawdę nowy rodzaj interakcji i niezależna kontrola autorstwa bez kolejnych wyjątków w monolicie? |
| Budować na R0 | Jest testowalny i porządniejszy | Jak długo odzyskujemy bogatą przygodę tylko po to, aby wrócić do punktu, gdzie zaczynała się Tibia? |
| Nowy czysty silnik od zera | Pełna swoboda projektowa | Czy pierwsza rzeczywista gra jest przez miesiące gorsza niż stara Tibia, podczas gdy rośnie infrastruktura? |

**Preferowana hipoteza do obalenia:** ograniczony, nowy **runtime dla autorskich sytuacji** z wybiórczym reuse mechanizmów (rendering, physics, save, deterministyczne command simulation), ale wymagający od początku *równie bogatego odcinka doświadczenia*, a nie pustego świata. Nie wybierać od razu jedynego frameworka, fizyki i trwałego modelu danych.

## Następny test musi być grą

Ta sama *nazwana okolica* i realna sytuacja w A1 i w nowym kandydacie. Nie mierzyć długości kodu ani liczby systemów. Wymagamy:
- gracz chce wyjść z osady, bo **istnieje zrozumiały powód** i interesująca przestrzeń;
- co najmniej jedna decyzja zmienia sposób konfrontacji, odwrotu albo powrotu; nie jest to liniowy trigger;
- przeciwnik nie jest tylko HP+aggro, a przedmiot nie jest wyłącznie licznikiem;
- pozostaje autorska tożsamość miejsca, nawet jeżeli mechanizmy i grafika są nowe;
- zdarzenie, jego konsekwencja, zapis/odczyt i alternatywny przebieg są czytelne z poziomu gry;
- przemiany świata nie muszą mieć pełnej fizyki, ale powinny być prawdziwe dla kilku systemów, nie jednym custom eventem na pokaz.

Ważne ryzyka: próba adaptacji tylko jednego fragmentu mogłaby być efekciarskim demo; bogactwo Tibii nie może być maskowane. Późniejsze COOP przygotować tylko przez brak hardcoded globalnego P1, identyfikowalne akcje/aktorów, stan do serializacji i odróżnienie authoring od sim — **bez pisania sieci**. Studio/Jaskinia nie powinny blokować wykonania, ale też nie mogą być tylko linkami do repo.

## Dzisiejsze technologie to opcje, nie decyzje

- **Phaser 4** (wydany 10.04.2026) ma gotowe renderowanie/tilemapy/sterowanie — może pomóc szybciej uzyskać *prawdziwą grę*, jeśli nie podyktuje jej zachowania.
- **PixiJS 8** daje wydajne renderowanie i większą swobodę modelu symulacji; WebGL pozostaje rekomendowaną podstawą, WebGPU nie musi być wymagane.
- **Rapier JS/WASM 2D** umożliwia kolizje, kontakty i snapshoty oraz deklaruje deterministyczność WASM przy rygorystycznie jednakowym stanie początkowym. Nie jest automatycznie lepszy od prostej semantycznej kolizji do każdego zadania.

Oficjalne punkty odniesienia: https://phaser.io/phaser4 ; https://pixijs.com/8.x/guides/components/renderers ; https://rapier.rs/docs/user_guides/javascript/determinism/ . Nie wybierać technologii tylko na podstawie listy funkcji. A/B ma porównać **czas do grywalnej sytuacji, feel, koszt authoringu, debug, CPU/mobile i future-coop pressure**.

## Co zostaje otwarte

Model przestrzenny 2D vs 2.5D/ograniczony 3D, docelowa mechanika walki, skala cielesności/fizyki, UI RPG, rozwój gracza, nazwy/lore, rola 45 dawnych grup, ostateczna reprezentacja autorskich sytuacji i ich semantyki, docelowy backend, model Studio. To *pytania do eksperymentów*, nie cechy przepisane z historycznych plików.

**Jedyna rzecz, której nie oddajemy w eksperymencie:** jakości rzeczywistej zabawy i twórczej sprawczości Ownera. Ani elegancki silnik, ani bogaty katalog starej Tibii nie mają nad tym pierwszeństwa.
