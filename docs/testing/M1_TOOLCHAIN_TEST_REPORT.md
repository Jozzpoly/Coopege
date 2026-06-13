# Coopege M1 — raport weryfikacji toolchainu

- Data: **2026-06-12**
- Kamień milowy: **M1 — wspólny model projektu i fundament toolchainu**
- Wynik: **PASS**

## Zakres

Zweryfikowano:

- `ProjectStore` przechowujący snapshot projektu niezależnie od runtime;
- `CommandBus` z walidowanym undo/redo pełnych snapshotów;
- odrzucanie niepoprawnych komend bez częściowej mutacji;
- `AtomicProjectHost` przygotowujący projekt poza aktywnym stanem i commitujący wyłącznie poprawny kandydat;
- wersjonowany protokół `coopege-runtime-studio` v1;
- nonce sesji, request ID i kontrolę źródła wiadomości;
- handshake Runtime–Studio;
- atomowe `project.apply` oraz odpowiedzi `project.applied` / `project.rejected`;
- Studio osadzające runtime w `sandbox="allow-scripts"` bez `allow-same-origin`;
- import, walidację, stabilny eksport JSON, checkpoint i recovery;
- build docelowych `Coopege_v0.01.html` i `Coopege_Studio_v0.1.html`.

## Wyniki automatyczne

Polecenie:

```text
npm test
```

Wynik:

- strict TypeScript typecheck: **PASS**;
- testy Node: **19/19 PASS**;
- golden fixture migracji: **51/51 artefaktów PASS**;
- Chromium `Coopege_v0.01.html`: **PASS**;
- Chromium standalone runtime minimalny: **PASS**;
- Chromium `Coopege_Studio_v0.1.html`: **PASS**.

## Scenariusze przeglądarkowe M1

1. Runtime ładuje projekt, przygotowuje wszystkie piętra i ustawia rewizję 1.
2. Studio i preview kończą handshake protokołu v1.
3. Studio przesyła pełny zmigrowany snapshot 5×200×200 z 338 spawnami.
4. Zmiana nazwy przechodzi przez `CommandBus`, runtime stosuje ją i odsyła nowy checksum.
5. Próba ustawienia punktu startowego poza mapą jest odrzucana przed modyfikacją store.
6. Undo przywraca poprzedni snapshot i ponownie synchronizuje preview.
7. Iframe ma tylko `allow-scripts`; test potwierdza brak `allow-same-origin`.

## Kryteria M1

- jedna komenda buduje oba nazwane pliki HTML: **PASS**;
- błędne projekty zwracają strukturalne błędy: **PASS**;
- migracja starego fixture’a jest testowana: **PASS**;
- minimalne Studio otwiera, waliduje, zapisuje i podgląda projekt: **PASS**;
- minimalny runtime przyjmuje snapshot przez most: **PASS**.

## Artefakty wydania M1

- `dist/Coopege_v0.01.html` — 231489 B — SHA-256 `982dce97d70bac129e9778aeab02130227d34801022cfeff8412f9914d689860`;
- `dist/Coopege_Studio_v0.1.html` — 291907 B — SHA-256 `8c6394afff8bfe73e07c338b95da76e6bba3c07703f2d7f1114bd540469debc2`.

Pełny manifest znajduje się w `docs/testing/M1_ARTIFACT_MANIFEST.json`.
