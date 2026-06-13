# ADR-0011 — bezpieczny język gameplayu i dwufazowe operacje

- Status: zaakceptowane
- Data: 2026-06-13
- Kamień milowy: M5

## Kontekst

Po M4 lokalny coop działał w jednym `GameWorld`, lecz podstawowy atak, część nagród, quest credit oraz przyszłe mechaniki przedmiotów, talentów, AI i mapy nadal groziły rozrostem w postaci osobnych warunków i executorów. Taki kierunek ponownie połączyłby content z kodem silnika, utrudnił deterministyczność dwóch graczy i zablokował bezpieczne edytory grafowe.

Coopege potrzebuje wspólnego języka zachowań, który:

- działa identycznie dla wszystkich graczy i jawnie zachowuje ownership;
- może być tworzony przez Studio bez wykonywania dowolnego JavaScriptu;
- jest walidowany przed uruchomieniem;
- daje deterministyczny plan operacji przed mutacją świata;
- obsługuje kilka domen gameplayu tym samym zestawem prymitywów;
- pozostawia silnikowi kontrolę nad faktycznym zatwierdzeniem zmian.

## Decyzja

1. **Projekt Coopege przechodzi z schema v1 do schema v2.** Schema v2 dodaje sekcję `gameplay` oraz `graphId` umiejętności. Loader wykonuje jawną, deterministyczną migrację v1→v2; pliki v1 pozostają obsługiwanymi fixture’ami regresyjnymi.
2. **Gameplay language v1 jest deklaratywny i nie wykonuje kodu z projektu.** Definicja projektu może wskazywać wyłącznie zarejestrowane ID prymitywów. `eval`, `Function`, moduły z projektu i dowolny JavaScript są zabronione.
3. **Język używa pięciu typów węzłów:** `condition`, `target-query`, `action`, `effect`, `end`.
4. **Prymitywy są dostarczane przez typowane rejestry silnika.** Rejestry osobno przechowują Conditions, Target Queries, Actions i Effects. Nieznane ID powoduje błąd walidacji, a nie ciche pominięcie.
5. **Wykonanie jest dwufazowe.** Interpreter najpierw tworzy deterministyczny `GameplayOperation[]` oraz trace. `GameWorld` prewaliduje plan, a dopiero potem zatwierdza obsługiwane operacje.
6. **Kontekst wykonania zawsze przenosi ownership:** `sourceEntityId`, `ownerPlayerId`, `abilityId`, opcjonalny `providedTargetEntityId`, domenę, entry point i tick.
7. **Wybór celów jest deterministyczny.** Wyniki query są deduplikowane i sortowane po stabilnym ID. Runtime może używać pozycji, facing, threat i dostarczonego targetu, ale nie globalnego gracza.
8. **Gameplay language v1 jest acykliczny.** Walidator odrzuca cykle. Interpreter dodatkowo ma ochronę runtime przed ponownym odwiedzeniem węzła.
9. **Każde wykonanie ma budżet 1..256 kroków.** Domyślny projekt używa budżetu 64. Przekroczenie budżetu kończy plan bez commitowania operacji.
10. **Triggery zdarzeń są data-driven.** Obsługiwane eventy v1: `ability.used`, `damage.applied`, `actor.died`, `actor.respawned`, `player.joined`, `player.left`, `party.floor_changed`. Runtime blokuje rekurencyjne ponowne wejście tego samego triggera w ramach aktywnego eventu.
11. **Wspólne domeny v1:** `ability`, `item-effect`, `talent-modifier`, `ai-action`, `quest-reaction`, `map-trigger`.
12. **Integracja M5 jest celowo stopniowa.** Podstawowy atak gracza i potwora oraz questowy kill credit działają już przez grafy. Pozostałe domeny mają zwalidowane bindingi i przechodzą ten sam interpreter w testach, lecz ich pełne modele przedmiotów, talentów i mapowych triggerów powstaną w następnych etapach.
13. **Błędy wykonania są jawne.** Runtime emituje `gameplay.execution_failed` z kodem, grafem i węzłem; nie wolno udawać sukcesu ani częściowo wykonywać niezaplanowanej ścieżki.

## Konsekwencje

- Ability Composer, graf AI, talenty, item effects, quest reactions i map triggers mogą korzystać ze wspólnego modelu zamiast sześciu niezależnych mini-silników.
- Coop nie wymaga specjalnych grafów dla P1 i P2; różnica wynika z kontekstu ownershipu i wybranych encji.
- Dodanie nowego zachowania wymaga kontrolowanego prymitywu silnika, jego walidacji i testów. To świadome ograniczenie bezpieczeństwa i deterministyczności.
- Projekt schema v2 jest bieżącym formatem authoringowym. Runtime nadal przyjmuje schema v1 wyłącznie przez jawną migrację.
- Obecny commit jest atomowy względem błędów danych, ponieważ cały plan jest prewalidowany. Nie ma jeszcze ogólnego dziennika rollback dla nieoczekiwanego wyjątku programistycznego podczas commitowania; wraz z rozrostem operacji należy wprowadzić uogólniony mutation journal.
- Cykle, timery grafowe, równoległe gałęzie i podgrafy nie należą do gameplay language v1. Ich dodanie wymaga nowej wersji języka lub jawnie kompatybilnego rozszerzenia.

## Weryfikacja

- deterministyczna migracja projektu v1→v2;
- walidacja wszystkich grafów, referencji, parametrów, domen i eventów;
- odrzucenie nieznanego prymitywu, złego typu parametru i cyklu;
- odrzucenie wadliwego snapshotu przez `AtomicProjectHost` bez zmiany rewizji i checksumy;
- zatrzymanie przed commit po przekroczeniu budżetu;
- wykonanie sześciu domen przez wspólne rejestry z zachowaniem `ownerPlayerId`;
- data-driven trigger `actor.died` naliczający quest credit tylko dla potwora;
- scenariusz Chromium dwóch graczy: atak grafowy, trigger questa i zero błędów wykonania;
- zachowanie całej regresji M0–M4.
