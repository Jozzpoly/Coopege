# ADR-0007 — operacyjny baseline otrzymanych artefaktów legacy

- Status: **zaakceptowany**
- Data: **2026-06-12**

## Kontekst

Deklarowany wcześniej SHA-256 legacy runtime zgadza się z otrzymanym plikiem. Otrzymane `Tibia_Developer_Studio_v3_1.html` różni się jednak o 3 bajty i ma inny SHA-256 niż wartość zapisana w starszym raporcie oraz pamięci projektu.

Nie dysponujemy plikiem Studia o deklarowanym skrócie. Wstrzymywanie całego nowego toolchainu nie zwiększa bezpieczeństwa migracji, pod warunkiem że nie przypiszemy otrzymanemu plikowi cudzych wyników testów.

## Decyzja

1. Faktycznie otrzymane i zarchiwizowane bajty stanowią **operacyjny baseline wejścia migracyjnego**.
2. `received-manifest.json` jest normatywny dla integralności archiwum w tym repozytorium.
3. `declared-baseline.json` pozostaje historyczną deklaracją i nie jest nadpisywany.
4. Raport legacy 15/15 nie jest automatycznie uznawany za dowód dotyczący otrzymanego Studia o innym skrócie.
5. Jeżeli później pojawi się plik o deklarowanym skrócie, zostanie dodany jako osobny artefakt i porównany bez podmieniania obecnego archiwum.

## Konsekwencje

- M0 może zostać zamknięte bez ukrywania rozbieżności pochodzenia.
- Każdy build i migrator nadal sprawdzają integralność faktycznie otrzymanych plików.
- Nie twierdzimy, że otrzymane Studio przeszło dokładnie testy ze starszego raportu.
