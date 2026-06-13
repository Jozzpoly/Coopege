# Migracja legacy

Migracja M0 jest wykonywana dynamicznie w prawdziwym Chromium, bez modyfikowania zarchiwizowanego HTML.

## Pipeline

1. `verify:legacy` sprawdza bajty plików referencyjnych.
2. `extract-legacy-raw.mjs` uruchamia runtime przez Chrome DevTools Protocol.
3. Oficjalne `TibiaMapAPI`, `TibiaContentAPI`, `TibiaAssetAPI` i `TibiaProjectAPI` eksportują dane i wyniki walidacji.
4. Zmienne pola czasu są usuwane, aby snapshot był deterministyczny.
5. `convert-legacy-snapshot.mjs` tworzy poprawny projekt Coopege schema v1 i zapisuje 45 PNG.
6. `create-golden-manifest.mjs` zapisuje sumy 51 artefaktów.
7. `verify-golden.mjs` wykrywa każdą zmianę fixture’a.

Pełne polecenie:

```powershell
npm run migrate:legacy
```

## Rezultat

`project/migration/legacy-v14.1/` zawiera raw snapshot, projekt schema v1, PNG, mapę ID, raport transformacji oraz golden manifest.

Minimalny schema v1 nie obsługuje jeszcze linków pięter, NPC, wejść, questów, talentów ani gameplayowych definicji przedmiotów. Dane eksportowane przez legacy pozostają w raw snapshotcie, a raport oznacza je jako `UNSUPPORTED` lub `MANUAL_REVIEW_REQUIRED`.

Build tworzy również `dist/Coopege_Legacy_Migration_Preview.html`, który wizualizuje pełne piętro startowe 200×200 i 338 spawnów z migrowanego projektu.
