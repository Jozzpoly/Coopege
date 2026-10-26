# Coopege — synchronizacja kontaktu zamachu (26.10.2026)

**Izolowany eksperyment, NIE zatwierdzony system walki.** [Samodzielna gra HTML](./Coopege_Kontakt_Zamachu_AB_2026-10-26.html), SHA-256 `9434b76ea967088e2ae98c4d6115f72e8bf4002b51bbcb39552353561417156e`, 379416 B; Git blob `fa31a2c884ec627f57e58507c6d859ca53133013`. Poprzedni [wariant B z natychmiastowym trafieniem](../combat-ab-2026-10-26/Coopege_Walka_Przestrzenna_AB_2026-10-26.html) pozostaje nietknięty.

**Zagraj:** lokalnie otwórz HTML w Chrome/Operze. `1` Wojownik, `WASD` ruch/kierunek, `Spacja` cios, `B` przełącza historyczny **A** i eksperymentalny **B**. A jest domyślny. W B miecz zamachuje się przed postacią: uderzenie można spudłować, ale **obrażenia nie są rozstrzygane od razu na Spacji**, tylko ~135 ms później — wewnątrz widocznej fazy zamachu. Zasięg, przeciwnik i przeszkoda są sprawdzane **na moment kontaktu**; kierunek ciosu jest zapamiętany przy rozpoczęciu. Brak blokady ruchu. Inne klasy nadal używają historycznej walki. `V` — większy widok świata, `C` ekwipunek, `E` interakcje, `F2` edycja.

**Dlaczego:** poprzedni tryb B miał sprzeczność przyczynową: wróg tracił HP, zanim animacja miecza doszła do niego. Zamiast dodawać kolejny rodzaj celowania, poprawiliśmy czas zdarzenia w istniejącym B. Rozdzielanie ciał pozostało celowo ograniczone. Przełączenie B→A w trakcie zamachu anuluje niedokończone trafienie, ale nie zwraca cooldownu; pauza nie przesuwa zegara ciosu. Tryb B używa oddzielnej przestrzeni zapisów `coopege_spatial_timing_2026_10_26_`, bez importu z poprzedniego wariantu.

## Dowody

- Rzeczywiste Chromium, **ten sam fixture potwora** w dawnym i nowym B: stary odbiera HP już przy `keydown` (200→181 w próbce), nowy 200 przy `keydown`, 200 po ~90 ms, 182 po ~150 ms. Nie są to stałe wartości balansu. W ZIP: `test_old_new.py`.
- Wersja nowa: testy wejścia i wyjścia wroga z zasięgu w trakcie ciosu, obrót po rozpoczęciu, pauza, anulowanie przy zmianie trybu i ściana postawiona podczas ciosu — PASS. [Minimalny repo-native test](./test_impact.py); rozszerzenie `test_timing.py` w ZIP.
- Realne szczury na historycznym południowym trakcie (nie stworzone przez fixture): 2 ręczne trafienia, 1 zabójstwo, HP wojownika 116→93; normalne WASD/Spacja w tym samym RPG. Długa trasa używa testowych szybkich kroków prawdziwego `update()`, **nie pełnego renderingu co klatkę ani Owner feel-testu**.
- Regresje PASS w badanym zakresie: 3 klasy i struktura 5 pięter, weryfikacja mapy; miękki kontakt i ściany; wóz/oba rodzaje pocisków; widok V i klikanie; F2/undo/skrzyń; ekwipunek, kupiec i zakup. Nie jest to pełne pokrycie gameplayu, wszystkich przejść pięter ani sesji kooperacyjnej.
- **Normal-origin localStorage i subiektywna jakość walki: NIEUDOWODNIONE.** Wariant B nadal używa czterech kierunków; jego soft collision jest przybliżeniem, nie pełną fizyką. Timing może poprawiać spójność, ale także wprowadzać odczuwalną zwłokę. Tego nie rozstrzygamy samymi testami.

## Odtwarzanie i granica pracy

[Adapter](./spatial-timing.js) + przypięty [donor widoku RPG](../adventure-view/Coopege_Przestrzen_Przygody_2026-10-25.html) + [builder](./build_from_repo.py) deterministycznie odtwarzają dokładny HTML. W rozmowie jest dodatkowo `COOPEGE_KONTAKT_ZAMACHU_AB_2026-10-26.zip` z pełniejszymi testami i obrazami (23 pliki, 1407745 B, SHA-256 `cf4eccf03c70503d3af6fb40d029d050af94f8900845b5b0ff6f2c244a760705`). Archiwum przeszło CRC, manifest SHA i cold rebuild; **nie oznacza to niezależnego backupu**.

Nie promować B do `main`, nie rozszerzać automatycznie na inne klasy ani nie wyprowadzać architektury z jednego prototypu. Następny kluczowy dowód ma pochodzić z realnego porównania odczucia A i B oraz decyzji, czy taka ręczna walka daje większą przyjemność niż historyczne celowanie. Studio i Jaskinia pozostają wspólną szerszą wizją, bez nagłego przełączania kampanii na integrację.
