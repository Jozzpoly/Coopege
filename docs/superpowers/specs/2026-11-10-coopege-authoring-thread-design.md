# Coopege Studio — ścieżka autorska od wskazanego obiektu (design)
**Data:** 10 listopada 2026. **Status:** pierwsza izolowana próba wariantu B wybranego przez Ownera, a nie finalna architektura.

## Cel
Odzyskać rozmach historycznego Tibia Developer Studio i poprawić jego ergonomię bez kopiowania starego UI. Coopege pozostaje samodzielną grą i właścicielem autorskich danych; Jaskinia w przyszłości będzie dostarczać możliwości aranżowania stanowiska. Październikowe F2 jest antyprzykładem.

## Dlaczego bazujemy na Coopege M7/M8
Studio ma już mapę Canvas, bibliotekę assetów, formularze potworów, walidowany ProjectStore, CommandBus undo/redo, preview i eksport gry. Brakuje prostego przechodzenia od obiektu wskazanego na mapie do jego znaczącej definicji, grafiki i lokalizacji. To rozwijamy jako pierwszy przekrojowy krok, bez przepisywania silnika i bez patchowania Jaskini.

## Podejścia rozważone
A — historyczne Studio reanimowane w iframe: rozległe możliwości, lecz sprzężenie i sztywny interfejs; zachowujemy jako benchmark.
B — domenowe, samodzielne Studio Coopege z przyszłym hostowaniem w Jaskini: WYBRANE przez Ownera; wdrażamy najpierw zdolność domenową.
C — Tiled/LDtk + bridge: ważna kontrpróba kosztowa dla przyszłej mapy, ale nie pokrywa z automatu pełnego RPG.

## Dokładna pierwsza sesja
1. Otwórz rzeczywistą Srebrną Bramę w Studio.
2. Wybierz narzędzie „Wskaż obiekt”; kliknij spawna na mapie. Zobacz jego położenie, identyfikator, potwora i liczebność. Przy wielu spawnach na polu pokaż każdą możliwość bez automatycznego pierwszeństwa.
3. Otwórz definicję wskazanego potwora w Content Browser. Zmień HP istniejącym walidowanym formularzem. Preview otrzymuje nowy snapshot projektu, a nie osobną kopię.
4. Otwórz jego asset w Asset Browser, bez ręcznego wyszukiwania ID.
5. Z definicji potwora wróć na mapę do wybranego spawnu, także na innym piętrze.
6. Undo/redo, zapis i eksport wciąż dotyczą jednego ProjectStore; nawigacja między narzędziami nie modyfikuje projektu.

## UX i granice
- Inspector musi być dostępny także przy ukrytej prawej kolumnie.
- Puste pole lub usunięty obiekt nie wywołuje zmiany projektu.
- Wielu kandydatów: jawna lista. Brak assetu/definicji: czytelna informacja i brak pozornego sukcesu.
- Edycja projektu i zmiana położenia/rozmiaru okna mają niezależne historie.
- Nie projektujemy teraz nowego hosta Jaskini, uniwersalnego selection-bus, migracji save, nowego formatu świata, edytora questów czy workflow LAN.
- Docelowo jeden elastyczny warsztat, ale ta próba odbywa się jeszcze na istniejącym, niedojrzałym UI Studia; nie wolno tego nazywać gotowym UX.

## Testy akceptacyjne
- Testy Node: wszystkie spawny w komórce, różne piętra, brak zmian źródła.
- Testy Chromium: wskazanie realnego spawnu, poprawny monsterId i assetId, powrót na mapę; nawigacja nie tworzy rewizji.
- Zmiana HP przez UI dociera do preview, także po undo; eksport i cold start zachowują zmianę.
- Wąskie okno, inny poziom, brak assetu i znikający spawn po undo/import to konieczne przypadki brzegowe.
- Dopiero Owner ocenia, czy gesty ułatwiają rzeczywiste tworzenie. Zielone testy nie oznaczają jego akceptacji.

## Zakres następnej kampanii
Po tej próbie projektujemy komponowanie instrumentów w jednej sesji, porównując standalone i host Jaskinia. Decyzje architektury hosta należą do niezależnej pracy Opusów i Astry.
