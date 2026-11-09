# Ambitne Studio vs antyprzykład F2 — audyt realnego authoringu (9 XI 2026)

**Owner correction (9 XI, ok. 22:26 PL):** październikowy mini-edytor Coopege F2 jest **ogólnym antyprzykładem**; historyczne Studio było rzeczywiście ambitne. Jego szeroki duch powinien powrócić w dojrzalszym warsztacie na bazie lub w Jaskini. Nie należy porównywać narzędzi tylko po bezpośredniości interakcji, liczbie testów ani tym, czy dają się osadzić w native windows.

**Uwaga do PR #11:** `terrain vs relations` to wyłącznie **jedna kontrpróba semantyczna**. Nie jest propozycją redukcji przyszłego Studio do przesuwania fragmentów mapy. Coopege pozostaje przede wszystkim samodzielną grą RPG, a Opus/Astra równolegle prowadzą fundament Jaskini.

## Trzy historyczne poziomy, nie jedno „stare/nowe”

| Egzemplarz | Główna wartość | Zweryfikowana granica |
|---|---|---|
| `legacy/reference/Tibia_Developer_Studio_v3_1.html` + `Tibia_Enhanced_v14_1_DevAPI.html` | **Szeroki warsztat gry:** mapa 5 pięter, brush/line/rect/fill/picker, obiekty, spawny, NPC, przejścia, content (potwory, klasy, skille, questy), assety i animacje, walidacja, checkpointy, gra, standalone build | Łączy się z załadowanym HTML gry; klasyczny tabbed/fixed 3-column UI, drobna typografia, częściowy edytor formularzy wymieszany z raw JSON, brak semantycznego group authoringu |
| `apps/studio/...` M3–M7 Coopege | Project-first, wspólna walidacja, historyczne delty undo, 45 PNG Asset Vault, transakcje, preview/build ze snapshotu | M3 świadomie obsługiwał classes/abilities/monsters/spawns, nie pełne NPC/quests/regions/prefabs; M7 dodał odtwarzane transitions, ale CRUD nadal był zadłużony. **Nie mylić poprawy infrastruktury z zachowaniem szerokości twórczej** |
| Październikowe F2 + listopadowe C1–C3 | F2: edycja na realnym działającym świecie; C3: użycie prawdziwego native compositor Jaskini | **Owner UX FAIL / antyprzykład.** Skromne malowanie nie jest kontynuacją szerokiego Studia; działające okna i protokół nie dowodzą używalności pracowni |

## Realne testy w izolowanym Chromium, 9 XI

Źródła z repo: `legacy/reference/Tibia_Developer_Studio_v3_1.html` (102849 B, SHA256 `1364ee817bcbb73c0403d0d9e6006a7a63e324642b892560b15edc2288a12c47`) oraz `legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html` (338570 B, SHA256 `cd7d0d7527847ebd3f4ddb2c5a8c18d292517815c4989b8f4bd40b0fc5ce900c`). Pierwszy plik był kopią z Library, zweryfikowaną z repo; drugi ma hash zgodny z golden manifest.

Playwright/Python z lokalnym Chromium i `page.set_content` (środowisko blokuje nawigację `http://127.0.0.1`). Załadowano grę przez standardowy `#gameFile` i interfejs. Instrumentacja testowa ujawniła wewnętrzny stan `S` do *odczytu oczekiwanego wyniku*; oryginalny source nie był modyfikowany.

**Sprawdzone:**
1. Start Studia i połączenie z prawdziwym `TibiaMapAPI v4`, `TibiaContentAPI v1` oraz `TibiaProjectAPI`. Gra i Studio odczytały 5 pięter, 45 assetów; na powierzchni widok pokazał 133 edytowalne obiekty (stan filtrów zrzutu).
2. Normalna mapa: przez paletę i kliknięcie w canvas `(118,95)` zmieniono terrain `0 → 2`; Undo `2 → 0`, Redo `0 → 2`, Undo `2 → 0`. Bez wyjątków JS.
3. **Map → runtime → standalone → cold run:** ten sam tile `(118,95)` zmieniono `0 → 2`, UI `Zastosuj mapę w grze` odpowiedział akceptacją; wyeksportowano HTML, otwarto w świeżym izolowanym dokumencie; jego rzeczywiste `TibiaMapAPI.exportWorld()` potwierdziło tile `2`.
4. **Monster → runtime → standalone → cold run:** przez widoczny formularz zmieniono HP Szczura `25 → 42`, zastosowano content w grze, eksportowano HTML, otwarto w nowym dokumencie; `TibiaContentAPI.exportPackage().monsters.rat.hp===42`.
5. **NPC → mapa → Undo:** wskazano na liście `Kupiec` przy `(84,83)`, kliknięto `Przenieś`, nowe miejsce `(112,92)`, po Undo wrócił dokładnie na `(84,83)`.
6. Obraz mapy i paneli został sprawdzony w 1540×950: rzeczywista panorama Srebrnej Bramy z terenami, wejściami i obiektami, rozbudowana paleta, narzędzia i operacje projektu. To ambitna, ale sztywna stara pracownia, nie wyznacznik finalnego UX.

**Wciąż nieudowodnione:** rzeczywisty Owner UX, długie wielogodzinne authoring sessions, trwałość zapisów na normalnym originie Opery, testy wszystkich wariantów łączenia/dołączania świata, płynne przejście z multiple native windows, mobilny authoring. Konsola zanotowała ostrzeżenie lokalStorage przy `about:srcdoc` w jednej próbie; nie wpływało na opisane in-memory i cold-build testy, ale bez normal-origin browser test nie wolno ogłaszać trwałości. Nie ma nowego „gotowego Studio”.

## Trzy kluczowe wnioski

**(A) Ambicja wyprzedziła architekturę, potem infrastruktura wyprzedziła ambicję.** Historyczne v3.1 mogło zmieniać NPC, quests, mapy, assety i statystyki w tym samym obiegu. M3 zaproponował czystszy, projektowy model, lecz nie objął całego tego authoringu (jego raport sam wylicza wyjątki). Następne F2 odzyskało kontakt z żywą grą kosztem szerokości warsztatu. Mierząc rozwój wyłącznie „nowocześniejszym kodem” łatwo przeoczyć tę regresję doświadczenia.

**(B) „Na bazie Jaskini” powinno oznaczać odziedziczenie sprawczości gospodarowania przestrzenią i zasobami, a nie kopię 6 tabów w iframe.** Jaskinia v6.4.1 ma native windows i publiczne `window.Jaskinia.ext.type/open`, materiały i adresy. Obecny publiczny kontrakt NIE ma pełnego tworzenia kompozycji kilku okien, zarządzania ich relacjami i życia świata w tle (co pokazują niezależnie C3/Combat/Companion). To temat dla Opusów/Astry, nie przypadkowy patch w tej gałęzi.

**(C) Właściwy, niewykonany jeszcze eksperyment:** przyjąć całą szerokość historycznego Studia jako listę reprezentatywnych czynności, a następnie sprawdzić kilka **nieprzygotowanych zadań autora** w elastycznym stanowisku Jaskini. Na przykład: zmiana grafiki potwora + jego zdolności + położenia w świecie + wynik w grywalnym runtime, a potem zmiana wcześniejszej decyzji po powrocie. To nie znaczy „naraz implementować wszystkie edytory” ani „ustalać jedną uniwersalną ontologię superorganizmu”.

## Kontynuacja własnej linii, bez konkurencji z Opusami

- Nie implementować kolejnej uproszczonej F2/kafelkowej nakładki. Stare v3.1 oraz M3–M7 są donorami **zdolności**, nie źródłem gotowego finalnego UI/architektury.
- Coopege jako gra wciąż nie ma Owner-approved przewagi gameplay nad Tibią v14.1; badania edytora nie mogą zastąpić grywalnego Coopege.
- PR #11 pozostaje odizolowany; jego relokacja regionu to jeden test zakresu znaczenia, nie centralny feature przyszłego Studio.
- Wspólna pętla warsztatu ma umożliwiać ręczne tworzenie bez AI, używanie oryginalnego własnego świata, niezależną rewizję i powrót do twórczej pracy, ale zachowanie konkretnego UI zależy od realnego Owner feedback.

**Pochodzenie:** niezależny audyt i izolowane wykonanie 9 XI, w odpowiedzi na jawny Owner feedback. Wszelkie wymienione PASS dotyczą tylko wskazanych operacji i dokładnych starych buildów. Nie zmieniano starej, nowej Jaskini ani kanonicznego Coopege.
