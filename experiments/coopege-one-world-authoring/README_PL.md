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