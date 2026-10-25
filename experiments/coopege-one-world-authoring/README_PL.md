# Coopege — jedna mapa, edycja i przyczynowość (próba 25.10.2026)

**To grywalny, odwracalny eksperyment, NIE nowe kanoniczne Coopege.** Cel: sprawdzić, czy twórca i aktorzy faktycznie korzystają z tej samej mapy, gdy zmieniamy ją podczas rozgrywki. Nie zamrażamy architektury, systemu walki, klas, stylu graficznego ani rozwoju gry.

## Uruchomienie

Otwórz `Coopege_One_World_Studio_Trial.html` lokalnie w Chrome lub Operze. Wybierz klasę `1` / `2` / `3`; poruszaj się `WASD`, walcz `Spacją`, wchodź w interakcje `E`.

- `F2` otwiera **bezpośrednią edycję istniejącej mapy**. Gra zatrzymuje się, ale nadal widać ten sam świat. Klikaj/przeciągaj po terenie, wybierając trawę/kamień/mur/ścieżkę/wodę. Edytowane są rzeczywiste typy pól, nie nakładka graficzna.
- `Ctrl+Z` / `Ctrl+Y` cofają/ponawiają **cały ruch pędzla**. Cofanie odtwarza dokładny historyczny typ kafelka, także gdy nie figuruje w szybkiej palecie.
- Panel edycji eksportuje JSON zmian i pełny świat (`F8`); JSON zmian można zaimportować wyłącznie na zgodną mapę. Import jest walidowany przed zmianami; przy niezgodności odrzuca cały plik.
- Podczas podróży na południe działa tragarz: istniejące szczury mogą go zranić; blisko niego `E` wydaje polecenie zatrzymania/wznowienia, zaś dostawa wpływa na ofertę kupca.
- Gdy zmienisz przechodniość na trasie już idącego tragarza, jego nawigacja **sprawdza aktualne pola**, przelicza drogę albo zatrzymuje się; po udrożnieniu wznawia marsz.

## Zweryfikowane, bez naciągania

- 21 kontroli przeglądarkowych: trzy klasy, komplet pięciu warstw świata, poprawne wskazanie płytki myszą, malowanie, jednoznaczne undo/redo, rzeczywista kolizja gracza (ściana: Y≈86.5; bez ściany: Y≈95.7), import/odmowa importu, brak JS error w sprawdzonych trasach.
- Pięć ścieżek modułu nawigacji w Node VM: otwarta trasa, blokada przed planowaniem, przeszkoda po rozpoczęciu marszu bez powiadomienia, przeszkoda po powiadomieniu, całkowite zablokowanie celu i odblokowanie. W teście aktor nie wszedł na zablokowany kafelek i wznowił dostawę; to dowód ograniczonego algorytmu, nie pełnego AI ani pełnego grywalnego świata.
- Odtworzenie zapisanego stanu terenu w **symulowanym `localStorage`** działa i nie używa historycznych kluczy Tibii. **Trwały zapis na prawdziwym originie przeglądarki nie został zweryfikowany** — środowisko testowe blokowało lokalną nawigację; ostateczne zachowanie `file://` w Chrome/Operze trzeba sprawdzić. Zachowuj eksport JSON na zewnątrz.

## Granice i ryzyka

Oparte na dużym, historycznym HTML-u Tibii v14.1. Nie ma kompleksowych testów wszystkich pięter, dialogów, NPC, questów, walki, importu assetów i rzeczywistej migracji między wersjami. Wykorzystanie `StudioLite` to jeden niewielki kanał edycji; historyczna wizja Studio obejmuje również assety, animacje, potwory, przedmioty, klasy, talenty, skille, questy, prefaby i światowe zależności. **Nic z tego nie staje się automatycznie gotowe przez ten eksperyment.** Wciąż brak Owner-approved playtestu i dowodu, że nowa wersja oferuje lepszy gameplay od starej Tibii.

## Jak odtworzyć i sprawdzić

1. `sources/Coopege_One_World_Trial_Escort_Donor.html` — dokładna baza, nie zmodyfikowana (SHA-256 w manifeście).
2. `studio-lite.js` — osobny adapter authoringu. `build.py` odtwarza samodzielny HTML, wstrzykując małą poprawkę trasowania do niekanonicznego eksperymentu.
3. `node check_routes.mjs` — deterministyczne, ograniczone scenariusze nawigacji.
4. `python browser_regressions.py` — Chromium + Playwright, wymaga dostępnego Chromium/Playwright.
5. `python test_rehydrate.py` — dodatkowa kontrola przy użyciu symulowanego `localStorage`.

**Następny rozsądny ruch:** zanim cokolwiek trafi do głównej linii Coopege, przeprowadzić Owner feel-test nowego egzemplarza oraz porównać go bezpośrednio z oryginalną Tibią. Następnie krytycznie wybrać, które granice authoringu/gameplayu warto przenieść do solidniejszej architektury, zamiast dalej powiększać monolit.

## Dodatkowy dowód po odzyskaniu szerszej wizji — 25.10.2026

- [test_live_route.py](./test_live_route.py) sprawdza **pełne Chromium** (a nie tylko moduł Node VM): wybór wojownika, naturalny marsz WASD, aktywacja tragarza, otwarcie F2 w tym samym świecie, import jednej ściany na trasę NPC, powrót do gry i rzeczywiste ominięcie przeszkody. Zaobserwowano tragarza w kolumnie x=85.5 zamiast zablokowanej x=86.5, jedno ponowne trasowanie, brak błędów JS; PASS na dokładnym HTML SHA-256 `6b1487182105e1ec973dbd20de56912c405eb9413abd3266954c0f3543a7ba6d`.
- Próba uruchomienia testu zapisu na prawdziwym HTTP localhost skończyła się `ERR_BLOCKED_BY_ADMINISTRATOR`. **Nie dowodzi usterki gry ani nie ustanawia PASS trwałości przeglądarkowej**; istniejący test `localStorage` pozostaje tylko symulowany.

### Tibia Studio + Jaskinia: jedna wizja, nie dzisiejszy zakres integracji

Owner potwierdził 25.10, że ambicje historycznego Tibia Studio i Jaskini należą do **tej samej wizji tworzenia, uruchamiania i doświadczania własnych światów**. Należy przy dalszym projektowaniu odwoływać się do realnych donorów w [Jozz-Cave-Workbench v6](https://github.com/Jozzpoly/Jozz-Cave-Workbench/tree/v6-materialy), m.in. Materiały (import, tożsamość, rewizje, odzyskiwanie), Ruch (własne manipulacje i opis dla agentów), okna Przyrząd/Gra i ich ograniczenia, oraz do oryginalnych API Tibia Developer Studio v3.1. **To eksperymentalna gałąź Jaskini, a nie automatycznie zatwierdzony wspólny fundament.**

Granica: żywy świat Coopege nie może zostać zredukowany do iframe z osobnym stanem; 3D/Blockbench materiały Jaskini nie są bezpośrednio 2D sprite'ami ani definicjami RPG, a każde wejście przez inny origin może mieć odrębny magazyn. Reuse oceniamy po faktycznej zdolności autora: stwórz/zmień → graj → zobacz konsekwencję → popraw, **bez utraty oryginalnego dorobku**, a nie po liczbie wspólnych paneli. Dalszy priorytet tej linii to nadal **lepsze Coopege jako gra RPG**, nie nagła przebudowa Jaskini.
