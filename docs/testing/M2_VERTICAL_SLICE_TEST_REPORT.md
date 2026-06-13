# Coopege M2 — raport grywalnego vertical slice

- Data: **2026-06-12**
- Workspace: **0.2.0-m2**
- Runtime: **Coopege_v0.01.html**
- Studio: **Coopege_Studio_v0.1.html**

## Zakres

M2 wprowadza pierwszy rzeczywisty gameplay nowego rdzenia:

- `EntityStore` i deterministyczny `EntityIdAllocator`;
- `GameWorld` bez globalnego singletonu gracza;
- `PlayerActor` i `MonsterActor`;
- `InputFrame` / `PlayerCommand`;
- adapter klawiatura + mysz;
- ruch fixed-step i kolizje z kaflami;
- prostą agresję i ruch potwora;
- jedną podstawową umiejętność obu stron;
- `DamageContext` z jawnym właścicielem;
- `EventBus` gameplayu;
- śmierć i deterministyczny respawn;
- `coopege-save` v1 z pamięciowym fallbackiem w sandboxie;
- replay oraz checksum stanu sesji;
- kamerę i renderer widocznego fragmentu zmigrowanej mapy.

## Wyniki automatyczne

- `npm run typecheck` — **PASS**;
- testy Node — **27/27 PASS**;
- golden fixture migracji — **51/51 PASS**;
- build samodzielnych HTML — **PASS**;
- Chromium minimal M2 runtime — **PASS**;
- Chromium pełna Srebrna Brama — **PASS**;
- Chromium Studio + grywalny preview M2 — **PASS**.

## Najważniejsze scenariusze

1. Identyczne seedy tworzą identyczne runtime ID i stan początkowy.
2. Gracz nie przechodzi przez niewalkowalne kafle.
3. Atak emituje `DamageContext` zawierający `sourceEntityId`, `ownerPlayerId`, `targetEntityId`, `abilityId`, `cause` i `tick`.
4. Save/load przywraca dokładnie ten sam checksum sesji.
5. Ten sam replay wykonany dwukrotnie daje identyczny checksum.
6. Symulacja przy 30 FPS, wysokim zmiennym FPS i nierównym FPS kończy się tym samym checksumem.
7. Runtime pełnego świata uruchamia gameplay na piętrze startowym bez dekodowania całej mapy do jednego globalnego singletonu.
8. Studio zachowuje sandbox bez `allow-same-origin`, atomowe odrzucenie błędnej zmiany i undo zsynchronizowane z preview.

## Ograniczenia M2

- aktywna jest tylko jedna sesja single-player i jedno piętro;
- runtime tworzy jednego przeciwnika treningowego na podstawie contentu projektu zamiast pełnego systemu wszystkich spawnów;
- obsługiwana jest jedna podstawowa umiejętność aktora;
- brak pocisków, lootu, XP, questów i przejść między piętrami;
- renderer używa czytelnych figur i kolorów; pełny pipeline renderowania atlasów zostaje dla M3;
- save v1 jest lokalny i nie zawiera jeszcze party, ekwipunku ani questów.

## Werdykt

Kryteria wyjścia M2 zostały spełnione. Projekt może przejść do M3 — parity najważniejszych workflow Studia — bez zmiany decyzji o fixed-step, stabilnej tożsamości i project-first.
