# OWNER FEEDBACK - kanoniczny rejestr trwałego feedbacku

## Zasada użycia

Czat z agentem jest podstawowym kanałem feedbacku Przemka. Właściciel nie musi ręcznie aktualizować dokumentacji projektu. Agent ma obowiązek:

1. rozpoznać w rozmowie decyzje, błędy, długi, pomysły i zmianę priorytetów;
2. zapisać tutaj tylko informacje, które powinny przetrwać kolejne rozmowy;
3. nadać wpisowi status i wpływ na milestone;
4. zsynchronizować `PROJECT_STATE.json`, `AI_PROJECT_MEMORY.md`, `CURRENT_MILESTONE.md`, `LAST_HANDOFF.md`, roadmapę, testy i raporty, jeżeli feedback zmienia ich treść;
5. nie pozostawiać sprzeczności między dokumentacją, kodem, testami i gotowym `dist`.

Przemek może dopisywać do tego pliku dłuższe opisy lub starsze błędy. Agent porządkuje takie wpisy, ale nie usuwa sensu oryginalnego feedbacku.

## Statusy

- `OPEN` - wymaga analizy lub decyzji;
- `IN_PROGRESS` - aktualnie realizowane;
- `FIXED_NEEDS_RETEST` - naprawione, czeka na test właściciela;
- `CLOSED` - zakończone;
- `BACKLOG` - świadomie odłożone i nieblokujące aktywnego milestone;
- `IDEA` - hipoteza bez zobowiązania realizacyjnego.

## Aktywne wpisy

### OF-001 - lokalny C0 zmienia punkt respawnu solo

- Status: `BACKLOG`
- Źródło: owner playtest M7, potwierdzone w czacie 2026-06-13
- Obszar: local coop C0 / respawn
- Wpływ na M7: nie blokuje; M7 zaakceptowane z tym długiem
- Wpływ na M8 LAN: sprawdzić podczas projektowania polityki śmierci i respawnu hosta, aby nie przenieść niejawnej reguły C0 do protokołu LAN

Po śmierci w lokalnym trybie dwóch graczy mechanizm odrodzenia może przestawić punkt używany później w trybie solo. Lokalny coop na jednym ekranie nie jest obecnie priorytetem, więc poprawka została świadomie odłożona.

## Zamknięte decyzje M7

- `CLOSED` - clipping broni i stóp w atlasach postaci;
- `CLOSED` - arkusze terenu interpretowane jako animacje zamiast stabilnych wariantów;
- `CLOSED` - zapis solo po odłączeniu P2 zawierający threat `player.local.2`;
- `CLOSED` - M7 zaakceptowane przez Przemka jako `ACCEPT_WITH_DEBT` 2026-06-13.
