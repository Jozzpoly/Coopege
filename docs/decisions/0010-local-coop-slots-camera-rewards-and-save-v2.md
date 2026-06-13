# ADR-0010 — lokalny coop: sloty wejścia, wspólna kamera, nagrody i save v2

- Status: zaakceptowane
- Data: 2026-06-12
- Kamień milowy: M4

## Kontekst

Coopege ma obsługiwać lokalny coop bez powrotu do architektury opartej na globalnym graczu ani kopiowania systemów jako „P2”. Ruch, walka, AI, kamera, nagrody, zapis i replay muszą działać dla kolekcji graczy zarządzanej przez jeden `GameWorld`. Jednocześnie pierwsza wersja ma pozostać prosta do testowania na jednym komputerze.

## Decyzja

1. **Jeden świat i jedna implementacja gracza.** `GameWorld` przechowuje kolekcję graczy, a każdy `PlayerActor` powstaje przez wspólną fabrykę. Nie istnieje osobny typ ani skopiowany update dla drugiego gracza.
2. **Stabilne tożsamości są rozdzielone.** `playerId`, runtime `entityId`, `classId` i `slotId` pełnią różne role i nie mogą być wzajemnie wyprowadzane.
3. **Urządzenia są mapowane przez logiczne sloty.** Początkowo:
   - P1: `slot.keyboard-mouse.1` — klawiatura i mysz;
   - P2: `slot.gamepad.1` — pierwszy gamepad;
   - testy przeglądarkowe mogą podać wirtualne komendy do tego samego slotu bez zmiany gameplayu.
4. **Join/leave nie rekonstruuje świata.** Dołączenie lub opuszczenie P2 nie resetuje stanu, encji ani pozycji P1.
5. **Wspólna kamera obejmuje wszystkich żywych graczy na aktywnym piętrze.** Kadrowanie używa bounding boxu, marginesu 4 kafli i dynamicznego rozmiaru kafla ograniczonego przez renderer.
6. **Tether jest jawny i testowalny.** Domyślna granica miękka wynosi 10 kafli, a twarda 14 kafli. Po przekroczeniu miękkiej granicy gracze są łagodnie zbliżani; twardej granicy nie wolno przekroczyć po korekcie.
7. **AI wybiera cel z threat wielu graczy.** Obrażenia zwiększają threat według jawnego `ownerPlayerId`; nie wolno używać globalnego gracza jako celu domyślnego.
8. **Friendly fire pozostaje wyłączony w M4.** Podstawowa akcja gracza wybiera potwory, nie innych graczy.
9. **Nagrody po zabiciu potwora:**
   - uprawnieni są gracze na tym samym piętrze w promieniu 12 kafli oraz zawsze killer;
   - całkowite XP = `round(maxHp × 1.2)`, minimum 1;
   - całkowite złoto = `round(maxHp ÷ 8)`, minimum 1;
   - XP i złoto są dzielone całkowitoliczbowo między uprawnionych; reszta trafia najpierw do killera, potem według stabilnego `playerId`;
   - tymczasowy token lootu otrzymuje killer, a przy jego braku pierwszy stabilnie uporządkowany gracz;
   - kill credit questa jest wspólnym postępem drużyny;
   - właściwy system przedmiotów zastąpi licznik tokenów w późniejszym kamieniu milowym.
10. **Zmiana piętra jest drużynowa.** `transitionParty` przenosi wszystkich graczy, resetuje target/threat potworów i zapisuje nowe aktywne piętro. M4 udostępnia API; authored links zostaną podłączone później.
11. **Save-game ma schema v2.** Zapisuje wielu graczy, sloty, nagrody, threat, aktywne piętro i stany RNG. Loader jawnie migruje save v1 do v2; checksum obejmuje stan wieloosobowy.
12. **Replay pozostaje wejściowy i deterministyczny.** `InputFrame` zawiera komendy przypisane do `playerId`; zmiana render FPS nie wpływa na wynik symulacji.

## Konsekwencje

- Rozszerzenie na kolejne gamepady nie wymaga kolejnych klas gracza, lecz nowych przypisań slotów i polityki kamery/tethera.
- Przyszły multiplayer sieciowy nadal nie jest obiecany, ale gameplay nie zależy od fizycznych urządzeń ani singletonu gracza.
- Reguły nagród są prowizoryczne balansowo, ale jawne, deterministyczne i możliwe do migracji.
- Automatyczne testy używają wirtualnego źródła wejścia. Ręczny test na fizycznym kontrolerze pozostaje osobną bramką użytkową.
- Downed/revive, wybór postaci P2, właściwy loot i authored przejścia nie należą do M4.

## Weryfikacja

- stabilne ID dwóch graczy i slotów;
- niezależne komendy w jednym `InputFrame`;
- join/leave bez resetu P1;
- threat i target AI dla wielu graczy;
- jawna własność obrażeń oraz deterministyczny podział nagród;
- miękki i twardy tether;
- wspólna kamera;
- save v2, migracja v1→v2 i identyczny checksum po load;
- drużynowa zmiana piętra;
- deterministyczny dwuosobowy replay przy różnych częstotliwościach renderowania;
- scenariusze Chromium z wirtualnym P2.
