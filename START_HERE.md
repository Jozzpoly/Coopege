# Coopege M8 LAN VS-2 — START HERE

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

## Host LAN VS-2

Po instalacji zależności uruchom `npm run lan:host`. Terminal wypisze adresy LAN z tokenem. Otwarta strona potwierdza połączenie i snapshoty, ale nie jest jeszcze grywalnym klientem. Wpisz `shutdown` w terminalu hosta, aby zapisać świat i bezpiecznie zakończyć proces. Szczegóły: `docs/process/M8_LAN_HOST_VS2.md`.

## Status

M7: **TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**. M8 LAN jest **IN_PROGRESS**: kontrakt VS-1 i autorytatywny host VS-2 są ukończone, a następny krok to grywalny klient runtime VS-3. Lokalna poprawka wspólnego respawnu P1/P2 oczekuje na ręczny retest.
