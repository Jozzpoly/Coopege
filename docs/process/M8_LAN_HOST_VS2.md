# M8 LAN VS-2 - autorytatywny host Node

## Uruchomienie

```powershell
npm ci --ignore-scripts
npm run lan:host
```

Użytkownik uruchamia `PLAY_COOPEGE_LAN.bat`; powyższe komendy są ścieżką deweloperską. Zwykły `lan:host` kompiluje tylko host Node i używa gotowego klienta z `dist`. Pełna przebudowa klienta jest jawna: `npm run lan:host:rebuild`.

Host ładuje pełny zmigrowany projekt, uruchamia `GameWorld` 30 Hz i wypisuje adresy LAN zawierające token sesji. Kandydat VS-3 renderuje autorytatywne snapshoty, ale etap wymaga owner retestu.

Kontrolowane zatrzymanie na Windowsie: wpisz `shutdown` w terminalu hosta i naciśnij Enter. Host zapisze świat przed zamknięciem.

## Konfiguracja

- `PORT` - port HTTP/WebSocket, domyślnie `4174`;
- `COOPEGE_LAN_BIND` - adres nasłuchu, domyślnie `0.0.0.0`;
- `COOPEGE_LAN_TOKEN` - opcjonalny stały token sesji;
- `COOPEGE_LAN_PROJECT` - ścieżka projektu względem repo;
- `COOPEGE_LAN_CLIENT` - opcjonalna ścieżka zbudowanego klienta HTML;
- `COOPEGE_LAN_SAVE_PATH` - ścieżka save'a hosta, domyślnie `data/m8-lan-host-save.json`;
- `COOPEGE_LAN_AUTOSAVE_SECONDS` - interwał autosave, domyślnie 30 sekund.

## Kontrakty VS-2

- jeden proces Node jest właścicielem `GameWorld`, ticka i save'a;
- dwa połączenia dostają stabilne, różne `playerId` i używają tej samej ścieżki `/lan`;
- input jest sprawdzany pod kątem ownershipu, sesji, kolejności i wieku;
- brak inputu w ticku oznacza neutralną komendę;
- disconnect zwalnia połączenie, ale nie usuwa gracza ani świata;
- reconnect token odzyskuje ten sam slot;
- snapshot 10 Hz ma ACK właściwy dla klienta i nie zawiera save v3;
- token jest wymagany zarówno przez handshake, jak i adres grywalnego klienta.

## Weryfikacja

```powershell
npm run test:lan-host
```

Smoke test uruchamia prawdziwy proces na losowym porcie, sprawdza HTTP, ochronę tokenem, dwa WebSockety, handshake, różne sloty, input ACK, ping/pong i zapis przy kontrolowanym shutdownie.
