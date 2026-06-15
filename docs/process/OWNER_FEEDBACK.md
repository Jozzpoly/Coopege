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

### OF-002 - M8 VS-3 nie spełniał kryterium grywalnego LAN

- Status: `FIXED_NEEDS_RETEST`
- Źródło: owner test z 2026-06-15
- Obszar: LAN startup / dwie karty / reconnect token / responsywność wejścia
- Wpływ na roadmapę: VS-3 ponownie otwarte; VS-4 nie może rozpocząć się przed pozytywnym owner retestem

Objawy: uruchomienie wymagało ręcznej komendy i pełnego builda, druga karta z tym samym linkiem kończyła z czarnym ekranem, a host-player poruszał się skokowo lub prawie wcale.

Przyczyny: reconnect token był współdzielony przez `localStorage`, więc druga karta próbowała przejąć zajęty slot. Host zerował komendę w każdym ticku bez świeżego pakietu, mimo że timery klienta i hosta nie są zsynchronizowane. Poprzedni test używał drugiego surowego WebSocketu zamiast drugiej prawdziwej karty i nie wykrył błędu.

Poprawka: token per karta w `sessionStorage`, automatyczny fallback po odrzuceniu starego tokenu, krótkie podtrzymanie ciągłego inputu na hoście, natychmiastowa wysyłka keydown/keyup, czytelny ekran błędu, test dwóch realnych kart oraz launcher `PLAY_COOPEGE_LAN.bat`.

Gate zamknięcia: właściciel uruchamia LAN dwuklikiem, druga karta lub urządzenie dołącza bez czarnego ekranu, a obaj gracze poruszają się płynnie i niezależnie.

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
