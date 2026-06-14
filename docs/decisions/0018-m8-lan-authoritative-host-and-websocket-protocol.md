# ADR-0018 — M8 LAN: autorytatywny host i protokół WebSocket

- Status: **zaakceptowany**
- Data: **2026-06-14**
- Milestone: **M8**

## Kontekst

M7 pozostawiło deterministyczny `GameWorld` 30 Hz, jawne `InputFrame`, stabilne ID, save v3 i stan spawnów niezależny od renderera. M8 ma połączyć dwa fizyczne urządzenia w LAN bez przenoszenia autorytetu obrażeń, dropu, spawnów lub zapisu do klienta.

## Decyzja

1. **Proces Node jest jedynym właścicielem `GameWorld`.** Host wyznacza tick, składa `InputFrame` i wykonuje wszystkie reguły gameplayu.
2. **Obie przeglądarki są klientami wejścia i renderowania.** Przeglądarka hosta łączy się przez ten sam protokół co drugie urządzenie; lokalny gracz nie dostaje uprzywilejowanej ścieżki mutacji świata.
3. **Transportem M8 jest WebSocket.** Ten sam proces Node serwuje klienta HTML przez HTTP i udostępnia WebSocket pod tym samym adresem LAN. Publiczny internet, NAT traversal i matchmaking pozostają poza zakresem.
4. **Powstaje osobny `@coopege/lan-protocol`.** Protokół ma nazwę, wersję, walidatory runtime, limity rozmiaru wiadomości i jawne typy błędów. Nie rozszerzamy protokołu Runtime–Studio, ponieważ ma inny trust boundary i lifecycle.
5. **Handshake sprawdza kompatybilność.** `hello` i `welcome/reject` porównują co najmniej protocol version, engine version, project ID, project checksum oraz token sesji. Host przydziela `sessionId`, `playerId` i slot.
6. **Klient wysyła tylko komendy.** Koperta wejścia zawiera `sessionId`, `playerId`, monotoniczny `inputSeq`, obserwowany `clientTick`, czas próbkowania i znormalizowany `PlayerCommand`. Host odrzuca duplikaty, zbyt stare lub przyszłe wejścia oraz komendy gracza niebędącego własnością połączenia.
7. **Brak pakietu oznacza wejście neutralne.** Host nie zatrzymuje fixed ticka, nie powtarza bezterminowo starego ataku i nie pozwala klientowi wybrać ticka symulacji.
8. **Snapshot sieciowy nie jest save’em.** `WorldSnapshot` zawiera host tick, ACK wejścia, active floor, stan potrzebny rendererowi i zdarzenia prezentacyjne. Save v3 pozostaje pełnym, kanonicznym formatem hosta i nie jest wysyłany w pętli 10–20 Hz.
9. **Klient interpoluje, ale nie mutuje kanonu.** Pierwszy vertical slice nie wymaga predykcji ani rollbacku. Renderer przechowuje dwa ostatnie snapshoty i interpoluje pozycje z kontrolowanym opóźnieniem.
10. **Disconnect nie niszczy świata ani save’a.** Połączenie przechodzi w stan rozłączony, wejście staje się neutralne, a host zachowuje kanoniczny świat. Minimalny reconnect może odzyskać slot tokenem sesji; w przeciwnym razie host bezpiecznie zwalnia slot według jawnej polityki.
11. **Save należy wyłącznie do hosta.** Klient nie wysyła snapshotu zapisu i nie może zatwierdzać damage, loot, respawn, floor transition ani spawn lifecycle.
12. **Diagnostyka jest częścią MVP.** UI pokazuje stan połączenia, RTT, snapshot rate, input age, tick drift, utracone/odrzucone pakiety i ostatni błąd protokołu.

## Konsekwencje

- `GameWorld.step()` i obecny model `InputFrame` pozostają bez zmian; sieć jest adapterem wokół symulacji.
- Host potrzebuje zależności serwerowej WebSocket oraz komendy uruchomieniowej LAN.
- Powstaje dedykowany format snapshotu prezentacyjnego, mniejszy od save v3.
- Pierwszy etap nie obejmuje client-side prediction, host migration, kont ani publicznych serwerów.
- Testy muszą kontrolować latency, jitter, drop, duplikaty, out-of-order, timeout i restart klienta.
