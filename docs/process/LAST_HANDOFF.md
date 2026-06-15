# LAST HANDOFF - M8 LAN VS-3 Owner Retest Candidate

## Tożsamość

- Wersja: `0.8.1-m8-lan-vs3-retest`
- M7: `TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED`
- Aktywny etap: `M8 LAN Foundation / VS-3 Stabilization and Owner Retest`
- VS-1: complete
- VS-2: complete
- VS-3: **NOT COMPLETE / FIXED_NEEDS_RETEST**
- VS-4: not active

## Powód ponownego otwarcia

Właściciel odtworzył czarny ekran drugiej karty, praktycznie niedziałający ruch oraz zbyt techniczne uruchomienie wymagające konsoli i builda. Poprzedni smoke test był niewystarczający, bo drugi klient symulował surowym WebSocketem zamiast drugą kartą przeglądarki.

## Zmiany

- izolacja reconnect tokenu per karta i automatyczny fallback po odrzuceniu starego tokenu;
- sześciotickowe podtrzymanie ciągłego inputu na hoście z wygaszeniem po braku pakietów;
- natychmiastowa wysyłka zmian klawiatury i czytelny canvas stanu połączenia;
- test dwóch prawdziwych kart w jednym profilu Chromium;
- launcher `PLAY_COOPEGE_LAN.bat`, automatyczne otwarcie klienta i brak pełnego builda przy zwykłym starcie;
- status dokumentacji cofnięty do owner retestu.

## Dowody techniczne

- obie realne karty dostały osobne sloty;
- P1 przesunął się o 1,63 pola, P2 o 2,44 pola podczas 650 ms ciągłego wejścia;
- obie karty renderują ten sam świat i raportują `connectedPlayers=2`;
- test regresyjny odtwarzał przed poprawką `reconnect_rejected` na drugiej karcie;
- pełne `npm run validate` jest wymagane przed push.

## Następny krok

Owner retest przez dwuklik `PLAY_COOPEGE_LAN.bat`. Nie oznaczać VS-3 jako ukończonego ani nie przechodzić do VS-4 bez potwierdzenia właściciela.
