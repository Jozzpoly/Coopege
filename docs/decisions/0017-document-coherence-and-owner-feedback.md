# ADR-0017 - spójność dokumentacji i intake feedbacku właściciela

- Status: accepted
- Data: 2026-06-13

## Kontekst

Feedback właściciela powstaje głównie w rozmowie z agentem. Projekt ma wiele dokumentów statusowych, raportów, manifestów i instrukcji. Aktualizacja tylko jednego z nich prowadzi do sprzecznych milestone'ów, wersji i bramek.

## Decyzja

1. Czat jest podstawowym kanałem feedbacku właściciela.
2. `docs/process/OWNER_FEEDBACK.md` jest jedynym trwałym rejestrem dłuższych uwag, odłożonych błędów i decyzji właściciela.
3. Agent, który otrzymuje feedback, odpowiada za jego zapis i propagację do wszystkich bieżących źródeł prawdy.
4. Bieżące dokumenty muszą zgadzać się co najmniej w zakresie wersji, aktywnego milestone, owner acceptance, blockerów i baseline'u.
5. Raporty historyczne zachowują stan z chwili powstania. Jeżeli etap został później zamknięty, otrzymują datowaną adnotację zamiast przepisywania historii.
6. Zmiana statusu milestone wymaga aktualizacji gotowego UI oraz ponownego builda, testów i manifestów.
7. Właściciel nie ma obowiązku ręcznie kopiować feedbacku między plikami.

## Egzekwowanie

`verify:handoff` sprawdza obecność rejestru feedbacku oraz zgodność bieżących dokumentów z `PROJECT_STATE.json`. `verify:release-manifests` sprawdza aktualność manifestów po końcowym buildzie.
