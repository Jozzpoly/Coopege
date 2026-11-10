# Owner session 10 XI 2026: naturalna twórczość w B01 → falsyfikator układu B02

**Status:** OWNER-OBSERVED (nagranie ekranu) / B02 LAB TECH PASS (izolowany Chromium) / OWNER UX B02 OPEN. **Nie** nowe wymaganie całego Jaskinia API, nie akceptacja gotowego Studia, nie źródłowy build Coopege PR #12. **Nie publikować prywatnego nagrania** ani jego kopii w repo; materiał źródłowy pozostał w rozmowie z Ownerem.

## 1. Najważniejszy Owner feedback
Po sprawdzeniu B01: „działa xD chujowe ale pokazuje że kolejna kropla drąży skałę”; nagranie, zdaniem Ownera, pokazuje bliskość dawnej ambicji do dzisiejszej, jej ówczesną niedojrzałość i możliwy reuse. To **Owner potwierdził działanie testowanej kopii HTML**, ale równocześnie wyraźnie uznał jej UX za słaby. Nie awansować słowa „działa” na OWNER ACCEPTED.

## 2. Obserwowane wideo (2m 39.7s; obraz 1658×850, bez użytecznej ścieżki mówionej)
Czasy orientacyjne, na podstawie wybranych pełnych klatek i przeglądu materiału:
- **0:10–0:30:** Asset Browser → mapa, panoramowanie/zmiana widoku, malowanie; nie tylko planowany test nawigacji.
- **0:30–0:55:** definicja Szkieleta → mapa (wskazanie spawnu w otoczeniu cmentarza) → definicja Szczura; spontaniczne przechodzenie między różnymi obiektami i miejscami.
- **0:55–1:20:** modyfikacje statystyk i kontrola grywalnego podglądu, powrót na mapę.
- **1:50–2:15:** w Content Browser rat zmienia nazwę na **„Szczurzyca, bo czemu nie xD”**, parametry HP oraz przypisanie assetu z `texture.legacy.monster.rat` na `texture.legacy.monster.dragon`.
- **2:20–2:40:** podgląd zielonego atlasu Smoka, przejście do runtime preview i obserwacja stworzenia z nową grafiką podczas rozgrywki.

**Granice obserwacji:** to zmiana przypisania istniejącej tekstury, NIE samodzielne narysowanie nowej; widoczna reakcja w grze NIE jest rzetelnym testem AI, balansu, rozgrywki ani jakości feel. Nagranie dotyczy zmodyfikowanego **Coopege Studio M7A/B01**, NIE bezpośrednio historycznego Tibia Developer Studio v3.1. Pokazuje dziedzictwo idei, nie identyczne działanie wszystkich generacji.

**Zakres:** w inspektorze Szczura jest **54 wystąpień/spawn definitions**. Edycja globalnej definicji (nazwa/HP/asset) może oddziaływać na wszystkie wystąpienia; nie wolno przedstawiać jej jako modyfikacji tylko jednego spawnu. Nie zakładać, że „54 wystąpienia” = dokładnie 54 żywe aktory (spawn count może różnić się od liczby instancji).

**Istotny sygnał ryzyka:** koniec filmu pokazuje `rev 12`, etykietę **„niezapisane”** i zsynchronizowane `runtime rev 13`. Nie widać osobnego eksportu projektu/gru w nagraniu. Udane preview nie jest dowodem trwałości zmiany po zamknięciu, odmiennym originie czy utracie lokalnego storage. Nie twierdzić, że praca faktycznie przepadła — brak takiego dowodu.

## 3. Co video potwierdza, a co obala

### OWNER-OBSERVED
- B01 pozwala już wykroczyć poza przygotowany przez agenta scenariusz; samodzielna zmiana nazwy, HP i wyglądu całego typu potwora, zobaczenie konsekwencji w grze w tej samej sesji.
- Historyczny projekt zawierał realną, wielodomenową intuicję authoringu (mapa, content, assety, żywa gra), ale UX pozostaje zakładkowy i kosztowny poznawczo.
- Dużą część nagrania użytkownik spędza na **przełączaniu całych zakładek** zamiast zachowywać kilka potrzebnych instrumentów w jednym układzie.

### Nieudowodnione / możliwe inne wyjaśnienia
- Nie mamy dowodu, że jednoczesne panele są lepsze w długich sesjach; mogą jedynie zmniejszyć każdy z widoków. Nie zamienić wizji Ownera „jedna sesja instrumentów” w zabetonowany CSS grid.
- Nie mamy dowodu, że większa liczba pól formularza zwiększy rzeczywistą swobodę; nowe gesty i edycja semantyki RPG nadal są ograniczone.
- Nie wiemy, które z przełączeń były kosztowne, a które naturalne. Wideo pokazuje zachowania, nie pomiar frustracji.
- Nie oglądaliśmy po filmie zapisanego i ponownie załadowanego autorskiego projektu; nie ogłaszać persistence PASS.
- Nie należy utożsamiać przypadkowej zabawnej modyfikacji z akceptacją mechaniki czy ekonomii całej gry.

## 4. B02 — niezależna, wyrzucalna kontrpróba warsztatu

Powstał osobny user-testable **B02 HTML** na bazie zachowanego M7A/B01, bez zmian w powłoce Jaskini i bez nowej domenowej ontologii. Laboratorium:
- pokazuje jednocześnie **mapę, Content Browser/Asset Browser i grywalne preview** w większej szerokości; węższy viewport dzieli mapę z jednym wybranym instrumentem;
- ma przeciągane granice podziału, przełącznik preview i powrót do oryginalnych zakładek;
- używa niezmienionego `ProjectStore`, `CommandBus`, `Asset Vault` i bridge do runtime; layout to zewnętrzny CSS/JS, NIE nowy silnik ani implementacja kontraktu Jaskini;
- nie ma gwarancji, że ukrycie `iframe` pauzuje symulację (w prototypie **nie pauzuje**). Wyraźna etykieta w UI;
- nie zastępuje docelowych regulowanych okien Jaskini, nie rozwiązuje pełnego NPC/quest authoringu i nie jest kwalifikowany do merge.

**Wykonane testy w izolowanym Chromium 1658×850** na rzeczywistym projekcie `coopege.silver_gate_legacy`:
- 3 równoczesne rzeczywiste panele przy `bridgeReady=true`, canvas ≈744×695;
- wybór `monster.legacy.rat` w Content, `Pokaż na mapie` → spawn na `floor.legacy.z_0 (88,52)`, bez zmiany rev;
- `Pokaż grafikę w bibliotece` → `texture.legacy.monster.rat`, bez zmiany rev;
- przeciągnięcie pionowego podziału zmieniło mapowy viewport ≈744→650 px;
- przełączenie preview ukrywa właściwy panel, powrót do tradycyjnych tabów pokazuje jeden właściwy panel;
- w innym e2e rat: nazwa → `Szczurzyca B02`, HP 25→29, asset rat→dragon; **3 transakcje ProjectStore, previewStudioRevision 3**, spawns 54 bez zmian, `dirty=niezapisane`; Undo asset wraca rat, runtime preview synchronizuje rev4;
- brak `pageerror` w tych próbach.
- przy 1024×768 prawa strefa przełącza Content / Runtime (nie próbuje zmieścić obu na 150 px wysokości), runtime iframe miał ≈509 px wysokości. Nie oznacza OWNER UX PASS.

**Granice B02:** Chromium test przez `page.set_content` (lokalne `file://` w tym środowisku jest blokowane polityką przeglądarki); właścicielski test otwierania B02 jako HTML w Operze **nie wykonany**. B02 jest rozmownym plikiem wynikowym, nie buildem TypeScript branch PR #12. Source branch wciąż nie przeszedł pełnego `npm run check` i `npm run test:browser`, których brak należy jawnie zachować jako blocker.

## 5. Jakie pytania naprawdę wynikały z tej sesji

1. **Persist first:** jak zapewnić, że spontaniczna twórcza zmiana faktycznie przetrwa restart, zmianę originu i eksport, z jawnie wskazaną wersją i bez nadpisania autorskich źródeł? To warto sprawdzić PRZED budową wielu kolejnych instrumentów.
2. **One subject, several instruments:** po wskazaniu szczura/Smoka na mapie, czy nowy warsztat może zachować ten sam obiekt w widoku assetu, zachowania i gry bez powtarzania selekcji i re-centrowania?
3. **Test at location:** czy z wybranego spawnu można otworzyć test runtime *przy tym miejscu*, zamiast szukać zmienionego efektu od standardowego startu postaci? Nie mutować przy tym autorskiego `playerStart`.
4. **Scope before change:** autor powinien widzieć, czy edytuje jedną instancję, grupę czy **wspólną definicję** przed zatwierdzeniem, nie dopiero z tekstu na dole formularza.
5. **Ergonomia:** czy naturalna praca 10–30 min w równoczesnych instrumentach B02 naprawdę jest lepsza niż historyczne zakładki, mimo mniejszych paneli? Sam wide screenshot nie daje odpowiedzi.
6. **Gra pozostaje grą:** po krótkiej sesji twórczej trzeba móc naprawdę zagrać, a nie tylko oglądać poprawiony podgląd techniczny.

## 6. Dalsze działanie

- **Bez dalszego rozrostu B02 przez rozpęd.** Oddać Ownerowi działający HTML i uzyskać feedback, jak układałby mapę, potwora, asset i grę. Nie kopiować eksperymentalnego CSS do Jaskini.
- **Source gate PR #12:** pełny TypeScript/Node/Chromium i naprawy po testach; obecne przejścia w przetworzonym M7 donorze nie są testem branchu.
- **Persistence risk:** osobna próba eksport → zimne otwarcie → wznowienie edycji po restarcie, na zwykłym originie, z kontrolą utraty danych.
- **Następny znaczący feature, jeśli doświadczenie go obroni:** wywołanie testu gry w wybranym miejscu i zachowanie tożsamości wybranego obiektu w panelach. Nie domniemana uniwersalna kompozycja dla Feniksa i całej Jaskini.
- **Donor Opus/Astra:** trzy konkretne potrzeby do zbadania (wielowidokowa sesja na jednym autorskim dokumencie; przewidywalne przeżywanie/ukrywanie runtime; trwałość pracy niezależna od widoku). Bez narzucania klas, frameworka lub API.

**Wynik netto:** najważniejszym dowodem jest pierwszy spontaniczny loop Ownera: *przekształciłem coś własnego → zobaczyłem to w działającym świecie*. B02 jest kontrolowaną hipotezą ergonomiczną, nie nową definicją jego marzenia.
