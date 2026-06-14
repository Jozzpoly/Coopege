# ADR-0019 - wspólna kotwica respawnu drużyny i normalizacja save

- Status: **zaakceptowany**
- Data: **2026-06-14**
- Milestone: **M8 / poprawka fundamentu GameWorld**

## Kontekst

Lokalny coop przechowywał `spawnPosition` osobno dla każdego gracza. P1 zachowywał checkpoint startowy lub ostatnie przejście piętra, a P2 otrzymywał jako checkpoint miejsce późniejszego dołączenia. Save v3 utrwalał tę rozbieżność. Po śmierci wynik zależał więc od tego, który gracz zginął, co wyglądało jak losowy powrót do historycznej pozycji.

## Decyzja

1. `spawnPosition` reprezentuje jedną wspólną kotwicę checkpointu drużyny na aktywnym piętrze.
2. P2 pojawia się przy bieżącej drużynie, ale dziedziczy jej kotwicę respawnu zamiast miejsca dołączenia.
3. Przejście piętra ustawia tę samą kotwicę wszystkim graczom.
4. Przy respawnie `CollisionGrid` wybiera wolne walkowalne pole obok kotwicy, dzięki czemu gracze nie nakładają się.
5. Loader save v1-v3 normalizuje historyczne rozbieżne punkty do kotwicy P1, a przy braku P1 do pierwszego stabilnie uporządkowanego gracza.
6. Format save pozostaje v3, ponieważ nie zmienia się jego struktura; loader koryguje wcześniejszą niejednoznaczną semantykę.

## Konsekwencje

- chwila dołączenia P2 nie tworzy ukrytego checkpointu;
- stary save coopa jest naprawiany podczas wczytania;
- solo i coop używają tej samej polityki checkpointu;
- przyszły host LAN może posiadać jedną jawną kotwicę drużyny bez kopiowania błędu C0.

## Weryfikacja

- P2 dołączający po ruchu dziedziczy checkpoint P1;
- jednoczesny respawn dwóch graczy rozstawia ich na różnych polach;
- save z rozbieżnymi `spawnX/spawnY` jest normalizowany;
- przejście piętra zapisuje wspólną kotwicę;
- testy save/load, transitions i replay pozostają deterministyczne.
