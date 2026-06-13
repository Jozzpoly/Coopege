# ADR-0009 — wspólne assety, różnicowa historia mapy i checkpointy projektu

- Status: zaakceptowane
- Data: 2026-06-12
- Kamień milowy: M3

## Kontekst

Runtime, Studio i standalone build muszą pokazywać identyczne grafiki z tego samego projektu. Mapa ma pięć pięter 200×200, więc pełny snapshot po każdym pomalowanym kaflu byłby kosztowny. Projekty z osadzonymi PNG szybko przekraczają praktyczny rozmiar `localStorage`.

## Decyzja

1. Runtime i Studio korzystają ze wspólnego `AssetResolver` oraz tego samego manifestu assetów.
2. Źródła repozytorium mogą wskazywać kontrolowane ścieżki `assets/...png`; build standalone zamienia je na zweryfikowane `data:image/png;base64,...`.
3. Build sprawdza SHA-256 pliku źródłowego, gdy manifest go deklaruje.
4. Walidator odrzuca zdalne URL-e, schematy wykonywalne, ścieżki absolutne, `..` oraz niezgodny rodzaj assetu.
5. Import PNG w Studio sprawdza typ, sygnaturę, rozmiar, wymiary i SHA-256, po czym wykonuje jedną atomową komendę.
6. Stroke mapy jest buforowany do `pointerup` i trafia do historii jako uporządkowana lista zmian `{index,before,after}`. Jedno przeciągnięcie oznacza jedno undo.
7. `CommandBus` wspiera zarówno historię pełnych snapshotów, jak i odwracalne komendy delta.
8. Recovery przechowuje ostatni projekt, a historia nazwanych checkpointów używa IndexedDB z fallbackiem pamięciowym w środowisku opaque-origin.
9. Preview i eksport standalone używają dokładnie tego samego zwalidowanego snapshotu `ProjectStore`.

## Konsekwencje

- Asset nie może wyglądać inaczej w Studio i w wydaniu standalone z powodu osobnych resolverów.
- Edycja dużych map nie mnoży pełnych kopii wszystkich pięter dla każdego kafla.
- PNG osadzone w projekcie są przenośne, ale nadal potrzebny jest przyszły pakiet plikowy/deduplikacja dla dużych bibliotek.
- IndexedDB jest magazynem roboczym Studia, a nie kanonicznym formatem wymiany projektu.
- Dowolny JavaScript i zdalne źródła nie stają się częścią definicji contentu.

## Weryfikacja

- testy RLE encode/decode i odwracania zmian;
- test `CommandBus` potwierdzający historię `delta`;
- testy bezpiecznych i niebezpiecznych źródeł assetów;
- test punktu startowego na walkowalnym kaflu;
- scenariusz Chromium: import PNG → preview → stroke delta → undo → content edit → checkpoint → standalone export.
