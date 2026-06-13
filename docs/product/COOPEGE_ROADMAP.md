# COOPEGE ROADMAP

Roadmapa porządkuje hipotezę rozwoju. Realny gameplay feedback może zmienić priorytety. W każdym etapie najpierw pionowa grywalność i stabilność, potem szerokość funkcji.

## Ukończone technicznie

### M0–M1 — restart, project-first i migracja

- modułowy TypeScript, generowane standalone HTML;
- ochrona legacy i deterministyczna migracja;
- wspólny schema/validator, ProjectStore, CommandBus i Runtime–Studio bridge.

### M2 — pierwszy grywalny vertical slice

- GameWorld, fixed tick, aktorzy, wejście, ruch, kolizje, walka, save/replay.

### M3 — authoring parity

- wspólne assety, Asset Browser, mapa, content, checkpointy i standalone export.

### M4 — lokalny coop C0

- dwa sloty graczy, wspólna kamera/tether;
- jawne ownership, threat, nagrody i save v2.

### M5 — bezpieczny gameplay language

- sześć domen grafów, walidowane rejestry prymitywów i atomowe wykonanie.

### M6 — Ability Composer

- grafowy composer, wspólne metadata runtime/Studio, trace i planowanie dla P1/P2.

### M7 — authored spawns i runtime world parity

- 338 kanonicznych spawn states;
- party-aware lazy activation, hysteresis, deterministic cap i placement;
- sleep/respawn/threat/HP poza renderem;
- save v3 i fundament stanu pod autorytatywnego hosta.

### M7A — Asset Vault

- 45 placeholderów PNG, manifest, contact sheet i niezależny ZIP;
- batch PNG, import/export ZIP, walidacja SHA/CRC/ID/layoutu i atomowe undo/redo.

## Aktywne: M7 Final Owner Gate

Status: **PLAYTEST CANDIDATE / NOT OWNER ACCEPTED**.

Po pierwszym uruchomieniu właściciela zakres M7 został rozszerzony o rzeczy wcześniej pominięte przez techniczne testy:

- prawidłowe layouty i pivoty atlasów;
- rzeczywiste, authored przejścia pięter;
- P2 z klawiatury do testów bez gamepada;
- atomową walidację save/load;
- widoczność transitions w Studio;
- clean-package i Windows portability gate;
- launchery gotowego builda bez wymuszania npm/build.

M7 kończy się dopiero po ręcznym teście Przemka i jawnej decyzji `ACCEPT M7`, `ACCEPT WITH DEBT` albo `REJECT / FIX M7`.

## Następne po akceptacji: M8 — pierwszy LAN Coop

Cel produktu: host i klient grają na osobnych urządzeniach w tej samej sieci lokalnej.

Minimalny vertical slice:

1. lokalny proces hosta uruchamia autorytatywny `GameWorld` fixed-step;
2. host-player i client-player łączą się przez wersjonowany protokół LAN;
3. klient wysyła wyłącznie komendy wejścia, host rozstrzyga gameplay;
4. host wysyła snapshoty/delty graczy, spawnów, potworów, nagród i active floor;
5. renderer klienta interpoluje snapshoty bez mutowania stanu kanonicznego;
6. uruchomienie hosta i klienta ma czytelną instrukcję/adres LAN;
7. disconnect/timeout nie niszczy stanu hosta;
8. zapis świata należy do hosta;
9. dwa fizyczne urządzenia przechodzą co najmniej 15-minutowy playtest.

Kryteria M8:

- brak client-authoritative damage/drop/spawn/save;
- handshake sprawdza protocol/engine/project compatibility;
- stabilne player/instance/entity IDs między procesami;
- P2 może aktywować region i walczyć niezależnie od P1;
- reconnect minimalny albo jawne, bezpieczne usunięcie slotu;
- RTT, tick drift, input age, snapshot rate i błędy pakietów są widoczne;
- testy deterministyczne oraz kontrolowane latency/jitter/drop;
- gotowy klient HTML, komenda hosta, raport i manifest SHA-256.

Poza M8:

- publiczne serwery, konta, matchmaking i NAT traversal;
- host migration;
- produkcyjny anty-cheat i internetowy backend kont.

## Po M8 — decyzja na podstawie playtestu LAN

Kandydaci, bez automatycznej kolejności:

- feel, animacje, klasy, walka i balans;
- edytor AI;
- przedmioty/ekwipunek;
- questy i dialogi;
- talenty;
- prefaby i regiony logiczne mapy.

Nie budujemy wszystkich edytorów naraz. Każdy kolejny system dostaje najpierw jeden pełny pionowy przykład w prawdziwej grze.
