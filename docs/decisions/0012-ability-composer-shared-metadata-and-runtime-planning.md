# ADR-0012 — Ability Composer, wspólne metadane prymitywów i testowe planowanie runtime

- Status: **zaakceptowane**
- Data: **2026-06-13**

## Kontekst

Po M5 runtime potrafił wykonywać bezpieczne grafy gameplayu, ale Studio nie miało wizualnego authoringu. Zbudowanie osobnego modelu grafu albo lokalnego symulatora Studia stworzyłoby drugi standard zachowania i ryzyko rozjazdu z co-opowym `GameWorld`.

## Decyzja

1. Ability Composer edytuje bezpośrednio `gameplay.graphs` projektu schema v2.
2. Runtime, walidator i Studio korzystają z jednego katalogu `CORE_GAMEPLAY_PRIMITIVE_CATALOG`.
3. Katalog opisuje typ, nazwę, przeznaczenie, parametry, wartości domyślne i zakresy prymitywu.
4. Walidator parametrów jest generowany z tego katalogu; UI nie utrzymuje osobnej kopii reguł.
5. Canvas v1 używa automatycznego układu. Pozycje nie są zapisywane w danych gameplayu i nie wpływają na checksum ani wykonanie.
6. Każda operacja grafowa przechodzi przez `CommandBus` i pełną walidację projektu.
7. Niepoprawna krawędź, cykl, ID lub parametr nie zmienia `ProjectStore`, historii ani aktywnego preview.
8. Test P1/P2 jest wiadomością wersjonowanego mostu. Runtime zwraca prawdziwy `GameplayPlanResult` z trace i planned operations, ale nie zatwierdza operacji i nie mutuje świata.
9. Preview Studia uruchamia dwóch graczy, aby oba konteksty ownershipu były testowalne bez emulowania drugiego interpretera.
10. Usunięcie grafu jest dozwolone wyłącznie, gdy nie wskazuje na niego ability, binding ani trigger.

## Konsekwencje

### Pozytywne

- jeden zestaw reguł parametrów dla runtime, walidacji i UI;
- możliwość tworzenia damage/heal bez JSON-u;
- trace pochodzi z prawdziwego interpretera i prawdziwego `GameWorld`;
- P1 i P2 różnią się contextem, nie kodem wykonawczym;
- authoring pozostaje bezpieczny i deterministyczny;
- standalone export przenosi te same grafy co preview.

### Ograniczenia

- układ węzłów jest automatyczny i nie ma jeszcze przeciągania;
- language v1 pozostaje acykliczny;
- test planuje operacje, lecz celowo ich nie zatwierdza;
- Composer nie jest jeszcze edytorem AI, questów ani map triggerów, choć używają tego samego formatu;
- przypisywanie nowej ability do klasy pozostaje osobną operacją contentową.
