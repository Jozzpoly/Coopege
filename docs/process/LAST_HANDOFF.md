# LAST HANDOFF - M8 LAN VS-3 Complete

## Tożsamość

- Wersja: `0.8.0-m8-lan-vs3`
- Zamknięty etap: `M7-OWNER-ACCEPTED-2026-06-13`
- Aktywny etap: `M8 LAN Foundation / VS-4 Failures and Reconnect`
- `IMPLEMENTED`: M7 **TAK**, M8 **CZĘŚCIOWO - VS-1, VS-2 I VS-3**
- `TECH_VERIFIED`: **TAK dla VS-1, VS-2, VS-3 i poprawki respawnu**
- `SUCCESSOR_REVIEWED`: **TAK - L2 PASS, 2026-06-14**
- `OWNER_ACCEPTED`: M7 **TAK - ACCEPT_WITH_DEBT**

## Wykonane

### M8 VS-1 i VS-2

`@coopege/lan-protocol` definiuje wersjonowany transport, compatibility gate i input admission. `apps/lan-host` jest jedynym właścicielem `GameWorld`, fixed ticka i save'a, publikuje snapshoty 10 Hz i obsługuje dwa stabilne sloty.

### M8 VS-3

Host serwuje zbudowany `dist/Coopege_M8_LAN_Client.html`. Klient osadza ten sam projekt i checksumę, nie tworzy lokalnego `GameWorld`, wysyła komendy wejścia 30 Hz i renderuje interpolowane snapshoty hosta.

`LanSnapshotBuffer` odrzuca duplicate/out-of-order i nie interpoluje przez zmianę piętra. Renderer otrzymał ścieżkę `renderLan`, a snapshoty niosą `classId`/`definitionId` oraz promień aktora. HUD pokazuje RTT, ACK, input age, tick drift, snapshot rate, bufor i odrzucone inputy.

### OF-001

Lokalny coop używa jednej kotwicy respawnu drużyny, wybiera wolne pole i normalizuje historyczne save'y. Status: `FIXED_NEEDS_RETEST`; zgodnie z decyzją właściciela nie blokuje dalszego M8.

## Dowody

- TypeScript: PASS;
- testy Node: 111/111 PASS;
- host smoke: HTTP/token, dwa WebSockety, różne sloty, ACK, ping/pong i shutdown save PASS;
- Chromium LAN: dwóch klientów, natywny ruch `KeyD`, render świata, snapshot rate i brak lokalnego `GameWorld` PASS;
- screenshot: `.build/browser-smoke/m8-lan-client.png`;
- pełne `npm run validate`: wymagane po odświeżeniu manifestów.

## Nienaruszalne granice M8

- Node host jest jedynym właścicielem `GameWorld`, ticka i save'a.
- Obie przeglądarki używają tej samej ścieżki protokołu.
- Klient wysyła tylko `PlayerCommand`; host składa `InputFrame`.
- `HostSnapshotPayload` jest prezentacyjny i nie jest save v3.
- Renderer klienta nie mutuje świata ani nie zatwierdza gameplayu.
- Disconnect nie może niszczyć świata ani ownershipu save'a.

## Następny krok

VS-4: dodać timeouty, czytelne stany zerwania, automatyczny reconnect albo jawne zwolnienie slotu oraz kontrolowane testy latency, jitter, drop, duplicate i reordering. Host ma nadal tickować i zapisywać świat po utracie klienta.
