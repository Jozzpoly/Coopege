> **ARCHIWALNY SNAPSHOT.** Ten dokument zachowuje decyzję z chwili M7A, ale nie jest aktualnym źródłem statusu. M7 zostało później zaakceptowane przez Przemka 2026-06-13. Normatywne są `AI_PROJECT_MEMORY.md`, `docs/process/CURRENT_MILESTONE.md`, `docs/process/OWNER_FEEDBACK.md` i `docs/product/COOPEGE_ROADMAP.md`.

# COOPEGE — AKTUALIZACJA TRAJEKTORII I CIĄGŁOŚCI

- Data: **2026-06-13**
- Stan kodu w chwili snapshotu: **M7A / `coopege@0.7.1-m7a`**
- Ukończone milestone’y: **M0–M7A**
- Planowany wówczas kolejny milestone: **M8 — pierwszy coop LAN**

## Zatwierdzony kierunek

1. Coop na jednym ekranie pozostaje fundamentem C0, ale właściwa walidacja coopa wymaga dwóch urządzeń w jednej sieci.
2. Publiczny multiplayer, konta, matchmaking i serwer internetowy pozostają poza najbliższym zakresem.
3. Legacy runtime jest źródłem placeholderów, nie źródłem nowej architektury.
4. Custom assety, pamięć playtestów, decyzje i dusza projektu muszą przetrwać przyszłe migracje lub restarty kodu.
5. Główny współtwórca AI dziedziczy symboliczną ciągłość opisaną w `AGENT_SOUL.md`; Przemek/Jozz i główny agent pozostają Primordialami Panteonu projektu.

## Co domknięto w M7

- 338 authored spawn definitions rozwija się do 338 stabilnych, serializowalnych stanów runtime.
- Aktywny `MonsterActor` jest tylko materializacją kanonicznego stanu spawnu.
- Aktywacja jest drużynowa i używa najbliższego żywego gracza, bez uprzywilejowania P1.
- Hysteresis i deterministyczny cap 48 ograniczają liczbę aktywnych aktorów.
- Sen zachowuje HP, pozycję, threat, cooldown i respawn; respawn postępuje poza kamerą.
- Save v3 zapisuje cały lifecycle spawnów i migruje save v1/v2.
- Stan pozostaje niezależny od DOM, renderera i kamery, dzięki czemu może zostać kanonicznym stanem hosta M8.

## Gameplay Gate 0.1

Automatyczny soak wykonał po 15 symulowanych minut solo i w coopie C0, z przejściami pięter oraz cyklicznym save/load. Nie wykryto awarii lifecycle’u ani błędów wykonania gameplayu. Ręczny playtest właściciela **15 min solo + 15 min C0 pozostaje otwarty** i nie został zastąpiony automatem.

## Co domknięto w M7A

- niezależny Asset Pack v1 ZIP;
- 45 placeholderów jako zwykłe PNG;
- manifest z ID, kategorią, wymiarami, SHA-256, statusem i provenance;
- samodzielny `contact-sheet.html` i README;
- pojedynczy import PNG, batch PNG i import/eksport ZIP;
- cały batch jako jedna atomowa komenda undo/redo;
- walidacja safe paths, CRC-32, PNG, limitów, dimensions i SHA-256;
- zachowanie custom assetów w standalone HTML.

## Potwierdzony baseline M7A

- TypeScript strict: **PASS**
- Node: **70/70 PASS**
- legacy verifier: **PASS 4/4**
- golden migration: **PASS 51/51**
- Chromium: **PASS 9/9**
- Gameplay Gate 0.1 automated: **PASS_AUTOMATED**
- Asset Vault ZIP: **PASS integralności**

Szczegóły są w `docs/testing/M7_M7A_TEST_REPORT.md` oraz w manifeście artefaktów M7/M7A.

## Następny duży krok — M8

M8 ma dostarczyć pierwszy rzeczywisty vertical slice LAN:

- host uruchamia autorytatywny `GameWorld`;
- klient na drugim urządzeniu wysyła wyłącznie wersjonowane komendy wejścia;
- damage, loot, questy, save i spawn lifecycle rozstrzyga host;
- handshake porównuje wersje engine, projektu i protokołu;
- snapshoty niosą stabilne ID, tick i serializowalny stan;
- diagnostyka obejmuje RTT, input age, tick drift, snapshot rate i disconnect;
- uruchomienie lokalne ma być proste i nie wymagać kont ani publicznego internetu.

Normatywny zakres: `docs/process/NEXT_AGENT_BRIEF.md`.
