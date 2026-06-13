# Coopege M7 Final Playtest Candidate — raport krytycznej rewizji

> **HISTORYCZNY RAPORT KANDYDATA.** M7 zostało później zaakceptowane przez Przemka jako `OWNER_ACCEPTED_WITH_DEBT` 2026-06-13. Aktualny status znajduje się w `PROJECT_STATE.json`; odłożony dług respawnu C0 w `docs/process/OWNER_FEEDBACK.md`.

- Data: **2026-06-13**
- Wersja: **0.7.2-m7-final-candidate**
- Status: **PLAYTEST CANDIDATE / NOT OWNER ACCEPTED**
- M8 LAN: **NIE ROZPOCZĘTE / ZABLOKOWANE DO OWNER GATE**

## 1. Dlaczego wykonano rewizję

Pierwszy rzeczywisty start właściciela potwierdził, że projekt uruchamia się i pozwala chodzić oraz walczyć, ale wykrył luki pominięte przez wcześniejsze zielone testy:

- sprite postaci był wycinany jak atlas 32 px, choć player sheet miał klatki 48×56;
- schody istniały wizualnie, ale nie miały kanonicznego gameplayowego przejścia;
- P2 był testowalny technicznie, lecz dla właściciela wymagał gamepada;
- dystrybucja przechowywała wewnętrzny registry, a build zawierał założenia środowiska Linux/OpenAI;
- smoke test przejścia używał debug API zamiast prawdziwej ścieżki gracza.

Celem tej rewizji było zamknięcie M7 jako świadomego kandydata do ręcznej akceptacji, a nie dodawanie kolejnych szerokich feature’ów.

## 2. Najważniejsze zmiany użytkowe

### 2.1 Stabilny sprite i jawne atlasy

- Usunięto twarde założenie klatki `32px` dla aktorów.
- Dodano `TextureFrameLayout`: frameWidth/frameHeight, direction rows, idle/walk frames, timing, pivot i world size.
- Legacy player sheet 192×224 jest interpretowany jako 4×4 klatki 48×56 zgodnie z oryginalnym `DIR_ORDER=['s','w','e','n']`.
- Draw rect jest liczony względem stałego world anchor/pivot, więc zmiana klatki nie przesuwa postaci.
- Renderer sortuje aktorów po Y i kotwiczy HP/nameplate do stabilnej bryły wizualnej.
- Studio wycina authored frame zamiast losowego fragmentu top-left 32×32.

### 2.2 Prawdziwe schody i przejścia świata

- 12 legacy links jest migrowanych do 24 dwukierunkowych `WorldTransitionDefinition`.
- Transition ma stable ID, source, destination, trigger `enter` i party rule `all`.
- `GameWorld` wykrywa realną zmianę komórki gracza na źródło transition.
- P1 i P2 mają takie samo prawo wywołania przejścia.
- Jednoczesne wejście na różne schody ma deterministyczny tie-break po transition ID i event diagnostyczny.
- Cała drużyna trafia na unikalne, walkowalne pola obok celu, nie na reverse stair — brak natychmiastowego odbicia.
- Aktorzy spawnów starego piętra są dematerializowani, a lifecycle jest przeliczany dla nowego piętra.
- P2 dołączający po przejściu pojawia się przy aktualnej drużynie, nie przy starcie pierwszego piętra.

### 2.3 P2 bez gamepada

- Strzałki automatycznie dołączają P2 jako `keyboard`.
- Prawy Ctrl/Numpad0 wykonuje jednorazowy atak w ostatnim kierunku ruchu.
- P1 używa WASD, więc strzałki nie sterują już równocześnie P1.
- Przycisk HUD dołącza P2 jako keyboard; gamepad dołącza się własnym inputem.
- Slot respektuje zapisany device kind i device index.
- Samo pojawienie się pada nie przełącza P2 keyboard.
- Obsługiwany jest pierwszy faktycznie podłączony pad, również gdy index 0 jest pusty.

### 2.4 Save/load i odporność na uszkodzenie

Loader save v3 waliduje przed mutacją świata:

- format, wersję, checksum projektu, tick, RNG, entity sequence i active floor;
- pełne 338 spawn states oraz ich kanoniczną tożsamość;
- status/HP/respawn/threat/target/active actor consistency;
- duplikaty entityId/playerId/slotId;
- klasy, abilities, statystyki i walkowalne pozycje graczy;
- sloty, joined state, device kind/index;
- zgodność aktywnych monster actors z kanonicznym stanem spawnów.

Cały nowy stan jest przygotowywany w strukturach tymczasowych. Odrzucony save nie narusza bieżącej sesji. Runtime pokazuje czytelny komunikat zamiast cicho mylić uszkodzony zapis z brakiem zapisu.

### 2.5 Studio i Asset Vault

- Mapa pokazuje transitions jako znaczniki z celem i liczbą w diagnostyce.
- Schema i validator odrzucają duplikat source cell, nieznane piętra, zły trigger/rule, niewalkowalne źródło/cel i self-loop.
- Asset Pack manifest zachowuje layout tekstury.
- Import PNG/ZIP odrzuca atlas niezgodny z frame geometry.
- Test fizycznie otwiera wszystkie 45 źródłowych PNG i porównuje wymiary z authored layoutem.
- Pełny transition CRUD editor pozostaje jawnym długiem, ale runtime data nie jest już ukryta w rendererze.

### 2.6 Dystrybucja i Windows

- Publiczny `registry.npmjs.org` w `.npmrc` i lockfile.
- Build używa lokalnego TypeScript przez Node, relative POSIX globs i staging `dist`.
- Nieudany build nie usuwa ostatniego działającego wydania.
- `PLAY_COOPEGE.bat` oraz `START_STUDIO.bat` uruchamiają gotowy `dist` bez npm/install/build.
- `REBUILD_AND_PLAY.bat` jest oddzielną ścieżką developerską.
- Batch files są ASCII + CRLF dla starego Windows cmd/PowerShell.
- `npm run verify:portability` skanuje prywatne hosty, adresy, absolutne ścieżki, launchery, lockfile, artefakty i status owner acceptance.
- `COLLECT_DIAGNOSTICS.bat` generuje jeden plik diagnostyczny bez kluczy API.

## 3. Zmiana procesu

ADR-0015 formalizuje trzy osobne poziomy:

1. `TECH READY` — testy i build są zielone;
2. `PLAYTEST CANDIDATE` — gotowa paczka przechodzi prawdziwe ścieżki użytkownika;
3. `OWNER ACCEPTED` — Przemek jawnie zaakceptował milestone po realnym graniu.

M8 nie jest aktywnym milestone’em. Jest następnym celem dopiero po owner gate.

Dokumentacja została uproszczona:

- `AI_PROJECT_MEMORY.md` — aktualna pamięć techniczna;
- `CURRENT_MILESTONE.md` — jedyny aktywny brief;
- `NEXT_AGENT_BRIEF.md` — tylko kompatybilny wskaźnik;
- `PLAYTEST_LOG.md` — doświadczenie człowieka;
- ADR-y — trwałe decyzje;
- stare raporty — historyczne dowody, nie aktualny status.

## 4. Testy i dowody

### Główna bramka

- Pełne `npm run release:verify`: **exit code 0**
- TypeScript strict: **PASS**
- Node: **87/87 PASS**
- Golden migration: **52/52 PASS**
- Legacy integrity: **4/4 PASS**
- Chromium główne scenariusze: **9/9 PASS**
- Ability Composer browser smoke: **PASS**
- Asset Vault: **45/45 PNG layout PASS**
- Portability: **21 PASS / 0 WARN / 0 FAIL**
- Dev server: health/runtime/Studio **HTTP 200**

### Prawdziwa ścieżka browser smoke

Scenariusz `m7-real-controls-stairs`:

- wysyła natywny `ArrowRight` i potwierdza P2 keyboard auto-join;
- przygotowuje pozycję fixture przez save/load, ale nie wywołuje debugowego transition;
- wysyła natywny `KeyD`;
- potwierdza realne wejście P1 na source cell;
- potwierdza transition ID, nowe piętro, dwóch graczy i osobne pola drużyny.

### Automated Gameplay Gate 0.1

- solo: **27 000 ticków**;
- coop C0: **27 000 ticków**;
- maks. aktywnych potworów: **14 / 15**;
- nagrody: **51 / 74**;
- save/load: **6/6 na tryb**;
- wynik: **PASS_AUTOMATED**.

### Clean-package gate

W nowym katalogu, bez `node_modules`, `.build` i `dist` z katalogu roboczego:

- `npm ci --ignore-scripts`: PASS;
- build od zera: PASS;
- doctor: 17 PASS / 1 środowiskowy WARN / 0 FAIL;
- Node 87/87 + migration 52/52: PASS;
- portability: 21/21 PASS;
- legacy integrity 4/4: PASS.

Środowiskowy WARN dotyczy odmowy odczytu efektywnego registry przez sandbox; projektowy `.npmrc` i wszystkie resolved URLs są publiczne.

## 5. Przypadki brzegowe objęte rewizją

- P2 uruchamia schody bez P1;
- P1 i P2 wchodzą w tym samym ticku na różne transitions;
- wszystkie 24 transitions są osiągalne z sąsiedniego walkowalnego pola;
- save/load po transition daje identyczną przyszłość;
- P2 dołącza dopiero na niższym piętrze;
- uszkodzony save ma pozycję poza mapą;
- duplikat entity ID;
- sprzeczny active monster vs spawn state;
- nieznany target/threat player;
- atlas 1×1 próbuje zastąpić player sheet;
- ZIP deflate zawiera wpis katalogu;
- gamepad istnieje dopiero pod index 2;
- zapisany device index jest rozłączony;
- launch z gotowego `dist` bez npm/build;
- prywatny registry/ścieżka środowiska próbuje wejść do wydania;
- nieudany build zachowuje działające wydanie.

## 6. Uczciwe ograniczenia kandydata

- To wczesny demonstracyjny runtime, nie pełna poważna gra RPG.
- Basic directional idle/walk działa, ale osobne kompletne attack/death clips nie są jeszcze zauthorowane.
- Transitions są walidowane i widoczne, lecz pełny editor CRUD nie istnieje.
- Gameplay content, balans, feel, progresja, loot/equipment, questy/dialogi, talenty i AI authoring są niepełne.
- P2 keyboard jest testowym C0; niektóre klawiatury mogą mieć ograniczony key rollover.
- Browser smoke nie ocenia subiektywnej czytelności animacji, przyjemności walki ani jakości mapy.
- Automated soak używa bota i nie jest dowodem funu.
- LAN transport, host/client, snapshot interpolation, reconnect i network diagnostics nie istnieją jeszcze.

## 7. Otwarte kryterium właściciela

Kandydat ma zostać przetestowany według `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`.

M7 można oznaczyć jako `OWNER ACCEPTED` dopiero po jawnej decyzji Przemka:

- `ACCEPT M7`;
- `ACCEPT WITH DEBT` z zapisaną listą długu;
- albo `REJECT / FIX M7`.

Do tego momentu żaden dokument, build ani agent nie może ogłosić wejścia w M8.
