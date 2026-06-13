# M6 — Ability Composer: raport testów

Data: **2026-06-13**  
Workspace: **`coopege@0.6.0-m6`**

## Zakres

M6 dodało wizualny authoring istniejącego gameplay language bez zmiany schematu projektu i bez drugiego formatu grafów.

### Dostarczone elementy

- współdzielony katalog 15 prymitywów Conditions / Target Queries / Actions / Effects;
- metadane parametrów jako źródło walidacji oraz generowania inspektora;
- graph canvas z węzłami, krawędziami true/false/next i oznaczaniem błędów;
- tworzenie od zera ability damage i heal;
- dodawanie, konfigurowanie, łączenie, zmiana ID i usuwanie węzłów;
- stabilne ID nowych grafów, abilities, bindingów i węzłów;
- bezpieczne duplikowanie i usuwanie grafów;
- kontrola referencji ability/binding/trigger;
- test planu dla P1/P2 przez sandbox runtime;
- execution trace i planned operations z prawdziwego interpretera;
- undo/redo, preview i standalone export z jednego snapshotu.

## Wyniki

### TypeScript i Node

- strict TypeScript: **PASS**;
- testy Node: **57/57 PASS**;
- pominięte: **0**;
- niezaliczone: **0**.

Nowe testy obejmują:

- pełne pokrycie katalogu prymitywów runtime przez metadane Studia;
- plan tego samego grafu dla P1 i P2 bez mutowania świata;
- zachowanie `ownerPlayerId` dla obu graczy;
- odrzucenie węzła `script` i wykonywalnego kodu;
- walidację nowych wiadomości `gameplay.test` i `gameplay.test-result`.

### Migracja

- golden migration artifacts: **51/51 PASS**;
- chroniony fixture v1 nie został zmieniony.

### Chromium

- regresja M0–M5: **8/8 PASS**;
- scenariusz M6 Ability Composer: **1/1 PASS**;
- łącznie: **9/9 PASS**.

Scenariusz M6 sprawdza:

1. bootstrap Studia i handshake z preview;
2. utworzenie ability heal bez edycji JSON;
3. synchronizację nowego grafu z runtime;
4. trace i planned operation `effect.heal-fixed` dla P1;
5. ten sam trace dla P2 z innym ownershipem;
6. zmianę parametru `amount`;
7. undo i redo parametru;
8. atomowe odrzucenie cyklu bez zmiany rewizji i checksumu;
9. duplikowanie i usuwanie nieużywanej kopii;
10. blokadę usunięcia grafu wskazywanego przez ability i binding;
11. zachowanie grafu w wyeksportowanym standalone HTML.

## Uczciwe ograniczenia

- pozycje węzłów są układane automatycznie i nie są częścią projektu;
- test grafu jest plan-only i nie zmienia HP ani cooldownów preview;
- edytor domen AI, itemów, talentów, questów i map triggerów powstanie później na tym samym komponencie;
- pełny runtime nadal aktywuje jeden spawn treningowy zamiast 338 authored spawnów.
