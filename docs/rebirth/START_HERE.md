# Coopege — nowy rozdział / R0

**22 października 2026 · aktywny kandydat badawczo-wykonawczy, bez publikacji.**

## Dlaczego istnieje ta gałąź

Owner chce stworzyć **jedną nową grę Coopege**, łącząc to, co najlepsze z dawnych prób Tibii Enhanced i Coopege, ale realizując pierwotne marzenie znacznie lepiej. Solo jest pierwszym zadaniem; multiplayer jest odkładany, lecz świadomie chronimy możliwość późniejszego dołączenia aktorów. Stary M8 LAN nie jest obowiązkiem ani roadmapą. Jaskinia oraz Feniks Studio są możliwymi donorami narzędzi, nie konkurującymi domami gry. Coopege nie jest mini-Feniksem.

Ta gałąź **nie** zatwierdza kontynuowania 79-kilobajtowego `GameWorld` i starego schematu jako trwałej bazy. Mierzymy koszt wywoływania rzeczywistych wartości gameplayowych w istniejącym kodzie przed decyzją o głębszej przebudowie.

## R0: co faktycznie zmieniono

1. **Przeciwnik po nieudanym pościgu wraca** normalnie przez kolizje do swojego authored miejsca, bez teleportowania, ukrytej regeneracji HP albo nowego skryptu zadania. W starym zachowaniu pozostawał 2.146 pola od domu po utracie celu.
2. **Przeszkoda ma sens dla trafień.** Kanoniczny `blocksProjectiles` jest używany do supercover przejścia promienia przez kafle; otwarta droga pozwala trafić, ściana zatrzymuje, narożnik również jest kontrolowany. Gameplay source/target nie jest kopią projekcji renderera.
3. **Odnawianie ataku nie jest przenikaniem w gracza.** Wróg, który osiągnął zasięg własnej umiejętności, utrzymuje pozycję przez cooldown.
4. **Ekran do grania zamiast dashboardu.** Standalone HTML oddaje powierzchnię grze, diagnostyka jest na żądanie (` lub przycisk) i samoczynnie otwiera się przy awarii. Ten sam HTML jest ładowany przez istniejący runtime; nie budujemy nowego launchera.
5. **Rozmiar gry pod rzeczywisty host.** Canvas otrzymuje wymiary od swojego okna, także przy zmianie rozmiaru hostowanego okna Jaskini bez resize całej strony.

## Reprodukcja i granice dowodów

| Pytanie | Dowód |
|---|---|
| Czy pościg kończy się powrotem? | [RED #39858070307](https://github.com/Jozzpoly/Coopege/actions/runs/39858070307), [PASS #39858419382](https://github.com/Jozzpoly/Coopege/actions/runs/39858419382) |
| Czy ściana i dystans walki mają znaczenie? | [RED #39858737552](https://github.com/Jozzpoly/Coopege/actions/runs/39858737552), [PASS #39859011659](https://github.com/Jozzpoly/Coopege/actions/runs/39859011659) |
| Czy nie zepsuliśmy starego `GameWorld`? | [Cały check oraz soak #39859290333](https://github.com/Jozzpoly/Coopege/actions/runs/39859290333): 27 000 solo + 27 000 coop ticków, save 6/6, build PASS |
| Czy nowy ekran naprawdę działa w browserze? | **ODDZIELNA bramka** `tools/test/rebirth-browser.mjs` z screenshotami, startowanymi wyłącznie w Chromium; wynik odczytać z najnowszego workflow. Pierwszy błąd dotyczył niedostępności DevTools runnera; po wymianie Chrome druga próba dotarła do panelu, lecz odczytała go przed animacją. Zmiany testu w kolejnych commitach nie są kwalifikacją bez finalnego PASS. |

RED zostają zachowane jako przyczyny i ostrzeżenia. Przejście testów dowodzi tylko konkretnego kontraktu. Nie mamy Owner PLAYTEST NOWEJ wersji ani gwarancji jakości zachowania przy dłuższym graniu i większej liczbie potworów.

## Kontynuacja — prowadzenie bez mikrosterowania Ownera

**Najpierw:** zamknij uczciwie browser gate, obejrzyj screenshot i przetestuj rzeczywistą pozycję, ruch, atak, zmianę piętra, zapis i odczyt. Jeżeli cięcie diagnostyki obniżyło legibility sterowania, napraw. Nie akceptuj tylko faktu renderowania canvasa. Nie interpretuj ciągłej zmiany HUD jako gameplayu.

**Następnie:** zbuduj lub przekształć **jedną powracającą sytuację przygodową**, nie liniowy zestaw obowiązków: bezpieczne miejsce → zagrożenie → wybór pozycji/broni/ryzyka → zysk lub odwrót → świat przy ponownej wizycie. Konkretna decyzja musi być wyczuwalna w grze, nie tylko zapisana w teście.

**Wątpliwości architektoniczne:** aktualny `GameWorld` skupia aktorów, spawny, combat i save w ~79 KB; trzeba odróżniać „łatwo dopisać kolejny wyjątek” od „łatwo rozwijać RPG”. Nie ratować M7, M8 ani 30 Hz z przywiązania. Nie deklarować zwycięstwa nowego rdzenia bez sprawdzenia, czy jego faktyczna gra jest lepsza. Multiplayer z doświadczeń Multi_World 2P i badania 1–6 przyjdzie po grywalnym solo. W tej gałęzi nie dodawaj hosta ani klienckiego prediction.

**Bramka wydania:** draft PR, bez merge do main i bez publikowania do Jaskini, dopóki nie ma przejrzystej kwalifikacji artefaktu i świadomości, że to wczesna iteracja gameplayu. Historyczny save i źródło nie powinny zostać nadpisane nowym eksperymentem.

## Źródła historyczne

- Pierwotne HTML i Studia w zachowanym `Tibia_Coopege_Pelen_Handoff_Zimny_Start_2026-10-22.zip` poza repo.
- [Stary soul](../product/COOPEGE_SOUL.md) i [historyczna roadmapa](../product/COOPEGE_ROADMAP.md) — ważne dla intencji i donorów, nie autorytet późniejszych celów.
- [Współczesny Multi_World](https://github.com/Jozzpoly/cloudflare-multiplayer-lab), [Jaskinia](https://github.com/Jozzpoly/Jozz-Cave-Workbench/pull/4), [Feniks Studio](https://github.com/Jozzpoly/Feniks-Studio/pull/2).


## R0 — realna wyprawa w przeglądarce (22 X, późny wieczór)

Nie poprzestano na testach silnika. Z gotowego standalone `dist/Coopege_v0.01.html`, pobranego jako dokładny artefakt GitHub Actions po pełnych testach, odtworzono realny scenariusz Playwright/Chromium bez teleportu i bez podmieniania zadań NPC:

- Stan startowy: Srebrna Brama, piętro `floor.legacy.z_0`, bohater (88.5,84.5), HP 120, 0 XP, 0 złota. Pierwszy szczur ma authored start (90.5,106.5); na powierzchni jest więcej spawnów.
- Fizyczny **marsz S na południe ~4,6 s** przez rzeczywisty input przesuwa bohatera na `y≈103`; po drodze otrzymuje obrażenia i widzi szczury.
- Dwa rozdzielone cooldownem naciśnięcia **F**: pierwszy atak zmniejsza HP szczura 25→10, drugi zabija. Zdobywa XP **30**, złoto **3**, kill **1**, `lootCount=1`. Zwykły odwrót **W** przez ok. 4,7 s wraca do okolic początku z zachowanym HP ~100 i nagrodą.
- Odrębny przebieg: po walce kliknięcie normalnego przycisku **Zapisz**, następnie fizyczne odejście o ponad 5 pól i kliknięcie **Wczytaj** przywróciło pozycję (`y=103.052129`), HP 110, XP 30, złoto 3, 1 zabicie i 1 `lootCount`, bez resetowania pojedynku na nową grę.
- Test przeglądarkowy wydania: [CI #39862630618](https://github.com/Jozzpoly/Coopege/actions/runs/39862630618) potwierdził 1.76 pola faktycznego ruchu przez natywne KeyD, `save/load`, pełny canvas 1440×872 i działanie przyrządów. Nowsze CI [#39863056669](https://github.com/Jozzpoly/Coopege/actions/runs/39863056669) przeszło także z in-world damage number popups.
- Po pierwszym kontakcie potwór widzi człowieka tylko w nieprzesłoniętym kierunku (nowa kontrpróba `COOPEGE_R0_WITNESS` RED→PASS); stare zdarzenia `threat` są nadal bardzo prostą pamięcią/pościgiem, mogą kierować potwora ku aktualnemu celowi bez bieżącego świadka. To **nadal dług AI/percepcji**, nie dowód inteligentnego tropienia.

**Ważne ograniczenia tego dowodu:**
- Skrypt jest autentyczną drogą sterowania i faktycznym silnikiem w Chromium, ale nie był swobodnym testem Ownera. Nie dowodzi naturalnego odkrycia celu, dobrego combatu ani satysfakcjonującej pętli RPG.
- Po zabiciu szczura `lootCount` wzrasta, lecz **nie pojawia się materialny przedmiot** ani sensowna nowa decyzja oparta na łupie. To licznik, nie ekwipunek. Również XP i złoto nie mają jeszcze dojrzałego gameplayowego zastosowania.
- Ogląd zrzutów: ekran desktopowy prawidłowo eksponuje świat, ale pierwsze ujęcie to monotonne duże płaszczyzny podłóg; potrzebne są kompozycja, lokalne czytelne zainteresowania i feedback ryzyka. Na telefonie canvas pasuje do 390×844, lecz postać jest bardzo mała i brak dotykowego ruchu/ataku: **mobile playability FAIL / not implemented**, nie znaczy „mobilna gra jest gotowa”.
- Na chwilę obecną uczciwy następny przyrost to: **rzeczywista, dająca sprawczość nagroda lub konsekwencja wyprawy**, albo poprawa samych decyzji podczas walki. Nie kolejny dashboard i nie przebudowa LAN. Dalszy materialny loot powinien mieć właściwe miejsce w stanie i zapisie, nie być wizualnym efektem bez pokrycia.

**Przykładowa powtarzalna sekwencja testowa:** w świeżym 1440×1000 standalone, 4,6 s trzymać S, dwukrotnie F z ~1,75 s przerwą; odwrócić W; w osobnym przebiegu zachować po walce stan przez Zapisz → ruszyć W → Wczytaj. Zależna od czasu ściennego i tego, kto zaatakuje; nie traktować konkretnych HP/ticków jako deterministycznego goldenu.
