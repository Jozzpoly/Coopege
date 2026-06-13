# LAST HANDOFF — M7 Final Validation Candidate

## Tożsamość

- Wersja: `0.7.3-m7-validation-candidate`
- Kandydat: `M7-FINAL-VALIDATION-2026-06-13`
- Status: `IMPLEMENTED=true`, `TECH_VERIFIED=true`.
- `SUCCESSOR_REVIEWED`: **NIE**
- `OWNER_ACCEPTED`: **NIE**
- SHA-256 końcowego ZIP-a: zewnętrzny plik `.zip.sha256`, generowany po spakowaniu.

## Rezultat użytkowy

Przemek otrzymuje jedną gotową paczkę Windows z uruchamialnym runtime i Studio, naprawionym celowaniem względem kamery, odpornym dołączaniem P2, realnymi schodami i powtarzalnym launcherem.

## Najnowsza delta

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
5. Dokumentacja nie nadaje przedwcześnie `SUCCESSOR_REVIEWED` ani `OWNER_ACCEPTED`.

## Nieweryfikowane przez właściciela

Feel ruchu i walki, czytelność animacji, kilka różnych par schodów, ergonomia P2 keyboard, kamera/tether, dłuższa sesja oraz Studio. Te obszary należą do ręcznego owner gate.

## Następny dozwolony krok

Najpierw ręczny test Przemka i niezależny L2 Inheritance Review. M8 jest zabronione do jawnego `OWNER_ACCEPTED`.
