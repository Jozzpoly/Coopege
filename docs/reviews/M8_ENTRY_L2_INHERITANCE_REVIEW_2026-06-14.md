# M8 Entry L2 Inheritance Review — 2026-06-14

## Paczka

- Wersja: `coopege@0.7.5-m7-owner-accepted`
- Checkout: `a38494e2c426e5fd220ee6f649a4f8adc70bd83e`
- Zdalny baseline: `origin/main` wskazuje ten sam commit
- SHA-256 końcowego ZIP-a: nieporównany, ponieważ checkout nie zawiera zewnętrznego sidecara wydania; integralność repo potwierdzono przez Git i manifesty wydania
- Poprzedni handoff: `docs/process/LAST_HANDOFF.md`
- Data/agenta: 2026-06-14, niezależny następca L2

## Baseline

| Bramka | Oczekiwano | Otrzymano | Status |
|---|---:|---:|---|
| doctor | 18 PASS | 18 PASS / 0 WARN / 0 FAIL | PASS |
| handoff | bez FAIL | 40 PASS / 0 FAIL | PASS |
| portability | bez FAIL | 21 PASS / 0 WARN / 0 FAIL | PASS |
| legacy | 4/4 | 4/4 | PASS |
| TypeScript/Node | PASS / 94 | PASS / 94/94 | PASS |
| migration | 52/52 | 52/52 | PASS |
| Chromium | 9/9 + Ability Composer | 9/9 + Ability Composer | PASS |
| server reuse | PASS | PASS | PASS |
| gameplay gate | PASS_AUTOMATED | 27 000 ticków solo + 27 000 C0, saves 6/6 | PASS |

Polecenia wejściowe:

```powershell
npm ci --ignore-scripts
npm run validate
```

## Trzy twierdzenia, które próbowano obalić

1. **P2 i normalne UI nie zachowują pełnego stanu.** W gotowym `dist/Coopege_v0.01.html` dołączono P2 przyciskiem, zapisano save v3, odłączono P2 i wczytano zapis. Wróciło dwóch graczy z tymi samymi stabilnymi ID; konsola nie zgłosiła warningów ani błędów.
2. **Schody działają tylko przez debug API.** Chromium `m7-real-controls-stairs` ponownie przeszedł realnym inputem i produkcyjną ścieżką `transition.legacy.gorska_prze_ecz.forward`; testy Node potwierdziły P1, P2, konflikt schodów i wszystkie 24 przejścia.
3. **Save/load lub launcher reuse ukrywają regresję.** Atomowy save v3 odtworzył 338 stanów spawnów, test odrzucenia uszkodzonego save pozostał zielony, a drugi serwer tej samej kopii przeszedł `test:server` bez `EADDRINUSE`.

## Prawdziwa ścieżka użytkownika

Uruchomiono gotowy runtime z `dist`, bez przebudowania w trakcie scenariusza. Normalnym UI wykonano: start świata, dołączenie P2, zapis, odłączenie P2 i wczytanie save. HUD, playfield i diagnostyka pozostały czytelne; po load widoczni byli obaj gracze, `player.local.1` i `player.local.2`. Debug API nie było użyte do tego scenariusza.

## Spójność dokumentacji i feedbacku

- `PROJECT_STATE.json`, pamięć, milestone, handoff, roadmapa i gotowy UI przed review zgodnie opisywały M7 jako `OWNER_ACCEPTED_WITH_DEBT` oraz M8 jako `ENTRY_REVIEW`.
- `OWNER_FEEDBACK.md` zachowuje `OF-001` jako `BACKLOG`; polityka respawnu ma zostać jawnie rozstrzygnięta w M8.
- Raporty historyczne są snapshotami; po tym review otrzymują adnotację o późniejszym `SUCCESSOR_REVIEWED`.
- Wersja, baseline i manifesty odpowiadają buildowi `0.7.5-m7-owner-accepted`.

## Znaleziska

| ID | Klasa | Opis | Decyzja |
|---|---|---|---|
| L2-001 | BACKLOG | W checkoutcie nie ma zewnętrznego `.zip.sha256`, więc nie porównano oryginalnego archiwum wydania. Git HEAD, `origin/main` i manifesty są zgodne. | Nie blokuje M8; sidecar pozostaje obowiązkowy przy kolejnym pakowaniu. |
| L2-002 | FIX_IN_CURRENT_MILESTONE | `InputFrame` nie zawiera sekwencji sieciowej, wieku ani ACK. | Nie zmieniać `GameWorld`; dodać wersjonowaną kopertę wejścia w `@coopege/lan-protocol`. |
| L2-003 | FIX_IN_CURRENT_MILESTONE | Save v3 zawiera pełne 338 stanów i nie jest formatem snapshotu wysyłanego wiele razy na sekundę. | Zbudować osobny, ograniczony `WorldSnapshot` dla klienta; save pozostaje wyłącznie formatem hosta. |

Brak `BLOCKER` i `MUST_FIX_BEFORE_NEXT`.

## Decyzja

`PASS`.

`SUCCESSOR_REVIEWED=true` może zostać ustawione. Implementacja M8 pozostaje nierozpoczęta do pierwszej zmiany kodu hosta/protokołu/klienta.
