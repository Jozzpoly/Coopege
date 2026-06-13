# Coopege M7 Final Validation Candidate — START HERE

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

## Walidacja

Wykonaj `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`. Gdy wystąpi problem, kliknij `COLLECT_DIAGNOSTICS.bat` i prześlij `coopege-diagnostics.json` wraz z opisem ostatnich czynności.

Deweloperska weryfikacja: `npm ci --ignore-scripts`, potem `npm run validate`.

## Status

`TECH_VERIFIED`, ale **NOT SUCCESSOR_REVIEWED / NOT OWNER ACCEPTED**. M8 pozostaje zablokowane.
