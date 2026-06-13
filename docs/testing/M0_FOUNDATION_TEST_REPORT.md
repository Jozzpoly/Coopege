# Coopege M0 — raport testów pierwszego pakietu fundamentu

Data: 2026-06-12

## Wynik

- Czysta instalacja `npm ci`: PASS
- TypeScript strict typecheck: PASS
- Testy Node: 9/9 PASS
- Build runtime foundation: PASS
- Build Studio foundation: PASS
- Integralność otrzymanego archiwum legacy: PASS
- Audyt deklarowanego baseline runtime: MATCH
- Audyt deklarowanego baseline Studio: MISMATCH — jawna blokada M0
- Chromium smoke test runtime: PASS, brak błędów strony
- Chromium smoke test Studio: PASS, brak błędów strony

## Pokryte scenariusze

1. Poprawny fixture schema v1 jest akceptowany.
2. Nieznany potwór w spawnie jest odrzucany z dokładną ścieżką danych.
3. Nieprawidłowa długość RLE jest wykrywana.
4. Deterministyczna serializacja nie zależy od kolejności kluczy.
5. RNG powtarza strumień dla tego samego seeda.
6. Fixed clock daje identyczną liczbę ticków przy różnym podziale render frames.
7. Koperta protokołu odrzuca błędną wersję i zbyt krótki nonce.
8. Manifest otrzymanych legacy artefaktów zgadza się z plikami.
9. Verifier wykrywa celową mutację pliku legacy.

## Nierozwiązana rozbieżność

Deklarowany baseline Studia:

- 102846 B
- `b512be2b139862392853b0689cef9c42304b7e869944471a53b150edafff6adb`

Faktycznie otrzymany plik:

- 102849 B
- `1364ee817bcbb73c0403d0d9e6006a7a63e324642b892560b15edc2288a12c47`

Nie zmieniono sumy „na wygodniejszą”. Obie wartości są przechowywane osobno, a audyt kończy się kodem błędu do czasu świadomego rozstrzygnięcia.
