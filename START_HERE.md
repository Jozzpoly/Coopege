# Coopege M8 LAN VS-3 — START HERE

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

## Grywalny LAN VS-3

Po instalacji zależności uruchom `npm run lan:host`. Komenda buduje klienta, uruchamia host i wypisuje adresy LAN z tokenem. Otwórz ten sam adres na maksymalnie dwóch urządzeniach; każda przeglądarka steruje własnym graczem i renderuje autorytatywne snapshoty hosta. Wpisz `shutdown` w terminalu, aby zapisać świat i bezpiecznie zakończyć proces. Szczegóły: `docs/process/M8_LAN_CLIENT_VS3.md`.

## Status

M7: **TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**. M8 LAN jest **IN_PROGRESS**: kontrakt VS-1, host VS-2 i grywalny klient VS-3 są ukończone. Następny krok to VS-4: timeouty, awarie i reconnect. Lokalna poprawka wspólnego respawnu P1/P2 oczekuje na ręczny retest.
