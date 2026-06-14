# OWNER FEEDBACK - kanoniczny rejestr trwałego feedbacku

## Zasada użycia

Czat z agentem jest podstawowym kanałem feedbacku Przemka. Agent zapisuje tutaj trwałe decyzje, błędy, długi i zmianę priorytetów oraz synchronizuje dokumentację, kod, testy i gotowy `dist`.

## Statusy

- `OPEN` - wymaga analizy lub decyzji;
- `IN_PROGRESS` - aktualnie realizowane;
- `FIXED_NEEDS_RETEST` - naprawione, czeka na test właściciela;
- `CLOSED` - zakończone;
- `BACKLOG` - świadomie odłożone;
- `IDEA` - hipoteza bez zobowiązania realizacyjnego.

## Aktywne wpisy

### OF-001 - lokalny C0 używa historycznego punktu respawnu

- Status: `FIXED_NEEDS_RETEST`
- Źródło: owner playtest M7 z 2026-06-13, ponowiony feedback 2026-06-14
- Obszar: local coop C0 / respawn / save v3
- Wpływ na M8 LAN: polityka naprawiona przed implementacją hosta, aby LAN dziedziczył jedną jawną kotwicę drużyny

Przyczyna: P1 i później dołączony P2 przechowywali różne `spawnPosition`. Save v3 utrwalał miejsce dołączenia P2 jako drugi, historyczny checkpoint, więc po śmierci wynik zależał od gracza.

Poprawka: drużyna ma wspólną kotwicę respawnu, gracze są bezpiecznie rozstawiani obok niej, a loader normalizuje starsze save'y z rozbieżnymi punktami. Testy automatyczne przeszły; potrzebny ręczny retest w gotowym runtime.

## Zamknięte decyzje M7

- `CLOSED` - clipping broni i stóp w atlasach postaci;
- `CLOSED` - arkusze terenu interpretowane jako animacje zamiast stabilnych wariantów;
- `CLOSED` - zapis solo po odłączeniu P2 zawierający threat `player.local.2`;
- `CLOSED` - M7 zaakceptowane przez Przemka jako `ACCEPT_WITH_DEBT` 2026-06-13.
