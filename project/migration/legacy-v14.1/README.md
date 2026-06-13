# Golden fixture migracji legacy v14.1

Ten katalog jest deterministycznym wynikiem eksportu przez oficjalne obiekty `TibiaMapAPI`, `TibiaContentAPI`, `TibiaAssetAPI` i `TibiaProjectAPI`. Oryginalny HTML w `legacy/reference/` nie jest modyfikowany.

- `raw/legacy-export.normalized.json` — pełny znormalizowany snapshot API, w tym dane jeszcze nieobsługiwane przez schema v1.
- `coopege.project.json` — poprawny projekt Coopege schema v1.
- `assets/` — 45 atlasów PNG wyeksportowanych przez runtime.
- `asset-map.json` — mapowanie legacy ID → stabilne ID, plik i SHA-256.
- `migration-report.json` — jawne transformacje, braki i elementy wymagające dalszego modelu.
- `golden-manifest.json` — sumy kontrolne całego fixture’a.

Regeneracja: `npm run migrate:legacy`.
