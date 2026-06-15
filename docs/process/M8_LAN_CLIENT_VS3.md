# M8 LAN VS-3 - kandydat do owner retestu

## Status

VS-3 nie jest ukończone. Pierwszy owner test wykazał czarny ekran drugiej karty, szarpany input i zbyt techniczne uruchomienie. Poprawki automatyczne przeszły, ale zamknięcie etapu wymaga ponownego testu właściciela.

## Uruchomienie bez ręcznej konsoli

1. Kliknij dwukrotnie `PLAY_COOPEGE_LAN.bat`.
2. Launcher sam doinstaluje brakujące publiczne zależności tylko przy pierwszym starcie.
3. Pierwszy klient otworzy się automatycznie.
4. Drugi gracz otwiera jeden z adresów LAN wypisanych w oknie hosta.
5. Zatrzymanie hosta: `Ctrl+C` w jego oknie.

Zwykły start używa gotowego `dist/Coopege_M8_LAN_Client.html`. Deweloperska przebudowa jest jawna: `npm run lan:host:rebuild`.

## Naprawione przyczyny OF-002

- reconnect token jest zapisany w `sessionStorage`, więc każda karta ma własny slot;
- skopiowana karta ze starym tokenem ponawia połączenie raz bez tokenu;
- host podtrzymuje ostatni kierunek przez 6 ticków, aby jitter timerów nie zerował ruchu;
- `usePrimary` pozostaje zdarzeniem jednorazowym i nie jest podtrzymywany;
- keydown/keyup wysyłają input natychmiast;
- przed pierwszym snapshotem lub po błędzie canvas pokazuje stan połączenia zamiast czerni.

## Automatyczne dowody

- `tests/lan-host.test.ts`: ownership, podtrzymanie ruchu, wygaśnięcie i brak powtarzania ataku;
- `tests/lan-client.test.ts`: kolejność snapshotów, interpolacja i limit bufora;
- `tools/test/lan-client-browser-smoke.mjs`: dwie prawdziwe karty jednego originu, osobne sloty i ciągły ruch obu graczy;
- `tools/test/lan-launcher-smoke.mjs`: rzeczywisty start `PLAY_COOPEGE_LAN.bat`, gotowość hosta, shutdown i save;
- screenshoty: `.build/browser-smoke/m8-lan-client-tab-1.png` i `m8-lan-client-tab-2.png`.

## Owner retest

- pierwsza karta reaguje płynnie na WASD/strzałki;
- druga karta lub urządzenie nie pokazuje czarnego ekranu;
- P1 i P2 poruszają się niezależnie przez kilka minut;
- atak działa bez samoczynnego powtarzania;
- zamknięcie i ponowne wejście nie przejmuje slotu aktywnej karty.

VS-4 pozostaje nieaktywne do czasu potwierdzenia tych punktów.
