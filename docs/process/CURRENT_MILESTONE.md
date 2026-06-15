# CURRENT MILESTONE - M8 LAN FOUNDATION / VS-3 STABILIZATION

## Status

**M7 TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**

**M8 IMPLEMENTATION IN_PROGRESS / VS-1 AND VS-2 COMPLETE / VS-3 OWNER RETEST REQUIRED**

Owner test z 2026-06-14 odrzucił poprzednią deklarację „grywalnego LAN”. Druga karta kończyła z czarnym ekranem przez współdzielony token reconnect, ruch był szarpany przez zerowanie inputu między pakietami, a start wymagał ręcznej komendy i pełnego builda. VS-3 pozostaje otwarte do ręcznego potwierdzenia właściciela.

## Naprawy kandydata retestowego

- token reconnect przeniesiony z `localStorage` do izolowanego per karta `sessionStorage`;
- odrzucony stary token powoduje jedno automatyczne ponowienie jako nowy klient;
- host podtrzymuje kierunek przez 6 ticków jitteru, ale nie powtarza jednorazowego ataku;
- keydown/keyup wysyła zmianę natychmiast, niezależnie od interwału 30 Hz;
- brak snapshotu pokazuje czytelny stan połączenia zamiast pustego canvasu;
- `PLAY_COOPEGE_LAN.bat` uruchamia host jednym kliknięciem i otwiera pierwszego klienta;
- zwykły start LAN używa gotowego `dist`; pełny build jest tylko w `lan:host:rebuild`;
- Chromium gate używa dwóch prawdziwych kart tego samego originu i wymaga płynnego ruchu obu graczy.

## Gate VS-3

1. Właściciel uruchamia `PLAY_COOPEGE_LAN.bat` bez wpisywania komendy.
2. Pierwsza karta otwiera się automatycznie i reaguje płynnie na wejście.
3. Druga karta lub urządzenie otwiera ten sam link, dostaje drugi slot i nie ma czarnego ekranu.
4. Obaj gracze poruszają się niezależnie przez minimum kilka minut.
5. Dopiero po tym VS-3 może zostać oznaczone jako ukończone; VS-4 nie jest jeszcze aktywne.

## Potwierdzony baseline techniczny

TypeScript PASS, Node 112/112 PASS, Chromium 10/10 + Ability Composer PASS, dwie realne karty LAN PASS, launcher Windows PASS, portability 25/0/0. Automatyczny PASS nie zastępuje owner retestu.

## Dług przyjęty

`OF-001` lokalnego coopa pozostaje `FIXED_NEEDS_RETEST`. `OF-002` jest aktywnym wpisem VS-3 i może zostać zamknięty wyłącznie po pozytywnym teście właściciela.
