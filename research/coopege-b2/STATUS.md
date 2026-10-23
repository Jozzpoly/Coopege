# COOPEGE B2 — wiarygodność wejścia i percepcji (23 X 2026)

**Status:** odizolowana kontrpróba na bazie B1 / PR #4. Nie jest docelowym silnikiem ani decyzją o kierunku produktu. Nie scalać do `main` ani nie publikować w Jaskini.

## Dlaczego te poprawki muszą poprzedzić ocenę feelingu

1. **Gubienie przycisków przy wysokim odświeżaniu.** B1 czyścił `pending` w każdej klatce renderowania, niezależnie od tego, czy zaszedł tick symulacji 60 Hz. Krótkie naciśnięcie `E`, `Space` albo `R` mogło zniknąć w klatce bez kroku symulacji. B2 zatrzymuje akcje aż do pierwszego ticku, a następnie wykonuje je tylko raz. Nowy `input.test.mjs` odtwarza 7/7/7 ms i weryfikuje wykonanie dokładnie raz. Zmiana nie daje jeszcze pełnego modelu inputu dla gamepada ani powtarzania ataku podczas trzymania przycisku.

2. **Telepatyczny pościg.** B1 zapamiętywał alert na 2,7 s, ale w tym czasie bez widoczności kontynuował ruch ku bieżącej pozycji gracza. B2 przechowuje ostatnią widzianą pozycję; gdy gracz zniknie za osłoną, przeciwnik podąża tylko do tego punktu, a potem wraca do domu. Pole widzenia i aktualne przesłonięcie decydują również o próbie trafienia. Dane pamięci zapisują się w sesji. To nadal **prymitywna pamięć i direct seek** — nie nazywać tego living AI ani zaawansowanym tropieniem.

## Dowody i ich granice

- Wykonano kontrolowane uruchomienie aktualnego kodu `world.js` i `view.js` na sztucznym świecie / minimalnym DOM. **PASS (lokalne kontrakty):** 3 jednorazowe akcje przetrwały klatki bez ticku, zostały wykonane raz; osłonięty szczur nie poznał nowej pozycji; pamięć dotrwała do `save/restore`; sztucznie zasłonięty atak nie zranił.
- `world.test.mjs` zawiera odtąd testy z prawdziwym autorskim świadkiem z B0. `input.test.mjs` ma własny deterministyczny harmonogram ramek i nie używa hooków testowych w produkcyjnej grze.
- Workflow B1 na tej gałęzi obsługuje B2 i uruchamia pełny Node + Chromium browser gate. **Nie uznawać CI za PASS bez odczytania dokładnego SHA.** Historyczny PASS z 22 X dotyczył wcześniejszej rewizji B1.
- Brak Owner-playtestu B2. Jakość walki, responsywność w rzeczywistej przeglądarce 144 Hz, art direction, użyteczność ekonomii i wartość drugiej wyprawy są **NIEUDOWODNIONE**.

## Weryfikacja po porównaniu — 23 X, exact browser artifact

**PASS:** [GitHub Actions #40004631012](https://github.com/Jozzpoly/Coopege/actions/runs/40004631012), dokładny commit `6ed9c78b7737b96e82776c69ecbf4ec82864672c`. Workflow odtworzył autorskie świadectwo B0, wykonał pełne testy Node, zbudował HTML B2, przeszedł zwykłe sterowanie w Chromium i pobrał **SHA-pinned A1** (commit `c8bc9f1117e32f6db5940a565c905569e95692b9`) wyłącznie jako oddzielny comparator bez merge jego starego kodu.

**Wspólna fizyczna droga:** start x88.5/y84.5, 3.7 s naturalnego `S` w Chrome. A1 osiągnął y99.60 (piksele podzielone przez 32), B2 y98.31. **Nie jest to uczciwy benchmark szybkości ani feelingu.** Obydwa potwierdzają dotarcie ku południowej bramie. Dowód [same-place-observations.json w artefakcie CI](https://github.com/Jozzpoly/Coopege/actions/runs/40004631012).

**Ogląd obydwu rzeczywistych screenshotów:**
- A1 pokazuje autorską atmosferę drogi, podpis regionu, przeciwników widocznych przy trakcie, quest, minimapę, wieloelementowy HUD i wyraźną postać. UI jest ciężkie i zajmuje znaczną część ekranu.
- B2 lepiej oddaje powierzchnię widokowi, lecz ma bardzo surowe materiały, uproszczoną postać, brak czytelnej przygody/nagrody, i przy bramie gracz napotyka wózek przed samymi przeciwnikami. Ta materialna możliwość nie została jeszcze wykazana jako **atrakcyjny wybór** ani jako zmiana sensu drugiej wyprawy.
- A1 raportuje 110 przeciwników aktywnych na powierzchni; B2 pokazuje pięć szczurów wybranej grupy. Te liczniki mierzą **inny zakres** i nie mogą być porównane jako wskaźnik jakości AI czy zagęszczenia spotkania.

**Werdykt:** B2 pokazuje wybrane nowe systemowe możliwości, ale nadal **PRODUCT FAIL** wobec bogactwa doświadczenia A1. Zdecydowanym następnym celem jest sensowna sytuacja z konsekwencją i powrotem, nie dalsza infrastruktura. Docelowej architektury ani czystej ścieżki migracji nie wybrano. Pełne oceny minute-to-minute przez Ownera nadal brak.

## Następny priorytet produktowy

Nie zaczynać reanimacji M8 LAN, wielkiej fizyki ani nowego dashboardu. Porównać przy tym samym authored miejscu A1 (bogatsze RPG z legacy) oraz B2 (swobodniejsza materialna interakcja). Szukać jednego powodu do drugiej wyprawy: świat reaguje, gracz ma sensowny wybór, a nagroda lub wiedza zmienia kolejne podejście. Jeśli B2 pozostaje tylko technicznie elegancką i ubogą w doświadczenie Tibią, trzeba wybrać inną drogę, nie bronić własnej implementacji.

**Repo:** parent B1 [PR #4](https://github.com/Jozzpoly/Coopege/pull/4), B0 [PR #3](https://github.com/Jozzpoly/Coopege/pull/3), RPG comparator A1 [PR #2](https://github.com/Jozzpoly/Coopege/pull/2).
