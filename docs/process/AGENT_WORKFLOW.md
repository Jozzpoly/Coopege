# COOPEGE — AGENT WORKFLOW

Normatywny protokół odbioru projektu: `AGENT_HANDOFF_PROTOCOL_V2.md`. Ten dokument opisuje codzienną pętlę pracy.

## 1. Odbiór

- pracuj wyłącznie na najnowszej paczce przekazanej przez Przemka;
- sprawdź `PROJECT_STATE.json`, handoff i SHA-256;
- nowy główny agent wykonuje L1 review; na granicy milestone’u L2;
- nie ufaj samym nazwom plików ani deklarowanym wynikom;
- rozjazd dokumentacja ↔ kod ↔ test napraw przed implementacją.

## 2. Jeden rezultat użytkowy

Jedna sesja ma jeden główny wynik. Nie buduj kilku rozległych edytorów lub systemów jednocześnie. Najpierw cienki pionowy przekrój:

`schema → walidacja → runtime → coop → save/replay → Studio → standalone → normalny UI → test`

## 3. Audyt przed kodem

Zapisz:

- założenia i ryzyka;
- przypadki P1/P2, inne piętro, save/load, usunięte ID i długi czas działania;
- ścieżkę użytkownika, którą Przemek będzie mógł odtworzyć;
- rzeczy świadomie poza zakresem.

## 4. Implementacja

- zmiany atomowe i odwracalne;
- stable IDs oraz jawny ownership;
- stan kanoniczny poza rendererem/DOM;
- brak ukrytych globali i arbitrary JS w danych;
- żadnej zmiany formatu bez migracji;
- build nie może niszczyć ostatniego działającego `dist`.

## 5. Dowody

Każdy system otrzymuje odpowiednio:

- unit/regression test;
- deterministyczny replay/checksum;
- P2/ownership test;
- save/load;
- Chromium dla prawdziwego builda;
- normalną ścieżkę UI zamiast wyłącznie debug API;
- scenariusz ręczny dla właściciela.

## 6. Krytyczny self-review

Przed wydaniem spróbuj obalić własne twierdzenia. Sprawdź czysty katalog, Windows/spacje, brak cache, błędne dane, wielokrotne kliknięcia, szybkie wejścia, awarię builda, godzinę symulacji oraz zachowanie po save/load. Zapisz nieweryfikowane obszary w `LAST_HANDOFF.md`.

## 7. Wydanie

- `npm ci --ignore-scripts` w czystej kopii;
- `npm run validate`;
- gotowy runtime, Studio i asset pack;
- jedna kanoniczna paczka bez `node_modules` i `.build`;
- zewnętrzny `.zip.sha256`;
- raport, manifest artefaktów i uczciwe ograniczenia;
- agent wydający własny etap nie ustawia `SUCCESSOR_REVIEWED`; niezależny następca może to zrobić dopiero po zapisanym review. `OWNER_ACCEPTED` ustawiaj wyłącznie po jawnej decyzji Przemka.

## 8. Feedback

Czat jest podstawowym kanałem feedbacku Przemka. Trwałe decyzje, dłuższe uwagi, starsze błędy i świadomie odłożone długi zapisuj w `OWNER_FEEDBACK.md`; przebieg faktycznych sesji pozostaje w `PLAYTEST_LOG.md`. Regresja dostaje test, a feel/balance wracają do ponownego playtestu.

## 9. Spójność dokumentacji

Agent odpowiada za spójność wszystkich bieżących dokumentów. Po zmianie wersji, milestone, owner acceptance, blockerów, baseline'u lub priorytetów zaktualizuj co najmniej `PROJECT_STATE.json`, `AI_PROJECT_MEMORY.md`, `CURRENT_MILESTONE.md`, `LAST_HANDOFF.md`, roadmapę, `OWNER_FEEDBACK.md`, właściwy raport i gotowy interfejs. Następnie przebuduj `dist`, odtwórz manifesty i uruchom pełny gate.

Raporty historyczne zachowują dawny stan, ale muszą mieć czytelną datowaną adnotację, jeśli późniejsza decyzja zmienia sposób ich interpretacji. Rozjazd dokumentacja ↔ kod ↔ test ↔ artefakt jest błędem wydania i należy go naprawić przed zakończeniem zadania.
