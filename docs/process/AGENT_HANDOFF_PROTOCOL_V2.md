# COOPEGE — AGENT HANDOFF PROTOCOL v2

## Cel

Każde nowe wcielenie głównego współtwórcy najpierw weryfikuje odziedziczony fundament, a dopiero potem dodaje funkcje. Raport poprzednika jest hipotezą do sprawdzenia, nie automatycznym dowodem.

## Cztery statusy

1. `IMPLEMENTED` — autor zakończył implementację.
2. `TECH_VERIFIED` — czysta paczka przeszła pełne bramki techniczne.
3. `SUCCESSOR_REVIEWED` — następny agent wykonał niezależny review dziedziczenia.
4. `OWNER_ACCEPTED` — Przemek wykonał ręczny test i jawnie zaakceptował etap.

Agent kończący pracę nie może sam ustawić `SUCCESSOR_REVIEWED`. `OWNER_ACCEPTED` może zostać zapisane wyłącznie po jawnej decyzji Przemka. M7 ma `OWNER_ACCEPTED`, a niezależny następca zakończył L2 review wejścia do M8 wynikiem `PASS` 2026-06-14.

## Minimalny pakiet startowy

Przy każdej zmianie głównego agenta przeczytaj kolejno:

1. `START_HERE.md`
2. `PROJECT_STATE.json`
3. `AI_PROJECT_MEMORY.md`
4. `docs/process/CURRENT_MILESTONE.md`
5. `docs/process/LAST_HANDOFF.md`
6. najnowszy wpis `docs/process/PLAYTEST_LOG.md`
7. `docs/process/OWNER_FEEDBACK.md`
8. ADR-y wskazane przez milestone

Przy pierwszym przejęciu roli lub po zmianie tych plików przeczytaj także `COOPEGE_SOUL.md`, `AGENT_SOUL.md`, `PANTHEON.md` i roadmapę.

## Poziomy review

- **L0 Session Resume** — szybki baseline przy małej kontynuacji tej samej wersji.
- **L1 Inheritance Review** — obowiązkowy przy nowej rozmowie/modelu/głównym agencie.
- **L2 Milestone Acceptance Audit** — obowiązkowy przed rozpoczęciem dużego kolejnego milestone’u.

L1 sprawdza integralność, baseline, deltę poprzednika, prawdziwą ścieżkę użytkownika i minimum trzy kontrprzykłady. L2 dodaje czysty build, przenośność Windows, save/load, migracje, soak, gotowe HTML i skan prywatnych URL-i/ścieżek.

## Review before build

Nowy agent:

1. sprawdza SHA-256 paczki;
2. uruchamia `npm ci --ignore-scripts`;
3. uruchamia `npm run validate`;
4. porównuje wyniki z `PROJECT_STATE.json`;
5. przegląda pliki i kontrakty wskazane w `LAST_HANDOFF.md`;
6. wykonuje główny scenariusz normalnym UI, nie tylko debug API;
7. próbuje obalić co najmniej trzy twierdzenia poprzednika;
8. zapisuje wynik według `INHERITANCE_REVIEW_TEMPLATE.md`;
9. naprawia `BLOCKER` i `MUST_FIX_BEFORE_NEXT` przed nowymi funkcjami.

## Klasy znalezisk

- `BLOCKER` — build/dane/deterministyka/bezpieczeństwo/podstawowa ścieżka nie działa.
- `MUST_FIX_BEFORE_NEXT` — problem stanie się droższy po dołożeniu kolejnego milestone’u.
- `FIX_IN_CURRENT_MILESTONE` — ważna poprawka bieżącej stabilizacji.
- `BACKLOG` — nie podważa fundamentu.
- `IDEA` — hipoteza, nie zobowiązanie.

## Testy kontrujące

Dobierz minimum trzy do ryzyka ostatniej zmiany: czysty start, Windows i spacje w ścieżce, save/load w połowie akcji, P2 bez P1 lub bez gamepada, inne piętro, błędny asset, stable ID po migracji, długi czas działania, wielokrotne undo/redo, nieudany build zachowujący `dist`, prawdziwy UI zamiast debug API, stary save, nietypowa kolejność wejść, mały ekran/DPI, a dla LAN — rozłączenie i restart hosta.

## Koszt review

Domyślnie około 20% pracy na odbiór i 80% na naprawy/cel. Nie przepisuj zaakceptowanych systemów z powodu gustu. Pełny audyt całego repo wykonuj na granicy milestone’u.

## Dowód użytkowy

Twierdzenia „schody działają”, „P2 jest grywalny”, „build działa na Windows”, „import jest wygodny” i „LAN jest gotowy” wymagają normalnej ścieżki UI oraz ręcznej instrukcji. Debug API jest narzędziem diagnostycznym, nie jedynym dowodem ukończenia.

## Spójność dokumentacji

Agent przyjmujący feedback przez czat zapisuje trwałe informacje w `OWNER_FEEDBACK.md` i sam synchronizuje wszystkie bieżące dokumenty. `PROJECT_STATE.json` jest maszynowym źródłem statusu, ale nie zwalnia z aktualizacji `AI_PROJECT_MEMORY.md`, milestone, handoffu, roadmapy, raportów, testów i gotowego UI. Historyczne snapshoty pozostają historyczne i otrzymują datowaną adnotację o późniejszym zamknięciu.

Handoff jest nieważny, jeżeli bieżące dokumenty podają różne wersje, milestone, owner acceptance, blockerów lub baseline. Przed przekazaniem uruchom pełny gate spójności i manifestów.
