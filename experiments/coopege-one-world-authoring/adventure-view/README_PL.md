# Coopege — widok przygody (25 października 2026)

**Status: izolowany, odwracalny eksperyment prezentacji RPG; nie nowy silnik i nie Owner-accepted gameplay.** Gotowa gra: [Coopege_Przestrzen_Przygody_2026-10-25.html](./Coopege_Przestrzen_Przygody_2026-10-25.html). SHA-256 `e137aa884f1c896012b71d12c844a8273e63964c512256824f93a08bb6891db5` (373111 B), Git blob `cbb75a4c354bcba2874a84a7f5c990858dc1b2ec`. Poprzednia [Materialna Wyprawa](../material-choice/Coopege_Wyprawa_Woz_2026-10-25.html) pozostaje nienaruszona.

## Zagraj
Otwórz HTML lokalnie w Chrome/Operze; wybierz klasę klawiszem 1/2/3. **V** przełącza między historycznym pełnym HUD-em a widokiem przygody. Widok przygody oddaje światu 110 dodatkowych jednostek wysokości na tym samym ekranie (480 → 590, +22,9%); zachowuje zdrowie, manę, EXP, poziom, prosty stan zadania, kontekstowe napisy obiektów i możliwość powrotu jednym V. **WASD**, **Spacja**, **E**, **C**, **M**, **F2** zachowują swoje funkcje. Domyślny jest stary pełny HUD; prezentacja V nie jest utrwalana jako decyzja o stanie świata.

## Testy, z właściwymi granicami
- Naturalne przełączenie V i realny renderer Chromium: 480→590→480; gracz nadal się porusza, zero pageerrors. Zdjęcia A/B w paczce.
- Naturalne dojście do posterunku na tej samej mapie: skrzynia, drogowskaz i prompt wozu są rysowane także w nowym widoku. Wóz porusza się po E; edytor F2 otwiera i zamyka się, nie zmieniając wybranego trybu.
- Tryb V zachowuje serializowany stan postaci i świata. Przy porównaniu surowych zapisów zmienia się **wyłącznie znacznik czasu wykonania zapisu**; reszta jest identyczna. V nie przenika do włączonego edytora.
- Ponownie PASS z nowym HTML: start łucznika/maga i 338 starych potworów; obydwa typy pocisków kolidują z wozem; edycja muru F2 blokuje skrzynię, cofnięcie odblokowuje; pchanie i wewnętrzny pack/restore wozu.
- Oddzielnie PASS: **pełna pętla RPG przy włączonym V** — klawiatura, otwarcie skrzyni, założenie zdobytej zbroi przez klik, powrót do istniejącego kupca, otwarcie sklepu E i rzeczywiste kliknięcie KUP. Długie marsze testu wykonują prawdziwy `update()` przez szybkie kroki bez renderowania każdej klatki. Dlatego to dowód mechaniki UI/świata, **nie** prawdziwy feel-test.
- Skompletowana w rozmowie paczka `COOPEGE_WIDOK_PRZYGODY_2026-10-25.zip`, 17 plików, 2068334 B, SHA-256 `7e4cd22ee4a189243cea725f3521040a909c8e291723dd344e70330965de1ca1`. Zawiera poprzedni HTML jako źródło, `build_adventure.py`, testy, obrazy i sumy kontrolne. ZIP CRC, sumy wszystkich elementów oraz niezależne ponowne zbudowanie exact HTML: PASS. ZIP jest załącznikiem w rozmowie, nie niezależnym backupem i nie został dodany do repo.

## Nieuzasadnione awanse
To jest zwiększenie przestrzeni świata, **nie** potwierdzona poprawa zabawy, walki, contentu, dynamiki wozu ani kompletne Studio. W tej lokacji szczury walczą wręcz, więc choć wóz może zatrzymać pociski, nie jest jeszcze dobrym wyborem taktycznym. Nie przechodziły pełne testy 5 pięter, normal-origin localStorage ani Owner gamefeel. Nie rozbudowywać starego monolitu o serię podobnych dodatków; następnym etapem ma być świadome porównanie przyjemności sterowania, walki, odkrywania i źródeł bogactwa RPG. Jaskinia/Tibia Studio to wspólna daleka wizja tworzenia, nie natychmiastowa integracja.
