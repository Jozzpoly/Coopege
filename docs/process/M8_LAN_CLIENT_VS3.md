# M8 LAN VS-3 - grywalny klient runtime

## Cel

VS-3 zamienia stronę diagnostyczną hosta w grywalnego klienta LAN. Przeglądarka wysyła wyłącznie `PlayerCommand`, renderuje snapshoty hosta i nie tworzy lokalnego `GameWorld`.

## Uruchomienie

```powershell
npm ci --ignore-scripts
npm run lan:host
```

Host buduje klienta i wypisuje adresy z tokenem, na przykład `http://192.168.1.20:4174/?token=...`. Otwórz ten sam adres na maksymalnie dwóch urządzeniach w tej samej sieci. Wpisanie `shutdown` w terminalu wykonuje zapis i kontrolowane zamknięcie.

## Kontrakty VS-3

- `dist/Coopege_M8_LAN_Client.html` jest samowystarczalnym artefaktem serwowanym przez hosta.
- Checksum osadzonego projektu musi być identyczna z checksumą projektu hosta.
- `LanClientInputAdapter` mapuje klawiaturę, mysz i gamepad na komendę jednego przydzielonego gracza.
- `LanSnapshotBuffer` odrzuca duplikaty i snapshoty out-of-order, ogranicza pamięć i interpoluje pozycje z opóźnieniem 110 ms.
- Renderer korzysta z prezentacyjnych danych snapshotu; klient nie ma API save/load ani lokalnego debug `GameWorld`.
- HUD pokazuje player/slot, RTT, host tick, tick drift, input age, ACK, snapshot rate, bufor, liczbę klientów i odrzucone inputy.

## Automatyczne dowody

- `tests/lan-client.test.ts`: kolejność snapshotów, interpolacja, zmiana piętra, rate i limit pamięci.
- `npm run test:lan-host`: HTTP z tokenem, dwa WebSockety, różne sloty, input ACK, ping/pong i shutdown save.
- `tools/test/lan-client-browser-smoke.mjs`: realny Chromium, drugi peer WebSocket, natywny ruch `KeyD`, dwa renderowane gracze, ACK, snapshot rate i brak lokalnego `GameWorld`.
- Screenshot: `.build/browser-smoke/m8-lan-client.png`.

## Następny zakres

VS-4 obejmuje timeouty, czytelne przyczyny disconnectu, automatyczny reconnect albo jawne zwolnienie slotu oraz kontrolowane testy latency, jitter, drop, duplicate i reordering. VS-3 nie implementuje prediction, rollbacku ani host migration.
