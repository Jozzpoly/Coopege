# ADR-0008 — Runtime entity IDs, InputFrame, replay i save snapshot

- Status: **zaakceptowany**
- Data: **2026-06-12**
- Kamień milowy: **M2**

## Kontekst

Definicje projektu (`class.*`, `monster.*`, `spawn.*`) nie mogą pełnić roli tożsamości instancji runtime. Ta sama definicja może utworzyć wiele aktorów, zostać użyta przez kilku graczy albo odrodzić się w ramach tej samej sesji. Przyszły lokalny coop wymaga również jawnego właściciela obrażeń i wejścia przypisanego do slotu gracza.

## Decyzja

1. Instancje runtime otrzymują deterministyczne, sesyjne ID w formacie:
   - `entity.player.000001`;
   - `entity.monster.000002`;
   - analogicznie dla przyszłych pocisków i przedmiotów.
2. Alokator jest częścią snapshotu zapisu i replayu, dzięki czemu po wczytaniu nie tworzy kolizji.
3. `playerId` jest niezależne od `entityId` oraz `classId`.
4. Wejście gameplayowe jest serializowane jako `InputFrame` przypisany do konkretnego ticka i `playerId`.
5. Fizyczne urządzenia wejścia nie są czytane przez aktorów; adapter przeglądarkowy tworzy `InputFrame`.
6. Save-game ma osobny format `coopege-save` v1 i zawiera:
   - checksum projektu;
   - tick;
   - aktywne piętro;
   - stany RNG;
   - stan alokatora ID;
   - instancje aktorów.
7. Authoring project nie przechowuje runtime HP, pozycji aktorów ani cooldownów.

## Konsekwencje

- replay jest deterministyczny przy tym samym projekcie, seedach i kolejności `InputFrame`;
- liczba FPS renderowania nie wpływa na wynik fixed-step;
- obrażenia i przyszłe nagrody mogą wskazywać jawne `sourceEntityId` i `ownerPlayerId`;
- wczytanie zapisu z innym checksumem projektu jest odrzucane;
- późniejsza zmiana formatu ID lub zapisu wymaga nowej wersji i migracji.
