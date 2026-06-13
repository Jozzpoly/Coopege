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
- nie ustawiaj `SUCCESSOR_REVIEWED` ani `OWNER_ACCEPTED`.

## 8. Feedback

Każdą obserwację Przemka zapisz w `PLAYTEST_LOG.md` jako `BUG`, `UX`, `FEEL`, `BALANCE`, `CONTENT`, `ARCH` albo `IDEA`. Regresja dostaje test. Feel/balance wracają do ponownego playtestu. M8 nie omija otwartego owner gate M7.
