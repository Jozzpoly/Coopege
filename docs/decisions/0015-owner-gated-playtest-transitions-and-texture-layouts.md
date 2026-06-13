# ADR-0015 — owner-gated milestones, authored transitions i jawne layouty tekstur

- Status: accepted
- Data: 2026-06-13

## Kontekst

Pierwszy ręczny start M7 wykazał trzy luki, mimo zielonych testów technicznych:

1. renderer wycinał aktorów twardą klatką 32 px, choć legacy player sheets miały 192×224 i klatki 48×56;
2. schody były poprawnymi grafikami i walkowalnymi kaflami, ale nie miały kanonicznego znaczenia przejścia świata;
3. browser smoke potwierdzał niskopoziomowe `transitionParty()`, zamiast prawdziwego wejścia gracza na schody.

Dodatkowo techniczne `PASS` zostało komunikacyjnie zbyt blisko utożsamione z ukończeniem milestone’u, zanim właściciel zagrał.

## Decyzja

### 1. Trzy poziomy gotowości

- `TECH READY` — kod, dane, build i automatyczne testy są zielone;
- `PLAYTEST CANDIDATE` — kanoniczna paczka działa w ścieżkach użytkownika i jest gotowa dla właściciela;
- `OWNER ACCEPTED` — właściciel jawnie zaakceptował etap po realnym graniu.

Agent ani test automatyczny nie może sam nadać statusu `OWNER ACCEPTED`.

### 2. Authored world transitions

Przejście piętra jest elementem kanonicznego projektu, a nie warunkiem renderera ani debug API. Zawiera stabilne ID, źródło, cel, trigger i regułę drużyny. Runtime wykrywa realne wejście gracza, rozstrzyga konflikt deterministycznie i przenosi całą drużynę na unikalne walkowalne pola.

### 3. Jawne layouty tekstur

Animowane tekstury otrzymują metadane klatek, kierunków, tempa, pivotu i rozmiaru świata. Renderer i Studio korzystają z tych samych danych. Import Asset Vault odrzuca PNG niezgodny z layoutem.

### 4. Test produkcyjnej ścieżki

Kryterium użytkowe musi być testowane przez realny input i kod produkcyjny. Debug API może przygotować fixture lub diagnozować stan, ale nie może być jedynym dowodem, że dana czynność jest dostępna graczowi.

### 5. Gotowy build jako podstawowa ścieżka właściciela

Paczka playtestowa zawiera sprawdzony `dist`. `PLAY_COOPEGE.bat` nie instaluje zależności i nie przebudowuje kodu. Build developerski jest osobnym, jawnym poleceniem i nie może usuwać ostatniego działającego `dist` po błędzie.

## Konsekwencje

- schema projektu rozszerza assety o `TextureFrameLayout` i świat o transitions;
- migracja zachowuje odzyskane layouty oraz links legacy;
- testy obejmują prawdziwe zdarzenia klawiatury i wejście na schody;
- Studio co najmniej wizualizuje i waliduje transitions; pełny CRUD może powstać później;
- roadmapa pozostaje zablokowana na owner gate, nawet gdy M8 jest technicznie przygotowane jako następny cel;
- wydanie musi przejść portability gate i clean-package verification.
