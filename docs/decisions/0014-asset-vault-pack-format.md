# ADR-0014 — Asset Vault i niezależny Asset Pack v1

- Status: **zaakceptowany**
- Data: **2026-06-13**
- Milestone: **M7A**

## Kontekst

Właściciel chce szybko zastępować 45 placeholderów legacy własnymi teksturami. Osadzenie PNG w standalone HTML jest dobre dla dystrybucji, ale sam HTML nie może być kanonicznym magazynem ani wygodnym formatem wymiany grafik.

## Decyzja

Wprowadzamy niezależny format `coopege-asset-pack` schema v1 w ZIP.

Paczka zawiera:

- `manifest.json`;
- `contact-sheet.html`;
- `README.txt`;
- `textures/<assetId>.png`.

Każdy wpis manifestu przechowuje:

- stabilne asset ID;
- kategorię;
- status `legacy-placeholder` albo `custom`;
- bezpieczną ścieżkę pliku;
- wymiary;
- SHA-256;
- źródło bazowe.

Studio wspiera:

- podmianę pojedynczego PNG;
- import wielu PNG po pełnym asset ID albo oryginalnej nazwie legacy;
- import Asset Pack ZIP;
- eksport aktualnego projektu jako Asset Pack ZIP;
- jedną atomową komendę undo/redo dla całej paczki.

Importer odrzuca traversal ścieżek, duplikaty, nieznane ID, zaszyfrowane ZIP-y, nieobsługiwaną kompresję, błędne CRC-32, zły podpis PNG, wymiary poza 1–4096 px, pliki powyżej 4 MB i niezgodne SHA-256 z manifestem.

## Konsekwencje pozytywne

- Tekstury można edytować poza HTML i ponownie importować hurtowo.
- Paczka jest przenośna i niezależna od bieżącego builda runtime.
- Contact sheet daje szybki wizualny katalog placeholderów.
- Zmodyfikowane PNG nadal trafiają do JSON i standalone HTML.
- Operacja wielu plików jest odwracalna jednym undo.

## Koszty i ograniczenia

- Format v1 obejmuje wyłącznie tekstury PNG; audio i inne dane pozostają poza zakresem.
- Contact sheet jest samodzielnym HTML-em, nie rasterem PNG.
- ZIP64, archiwa wieloczęściowe i szyfrowane nie są wspierane.
- Import standardowego deflate wymaga `DecompressionStream`; własny eksport Studio używa kompatybilnego store ZIP.

## Weryfikacja

- 5 dedykowanych testów Node: PNG, ZIP/CRC/path safety, batch mapping i manifest/SHA;
- Chromium: eksport 45 assetów, status placeholder/custom, batch import dwóch PNG jako jedna komenda, undo całej paczki i standalone z custom PNG;
- zewnętrzny `unzip -t` potwierdza integralność oficjalnego ZIP-a.
