# Coopege — uruchomienie na Windows

## Zwykły playtest gotowej wersji

Nie trzeba wykonywać `npm install` ani budować projektu.

1. Rozpakuj całą paczkę.
2. Kliknij `PLAY_COOPEGE.bat`.
3. Pozostaw otwarte okno terminala podczas gry.
4. Zakończ serwer skrótem `Ctrl+C`.

Studio uruchamia `START_STUDIO.bat`.

## Przebudowanie ze źródeł

Dopiero gdy zmieniasz kod lub projekt, uruchom `REBUILD_AND_PLAY.bat` albo wykonaj:

```powershell
npm install
npm run doctor
npm run build
npm run play
```

Gotowy build jest zachowywany, gdy przebudowanie się nie powiedzie.

## Diagnostyka

Kliknij `COLLECT_DIAGNOSTICS.bat` i przekaż plik `coopege-diagnostics.json`. Nie zawiera on kluczy API ani zawartości prywatnych plików użytkownika.
