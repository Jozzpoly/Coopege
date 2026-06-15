# Coopege M8 LAN VS-3 RETEST — START HERE

## Uruchomienie na Windows

1. Rozpakuj całą paczkę do nowego folderu.
2. Kliknij `PLAY_COOPEGE.bat`.
3. Do zwykłego testu nie uruchamiaj `npm install` ani builda — gotowy `dist` jest w paczce.
4. Terminal pozostaw otwarty; `Ctrl+C` zatrzymuje serwer.
5. Ponowne kliknięcie launchera tej samej kopii bezpiecznie otworzy istniejący serwer.

Adres ręczny: `http://localhost:4173/dist/Coopege_v0.01.html`  
Studio: `START_STUDIO.bat` lub `http://localhost:4173/dist/Coopege_Studio_v0.1.html`

## Sterowanie

- P1: WASD, mysz, LPM/Spacja/F.
- P2: strzałki, prawy Ctrl/Numpad0 albo gamepad.
- P2 dołącza po nowym naciśnięciu swojego sterowania; przycisk służy też do odłączenia.
- Wejście na podświetlone schody przenosi drużynę.

## Walidacja i feedback

M7 zostało zaakceptowane przez Przemka. Problemy opisuj przede wszystkim w czacie z agentem. Dłuższe uwagi i starsze błędy mogą trafić do `docs/process/OWNER_FEEDBACK.md`; agent odpowiada za ich uporządkowanie i synchronizację dokumentacji. Diagnostykę zbiera `COLLECT_DIAGNOSTICS.bat`.

Deweloperska weryfikacja: `npm ci --ignore-scripts`, potem `npm run validate`.

## Test LAN VS-3

Kliknij dwukrotnie `PLAY_COOPEGE_LAN.bat`. Launcher sam przygotuje brakujące zależności, uruchomi host i otworzy pierwszego klienta. Drugi gracz otwiera jeden z adresów LAN wypisanych w oknie serwera. Zatrzymanie: `Ctrl+C` w oknie hosta. Szczegóły: `docs/process/M8_LAN_CLIENT_VS3.md`.

## Status

M7: **TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**. M8 LAN VS-3 jest **IN_PROGRESS / OWNER RETEST REQUIRED**. Nie przechodzimy do VS-4 przed potwierdzeniem działania dwóch klientów przez właściciela.
