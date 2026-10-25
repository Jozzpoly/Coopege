# Coopege — Wyprawa do Starego Posterunku (25.10.2026)

**Status:** grywalny eksperyment, NIE nowy kanoniczny silnik ani Owner-approved gameplay. [Pobierz samodzielny HTML](./Coopege_Expedition_Outpost.html). Jest to rozwinięcie istniejącego [One World Studio Trial](../Coopege_One_World_Studio_Trial.html), a nie odrębny świat lub iframe. Żadnych zmian w `main`.

**Źródło gry:** 366047 B, SHA-256 `3440559a4160c362505209291c2a75698f1c77285b6992b42026b1ff77040be6`, Git blob `ce4b6f70d904755a1cc33e9d4a1dc94998308319`. Bazowy Studio Trial 361206 B, SHA-256 `6b1487182105e1ec973dbd20de56912c405eb9413abd3266954c0f3543a7ba6d`. Nie podmieniono historycznego donora.

## Zagraj
Otwórz pobrany HTML w Chrome/Operze. Klasy `1/2/3`, ruch `WASD`, walka `Spacja`, interakcja `E`. Wyjdź południową bramą Srebrnej Bramy; przy drogowskazie **STRAŻ** zejdź na wschód z traktu, znajdź ruinę. Skrzynia daje jednorazowo 18g, 1 miksturę HP i skórzaną zbroję do prawdziwego plecaka. Szczury są rzeczywistymi potworami świata, nie fałszywym warunkiem questowym. Możesz zignorować posterunek, walczyć lub unikać potworów, wrócić z łupem do istniejącego kupca i kupić przedmiot. Tragarz i edytor świata F2 z poprzedniej wersji nadal działają.

## Potwierdzone, z granicami
- Naturalny keyboard + Chromium z rysowaniem: dojście do posterunku, obrażenia, realne zabójstwa, łup, jeden odbiór; trzy klasy startują, odzyskane oryginalne 338 spawnów są w mapie.
- Dłuższa trasa powrotna: prawdziwe zdarzenia keyboard/pointer i **ten sam** runtime `update()`, ale szybkie kroki bez rysowania każdej klatki; dojście do kupca, `E`, realny **klik przycisku KUP**, zmiana złota i liczby mikstur. NIE jest to full framerate feel-test.
- Po F2 i namalowaniu muru na polu skrzyni, `E` nie przyznaje łupu; `Ctrl+Z` cofa mur i umożliwia interakcję. Pokazuje jedną spójną prawdę terenu dla gracza i obiektu.
- Stan `opened` przechodzi przez `K/L` i fresh-realm save/restore w **symulowanym localStorage**. Nie ma testu trwałości na prawdziwym originie. Nowe klucze zapisów eksperymentu są oddzielone od starych Tibii i wcześniejszego triala.
- ZIP z niezależnym generatorem, oryginalnym bazowym HTML, `outpost.js`, testami, zrzutami, MANIFEST.sha256: `COOPEGE_RPG_WYPRAWA_2026-10-25.zip`; 1,435,030 B, SHA-256 `e59e43ad7800d4b7fc41333a4c3fc54d4019a03f75fe590ab79dc6c8f59eb6ed`. Archive CRC + all SHA-256 and **cold unpack + identical re-build** PASS. ZIP jest załącznikiem w rozmowie, NIE plikiem GitHub.

## Ograniczenia / decyzja
To zasadniczo stary silnik Tibii, małe ręcznie osadzone miejsce i prosty gwarantowany łup, NIE zrealizowane nowe Coopege. Brak nowego feelu walki, szerokiej fabuły, jakości nowego art direction, realnego Studio, real-origin browser persistence, pełnych regresji wysokości i Owner play verdict. `3 klasy / 5 floor IDs` = **świadek zachowania donora, nie projektowe przykazanie**. Nie namnażaj podobnych skrzyń; podejmij następny krok dopiero po krytyce istoty rozgrywki i kosztów starego monolitu. Tibia Studio + Jaskinia = jedna szeroka intencja twórcza, nie nakaz pośpiesznej integracji. W Jaskini `Ruch` dostał negatywny Owner verdict i nie wolno uznać go za zweryfikowany wzorzec.

### Reproducible checks
W paczce: `build.py`, `test_expedition.py`, `test_fast_flow.py`, `test_authoring_consistency.py`, `test_choices.py`; browser tests wymagają lokalnego Chromium i Playwright. Opisy sposobu testowania w README paczki. Po kilku próbach wcześniejsze wspólne wielostopniowe testy potrafiły przekraczać limit bez GPU; nie należy tego raportować jako usterki gry. Testy nie kwalifikują całości gry ani jej jakości.
