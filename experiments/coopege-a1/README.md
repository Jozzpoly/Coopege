# Coopege A1 — kontrkandydat z bogatszej Tibii, nie finalna gra

**Status:** izolowany eksperyment po pierwszym Owner-playteście Coopege R0 (22 października 2026). **Nie scalać automatycznie.**

## Punkt zwrotny

Owner uruchomił R0 i przypomniał sobie, **jak mocno Coopege M7/R0 odstawało jako *gra* od historycznej Tibii v14.1**. Postanowienie: nie naprawiać dalej M7 dlatego, że ma przyzwoite testy i architekturę. Ma powstać jedna autonomiczna, ambitniejsza gra **Coopege**, przekraczająca obydwa dawne wydania. Solo najpierw; przyszły co-op ma być możliwy, ale nie może sterować obecnym priorytetem.

**Konsekwencja:** Tibia jest obecnie lepszym *playable experience donor*, Coopege M7/M8 lepszym donorem wybranych kompetencji architektonicznych, a Multi_World — potencjalnym donorem na później. To jeszcze nie wybór docelowego silnika.

## Co zawiera A1

Plik [Coopege_A1_Tibia_Donor.html](./Coopege_A1_Tibia_Donor.html) jest kompletną uruchamialną grą HTML, pochodzącą z niezmienionego pliku [Tibia v14.1 DevAPI](../../legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html) (Git blob `ee03e6250585d8ee9d5965d17abf73e1c0403cdc`). A1 ma odizolowane zapisy i nowe oznaczenie. Zachowuje 5 pięter, trzy klasy, questy, NPC, sklep, przedmioty/ekwipunek, talenty, oryginalną geografię, rendering i narzędzia authoringu.

**Nowe, eksperymentalne działania:**
- Wojownik może trzymać **Shift**, by wejść w kierunkową gardę. Blok jest możliwy wyłącznie przeciw bezpośredniemu trafieniu wręcz z przedniej strefy 120°. Nie działa na ataki w plecy ani efekt środowiskowy.
- Osłona zmniejsza otrzymane obrażenia, ale zużywa energię; jej trzymanie spowalnia ruch do 48% i uniemożliwia pełny atak mieczem/Whirlwind. Tarcza jest pokazywana przestrzennie przy postaci, a pasek informuje o energii.
- Wybieranie celu, podstawowy cios, cleave i Whirlwind wymagają nieprzesłoniętej linii; nie powinny ignorować ściany.
- Zapis, roster, ustawienia i cache assetów używają nowej przestrzeni kluczy `coopege_next_a1_*`, zatem nie ingerują w zapis historycznej Tibii.
- Wbudowane `window.CoopegeCandidateA1` umożliwia czytanie stanu; tylko oznaczony tryb `#a1_test=1` dopuszcza kontrolowany bodziec badawczy (nie naturalną walkę).

## Empiria z bieżącego runu (browser Chromium)

- **Trzy klasy** załadowane w realnym Chromium; każda w oryginalnej mapie z 110 żywymi przeciwnikami na powierzchni; dostępne nadal `TibiaMapAPI`, `TibiaContentAPI`, `TibiaAssetAPI`.
- **Kierunkowa osłona**: po ustawieniu wojownika na wschód i przytrzymaniu Shift, kontrolowany pojedynczy bodziec o 30 obrażeniach: **od frontu 10 HP**, od tyłu **30 HP**; spadek energii po trafieniu, ruch normalny ok. 52–56 px / 410 ms vs ruch w gardzie 27–29 px.
- **Geometria**: rzeczywiste authored tile `z0,x24,y21` z przesłaniającym sąsiadem poprawnie daje blocked sightline, a otwarty fragment nie.
- **Naturalny marsz bez teleportów**: od x2832,y2704 marsz S przez ~5.2 s na południe, kontakt i ataki zwykłym `Space` z cooldownami: **2 zabite szczury, 7 złota, postęp zadania 2/8**, a potem własny odwrót W do okolic startu. To przebieg jednej sesji w Chromium, nie gwarancja dokładnych wyników w kolejnej losowej rozgrywce.

Dowody lokalnego przebiegu są w dołączonym pakiecie rozmowy: `BROWSER_EVIDENCE.json`, `CLASS_AND_OCCLUSION_EVIDENCE.json`, `EXPEDITION_EVIDENCE.json` i screenshoty. GitHub Actions [A1 browser gate](../../.github/workflows/coopege-a1.yml) weryfikuje SHA256 obu HTML-i, rzeczywiste uruchomienie 3 klas oraz input/gardę i LoS na autentycznej mapie.

## Dlaczego A1 *nie* jest nowym Coopege

Główny plik Tibii pozostał dużym monolitem (~342 kB A1) z surowym ruchem, oskryptowaną liniową progresją kill-X, sporą przypadkowością AI i nieprzemyślaną jeszcze pętlą ekosystemu. Garde należy traktować jako **hipotezę do feel testu**, nie zatwierdzony system walki. Testy nie wykazały jakości gry po godzinach grania, integralności save w różnych przeglądarkach ani bezpiecznej architektury przyszłego multiplayera.

Nawet gdy A1 jest bogatszą grą niż M7, **nie oznacza to, że musimy na stałe rozbudowywać monolityczną Tibię**. Nie przenosić od razu starych klas, siatki talentów, kill quest chain ani algorytmów NPC jako kanonicznych inwariantów.

## Dalsza praca, bez defleksji w infrastrukturę

Pierwsza porównawcza bramka jest wyraźna: **czy Coopege rozwijane na bogatym donorze można naprawdę poprawić w decyzjach minute-to-minute**, zamiast tylko wymieniać technologię. Następny eksperyment powinien wprowadzać prawdziwą nową affordance / sytuację w jednym miejscu (interakcja przestrzenna, fizyczna przeszkoda, inny rezultat wyprawy, wybór zagrożenia i wycofanie) i jednocześnie zachować to, czego brakowało w R0: NPC, przedmioty, rozwój, rozmaite krainy, gotowy gameplay loop.

Podejmować decyzje między trzema drogami na podstawie *grywalnych porównań*:
1. kontynuować Tibia-derived A1 (najszybciej dostarcza RPG; największy dług monolitu),
2. wzmacniać Coopege M7 (sprawdzony runtime, ale duża utrata doświadczenia),
3. rozwijać nowy, mały, dobrze podzielony rdzeń **z Tibia-quality experience jako obowiązującym benchmarkiem** (największa niezależność, ryzyko odwlekania samej gry).

Nie należy scalać R0 ani A1 do `main` automatycznie. Pozostawić obie ścieżki widoczne i łatwo uruchamialne. Studio Feniksa, Jaskinia i Multi_World są donorami wybranych kompetencji, a nie konkurencyjnymi produktami, które trzeba integrować przed zabawą.
