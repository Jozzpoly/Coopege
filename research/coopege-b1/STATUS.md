# COOPEGE — B1, pierwszy niezależny kandydat grywalny (23 X 2026)

**Owner intent:** jedna nowa, własna gra Coopege, wykraczająca ambicją i jakością poza dawną Tibię v14.1 i Coopege M7/M8. Szanować marzenie, autorski charakter i zamierzone doświadczenie; **bez obowiązku szanowania starego kodu, techniki, questów, klas, split-screena i LAN**. Solo najpierw, możliwość dodania co-opu później. Nie mini-Feniks. Wykorzystać samodzielnie dorobek Jaskini, Feniks Studio i Multi_World, nie wiązać ich rozwoju transakcją integracyjną.

## Co naprawdę zbudowano w B1

**Nowy, mały runtime i widok, nie wykonywanie starej Tibii.** Kod: `world.js` (rozgrywka i zapis), `view.js` (projekcja i wejście), `build.mjs` (samodzielny HTML), `world.test.mjs` i `browser.test.mjs`. Używa tylko `source-authored-witness.json`, automatycznie wyeksportowanego przez prawdziwe API oryginału w B0.

- Prawdziwa authored powierzchnia Srebrnej Bramy, start x88.5,y84.5; uzdrowiciel i kupiec w oryginalnych miejscach (ich użycie to uproszczona, eksperymentalna interakcja).
- Prawdziwa oryginalna grupa **„Szczury przy południowym trakcie”**, 5 jednostek w historycznych pozycjach, nie sztucznie rozmieszczone dla testu.
- Materialny **ruchomy wózek** (nowy element eksperymentu, nie pochodzący z Tibii). Ten sam stan blokuje fizyczny ruch, widzenie oraz ciosy. Można go popchnąć za energię, w ramach przechodniego podłoża. Położenie trafia do zapisu.
- Prosta walka wręcz, otrzymywanie obrażeń, monety po walce, opatrunek, kontakt z uzdrowicielem/kupcem. To placeholdery **ograniczające jakość gry**, nie kanoniczne klasy, ekonomia, AI i quest.
- Lokalny zapis zapamiętuje pozycję gracza, wózka i zachowanie potworów. Odmawia automatycznego wczytania zapisu z inną autorską mapą (niewielki odcisk stabilnego contentu z pominięciem timestampów eksportu).
- Rendering canvas rysuje odzyskaną geometrię i nazwy miejsc. 200×200, a w witness 5 pięter; **runtime B1 obsługuje wyłącznie powierzchnię**. Nie udawać, że piętra, quests i 45 grup mają już gameplay.

## Dowody i granice

- [Pierwsza pełna bramka Chromium + Node PASS](https://github.com/Jozzpoly/Coopege/actions/runs/39874464847). Samodzielny HTML 81,648 B w tym przebiegu. 5 testów mechanicznych plus rzeczywisty browser test.
- Realny browser z HTTP-origin: gracz natywnie przeszedł x88.5,y84.5 → x88.5,y98.75 klawiaturą; wózek y99.5 → y100.5 po naciśnięciu E; fizyczny odwrót do y96.31; kliknięcie Save/Load odtworzyło pozycję y98.75 i materialny wózek y100.5. Screenshoty i exact HTML w artefakcie workflow.
- Kontrolowane warianty symulacji: przesunięcie wózka w bok otwiera widzenie i przejście; ten sam wózek ogranicza trafienia. Osobna kontrola bada, czy potwór aktualizuje świadome postrzeganie.
- Jest test zachowania role NPC i niemigrowania z historycznymi skryptami; nie jest to natywne, ugruntowane społecznie życie.

**NIE UZNAWAĆ za PASS:** „B1 to lepsza gra od Tibii”, charakter przeciwników, rozbudowana progresja, pięć pięter grywalnych, dobre sterowanie na telefonie, multiplayer, architektura na lata, zdatność do finalnego Studio. Screenshoty są surowe i znacznie mniej dopracowane niż legacy Tibia. Testowana jest kontrhipoteza: *nowe wykonanie potrafi zachować znaczenie miejsca i zapewnić jedną własną materialną możliwość bez dziedziczenia starych metod*.

## Ryzyka, które mogą obalić kierunek

1. **Wysoka cena odtwarzania RPG.** Jeśli kolejny etap wymaga tygodni, by osiągnąć to, co stara Tibia już oferuje, nowy runtime przegrywa jako *product strategy*. Nie rekomendować automatycznej migracji.
2. **Wąska fizyka „E popchnij o kafel”** — to celowo prosty kontrakt. Nie dowodzi dobrego body contact, ciężaru, tarcia, nav czy satysfakcjonującego buildera; obecny push może być zbyt mechaniczny.
3. **AI lokalnych szczurów** jest prymitywne: po zauważeniu direct seek z podstawową kolizją, bez robust pathfindingu oraz społecznej pamięci. Nie nazywać tego living NPC.
4. **Hardcoded miejscowa ekonomia** kupca/uzdrowiciela i pojedynczy `player:1` nadal są kompromisami B1, nie architecture-approved future-coop.
5. **Wizualna ergonomia:** Canvas działa, ale autorskie tekstury i wizualny charakter gry nie zostały przeniesione; doświadczenie nadal odstaje od Tibii.

## Następna kampania B2 — value challenge, nie „clean engine”

Porównać **tę samą autorską sytuację** A1 vs B1 na realnej grywalności, nie liczbą testów:
- sensowny powód, by wyjść z miasta; stawka, czytelność zagrożenia, materialny wybór i odwrót;
- dwa osiągalne sposoby rozwiązania spotkania z konsekwencjami, w tym co najmniej jeden wynik z wykorzystaniem obiektu świata, nie tylko HP;
- po powrocie odzyskana możliwość użytecznego wykorzystania nagrody albo wiedzy w kolejnej wyprawie;
- NPC i rodzaj zagrożenia powinni wyrażać miejsce, a nie tylko pełnić role etykiet;
- reset, save/load, występujące błędy, wydajność i rzeczywisty Owner-playtest oddzielne od systemowego CI.

Przed pełniejszą rozbudową należy przeprowadzić krytyczny re-audyt wygody walki i porównania A1/B1. **Nie przyjmować B1 jako zwycięskiego fundamentu, jeśli przegrywa odczuwalnym doświadczeniem.**

## Repo / przekazanie

- B0 i odzyskane wartości: [PR #3](https://github.com/Jozzpoly/Coopege/pull/3).
- Stare wykonanie Coopege i regresje: [R0 PR #1](https://github.com/Jozzpoly/Coopege/pull/1).
- Bogatszy oryginalny runtime gry i hipoteza gardy: [A1 PR #2](https://github.com/Jozzpoly/Coopege/pull/2).

Ta gałąź bazuje na B0, **nie scalać automatycznie do main ani do A1**. B1 ma być doświadczalną kontrpróbą, nie nową organizacją całego ekosystemu. W głównym repo pozostają oryginały; stan gry jest odtwarzalny przez workflow. Mimo ciekawych rezultatów B1 potrzeba silniejszego grywalnego fragmentu zanim wybierzemy technologię.
