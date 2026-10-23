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

## Następny priorytet produktowy

Nie zaczynać reanimacji M8 LAN, wielkiej fizyki ani nowego dashboardu. Porównać przy tym samym authored miejscu A1 (bogatsze RPG z legacy) oraz B2 (swobodniejsza materialna interakcja). Szukać jednego powodu do drugiej wyprawy: świat reaguje, gracz ma sensowny wybór, a nagroda lub wiedza zmienia kolejne podejście. Jeśli B2 pozostaje tylko technicznie elegancką i ubogą w doświadczenie Tibią, trzeba wybrać inną drogę, nie bronić własnej implementacji.

**Repo:** parent B1 [PR #4](https://github.com/Jozzpoly/Coopege/pull/4), B0 [PR #3](https://github.com/Jozzpoly/Coopege/pull/3), RPG comparator A1 [PR #2](https://github.com/Jozzpoly/Coopege/pull/2).
