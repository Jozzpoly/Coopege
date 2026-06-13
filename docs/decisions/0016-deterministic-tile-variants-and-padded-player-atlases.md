# ADR-0016 - deterministyczne warianty kafli i atlasy postaci z marginesem

- Status: accepted
- Data: 2026-06-13

## Kontekst

Owner playtest wykazal dwa bledy interpretacji assetow legacy. Arkusze terenu zawieraja glownie warianty wygladu, a nie klatki animacji. Wyjatkami sa woda i lawa. Proceduralne arkusze postaci byly natomiast generowane w ramkach 48x56, mimo ze bron i stopy wychodzily poza te granice, przez co gotowe PNG byly fizycznie przyciete.

## Decyzja

1. `TextureFrameLayout.frameMode` jawnie rozroznia `variant` i `animation`.
2. Kafel w trybie `variant` wybiera klatke deterministycznie z seeda projektu oraz wspolrzednych mapy. Czas renderowania nie zmienia wyboru.
3. Migracja legacy oznacza jako animowane tylko wode i lawe. Pozostale arkusze terenu sa wariantami.
4. Atlasy graczy sa regenerowane przez oryginalny renderer legacy do ramek 80x80. Pivot i rozmiar swiata kompensuja dodatkowy przezroczysty margines, wiec skala oraz punkt stop pozostaja bez zmian.
5. Chroniony plik HTML legacy nie jest modyfikowany. Narzedzie ekstrakcji wstrzykuje most renderera tylko do kopii dokumentu ladowanej w Chromium.

## Konsekwencje

- warianty terenu sa stabilne pomiedzy klatkami i powtarzalne dla tego samego projektu;
- woda i lawa zachowuja animacje;
- bron oraz stopy graczy mieszcza sie w klatkach we wszystkich kierunkach;
- Studio pokazuje, czy layout jest animacja, czy zestawem wariantow;
- walidator odrzuca nieznany `frameMode`;
- migracja, golden manifest i testy layoutu sa normatywnym dowodem tej decyzji.
