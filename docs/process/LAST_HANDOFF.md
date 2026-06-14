# LAST HANDOFF - M8 LAN VS-2 Complete

## Tożsamość

- Wersja: `0.8.0-m8-lan-vs2`
- Bazowy checkout: `a38494e2c426e5fd220ee6f649a4f8adc70bd83e`
- Zamknięty etap: `M7-OWNER-ACCEPTED-2026-06-13`
- Aktywny etap: `M8 LAN Foundation / VS-3 Client`
- `IMPLEMENTED`: M7 **TAK**, M8 **CZĘŚCIOWO - VS-1 I VS-2**
- `TECH_VERIFIED`: **TAK dla VS-1, VS-2 i poprawki respawnu**
- `SUCCESSOR_REVIEWED`: **TAK - L2 PASS, 2026-06-14**
- `OWNER_ACCEPTED`: M7 **TAK - ACCEPT_WITH_DEBT**

## Wykonane

### M8 VS-1

`@coopege/lan-protocol` v1 zawiera wersjonowane koperty hello/welcome/reject, input, snapshot, ping/pong i disconnect, deterministyczny JSON, limit 64 KiB, runtime validation, compatibility gate oraz admission inputu.

### M8 VS-2

`apps/lan-host` uruchamia autorytatywny `GameWorld` 30 Hz dla pełnego zmigrowanego projektu. Jeden proces serwuje HTTP oraz WebSocket `/lan`, przydziela dwa stabilne sloty, egzekwuje ownership, konsumuje najnowszy input raz i składa neutralną komendę, gdy inputu brakuje.

Snapshoty 10 Hz mają osobny ACK dla każdego klienta i nie zawierają save v3. Disconnect zwalnia połączenie, ale nie usuwa gracza ani świata; reconnect token odzyskuje ten sam slot. Host ładuje save, wykonuje autosave i zapisuje atomowo przy komendzie `shutdown`.

Strona HTTP VS-2 jest diagnostyką handshake'u i snapshotów. Pełne sterowanie oraz renderer sieciowy należą do VS-3.

### OF-001

Lokalny coop używa jednej kotwicy respawnu drużyny, wybiera wolne pole i normalizuje historyczne rozbieżne save'y. Status: `FIXED_NEEDS_RETEST`.

## Dowody

- TypeScript: PASS;
- testy Node: 107/107 PASS;
- LAN host smoke: HTTP, ochrona tokenem, dwa WebSockety, różne sloty, input ACK, ping/pong i shutdown save PASS;
- kompatybilność save v1-v3 zachowana;
- `npm run validate`: wymagany końcowy PASS po aktualizacji manifestów i dist.

## Nienaruszalne granice M8

- Node host jest jedynym właścicielem `GameWorld`, ticka i save'a.
- Obie przeglądarki używają tej samej ścieżki protokołu.
- Klient wysyła tylko `PlayerCommand`; host wybiera tick i składa `InputFrame`.
- `HostSnapshotPayload` jest prezentacyjny; save v3 nie jest transportem renderowania.
- Disconnect nie niszczy świata ani ownershipu save'a.

## Następny krok

VS-3: dodać tryb `lan-client` w runtime. Nie tworzy lokalnego `GameWorld`, wysyła komendy przydzielonego gracza, buforuje co najmniej dwa snapshoty, interpoluje pozycje i pokazuje connection state, RTT, input age, tick drift oraz snapshot rate.
