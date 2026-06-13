# LAST HANDOFF — M7 Owner Accepted / M8 LAN Entry

## Tożsamość

- Wersja: `0.7.5-m7-owner-accepted`
- Zamknięty etap: `M7-OWNER-ACCEPTED-2026-06-13`
- Aktywny etap: `M8 LAN Foundation / Entry Review`
- Status: `IMPLEMENTED=true`, `TECH_VERIFIED=true`.
- `SUCCESSOR_REVIEWED`: **NIE**
- `OWNER_ACCEPTED`: **TAK — ACCEPT_WITH_DEBT, decyzja Przemka 2026-06-13**
- SHA-256 końcowego ZIP-a: zewnętrzny plik `.zip.sha256`, generowany po spakowaniu.

## Rezultat użytkowy

Przemek zaakceptował M7 po testach gotowej paczki Windows. Fundament obejmuje uruchamialny runtime i Studio, stabilne atlasy i warianty terenu, naprawione celowanie, odporne dołączanie P2, realne schody, save v3 i powtarzalny launcher.

## Najnowsza delta

- zapis solo po odłączeniu P2 nie zawiera już osieroconego threat `player.local.2` także w uśpionych spawnach;
- terrain sheets są interpretowane jako deterministyczne warianty, z wyjątkiem animowanej wody i lawy;
- atlasy postaci mają bezpieczny margines 80x80 bez zmiany skali i pivotu w świecie;
- skrypty uruchamiają npm przez Windows `cmd.exe`, dzięki czemu Node 24 nie kończy doctor/test/diagnostics błędem `EINVAL`;
- kursor jest przeliczany z ekranu do świata w każdym ticku, więc ruch kamery nie psuje aimu;
- P2 keyboard dołącza na zboczu wejścia i nie wraca natychmiast po ręcznym odłączeniu przy trzymanym klawiszu;
- drugi launcher tej samej kopii wykrywa działający serwer i bezpiecznie ponownie otwiera stronę;
- build pobiera wersję z `package.json`;
- `REBUILD_AND_PLAY.bat` używa zablokowanego `npm ci`;
- Handoff Protocol v2 i `PROJECT_STATE.json` są częścią repo, a ich spójność jest automatycznie weryfikowana.

## Twierdzenia do niezależnej rewizji następcy

1. Normalne sterowanie P1/P2 i schody działają bez debugowego teleportu.
2. Gotowa paczka uruchamia się na Windowsie bez instalacji i bez przebudowania.
3. Ponowne uruchomienie launchera nie powoduje `EADDRINUSE` ani użycia serwera innej kopii.
4. Save/load zachowuje drużynę, piętro i lifecycle 338 spawnów.
5. Dokumentacja zachowuje `SUCCESSOR_REVIEWED=false`, ale spójnie odzwierciedla nadane przez Przemka `OWNER_ACCEPTED=true`.

## Jawny dług po akceptacji

Lokalny C0 może po śmierci przestawić punkt respawnu używany później w solo. Przemek świadomie odłożył problem, ponieważ coop na jednym ekranie nie jest priorytetem. Wpis `OF-001` w `OWNER_FEEDBACK.md` ma status `BACKLOG`; należy wrócić do polityki respawnu podczas projektowania hosta LAN.

## Następny dozwolony krok

M7 jest zamknięte. Następny główny agent wykonuje niezależny L2 Inheritance Review, a potem rozpoczyna minimalny vertical slice M8 LAN. Walka, progresja i rozbudowa Studio pozostają poza pierwszym zakresem M8.
