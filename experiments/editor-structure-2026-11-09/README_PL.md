# Coopege · R&D: przenoszenie fragmentu rzeczywistej Srebrnej Bramy (9 XI 2026)

**STATUS: eksperyment źródłowy i kontrpróba, NIE nowy edytor, NIE działająca gra, NIE Studio do zaakceptowania przez Ownera.** Żaden plik produkcyjnej mapy nie jest zapisywany. Bez zmian w Coopege `main`, Jaskini, Feniks Studio, zapisach gry i assetach użytkownika.

## Pytanie

Autor zaznacza fragment miasta i przenosi go o kilkanaście pól. Co naprawdę znaczy „przenieś miejsce”, skoro teren, schody, powroty między piętrami, punkty startowe i spawn potwora mogą mieć odrębną tożsamość? Który wariant umożliwia dalszą twórczość bez iluzji poprawności?

**Krytyczna przestroga:** historyczne M3–M7 Coopege Studio JUŻ MA prawdziwy map-editor (`apps/studio/src/map-editor.ts`): pędzel, gumka, pipeta, przeciąganie, scroll zoom, start, spawny i cofaniące całe stroke komendy. Nie należy ignorować tego dawcy ani traktować C1–C3 jako jedynych dotychczasowych prób edycji.

## Dwa warianty na tej samej, autentycznej mapie

1. `terrain`: bierze tylko kafle z obszaru, umieszcza w nowym miejscu, stare wypełnia jawnym typem `tile.legacy.0`. Schody mogą wyglądać poprawnie, lecz ich logiczne anchory pozostają tam, gdzie były.
2. `relations`: robi to samo i dodatkowo przenosi start gracza, spawny oraz źródła przejść, naprawiając ich **konkretne powrotne counterpart links** na innych piętrach. Nie udaje jednak, że umie przenieść całą semantykę lokacji.

Są to in-memory zmiany na klonie migracyjnego `coopege.project.json` v14.1 (5 pięter × 200×200), z **wyłącznie lokalnymi wynikami**. Brak `writeFile`, HTTP, deploy, storage, migracji, opcji „zaakceptuj”.

## Konkretne przypadki

- **Kanały miasta:** fragment 75,86 o rozmiarze 10×10 → +16,+14; ruch terrain zostawia stary anchor kanałów, relations przenosi go i naprawia docelową pozycję połączenia powrotnego.
- **Świątynia + wieża:** 88,69, rozmiar 18×15 → +17,+20; **dwa** lokalne wejścia na wyższe piętro i **90** pól nieprzechodnich pod planowanym obszarem docelowym, których nie wolno zignorować.
- **Punkt startowy:** 84,80, rozmiar 10×9 → +14,-7; transformacja może przenieść start; nowy obszar nachodzi na istniejącą kotwicę przejścia.

## Uruchomienie przez agenta

`node experiments/editor-structure-2026-11-09/test.mjs`

`node experiments/editor-structure-2026-11-09/report.mjs`

Nie zmieniają plików źródłowych. Kontrola modelu wymaga **dalszych testów**: oba warianty mogą niszczyć autorską geometrię celu; automatyczny wybór zamiennika terenu w miejscu źródłowym jest arbitralny; innych typów contentu i relacji nie umiemy tu odtworzyć.

## Istotne odkrycie

Raport migracji w repo podaje `npcsPreservedRaw: 2`, `questsPreservedRaw: 5`, `talentsPreservedRaw: 15`, podczas gdy `coopege.project.json` ma `content.classes, abilities, monsters, spawns` **bez** pełnych NPC/quest semantics. Relacyjna transformacja modeli M3–M7 nie oznacza przeniesienia *charakteru* i funkcji miejsca. Bez wydobycia znaczeń z raw legacy nadal nie potrafimy przenieść całej świątyni ani wydarzenia RPG.

## Dogłębienie — ukryta struktura świata z surowej Tibii

Drugi, **odrębny** od kafli i par przejść punkt widzenia: `raw-core.mjs` czyta prawdziwy, archiwalny `legacy-export.normalized.json`. To **archeologiczne informacje o miejscu**, nie dowód, że najnowszy runtime interpretuje je w identyczny sposób.

- **Kanały**: w przenoszonym fragmencie znajduje się nazwane wejście **Magazyn** i przejście **Kanały miasta**. Sześć prostokątów dawnej walidacji przejść przecina zaznaczony obszar; wszystkie są *częściowe*. Ich przesuwanie jako jednej paczki z kafelkami byłoby nieuzasadnione.
- **Świątynia i wieża**: obszar obejmuje nazwane wejścia Świątynia, Wieża i Wschodnia brama twierdzy, oprócz dwóch przejść między piętrami; dziewięć regionów dawnej walidacji przechodniości go przecina. Samo naprawienie `transition.forward/return` nie wystarcza.
- **Start / targ**: zaznaczenie obejmuje prawdziwego archiwalnego NPC **Kupiec** (84,83) oraz wejście Świątynia, ale model M3–M7 nie ma kanonicznej sekcji NPC. Wariant `relations` przesunie start, ale pozostawi Kupca — mimo że raport przejść będzie zielony.

To konkretny powód, dla którego **Coopege Studio nie może utożsamiać przeniesienia kafli i kilku ID z przeniesieniem miejsca**. Kiedy twórca wybiera obszar, narzędzie powinno rozróżniać, co jest rzeczywistą częścią wyboru, co tylko z nim się przecina, a czego *nie umie* wiernie zabrać.

`node experiments/editor-structure-2026-11-09/raw-test.mjs`

`node experiments/editor-structure-2026-11-09/raw-report.mjs`

**Granica:** prostokąty `playability.gates` są historycznym materiałem testowym i nie powinny automatycznie stawać się przesuwalnymi obiektami świata. Brak tu mechaniki zapobiegania softlockom ani fizycznej próby rozgrywki. Nie przeprowadzono normalnej sesji Node ani testu interfejsu przez Ownera.

## Pytania dla przyszłych graficznych laboratoriów

- Jak wyglądałby drag z rzeczywistym podglądem przyszłego terenu, ostrzeżeniem o pokrytych przejściach i możliwością zmiany decyzji? Jak różnią się: przeniesienie, klonowanie i przesunięcie samego terenu?
- Czy twórca może osobno zaznaczyć geometrię, lokalny content i relacje? Czy Studio daje *pełne* znaczenie, czy uczciwie pokazuje, czego nie przeniesie?
- Jak uniknąć robienia demonstracji pod trzy podane przez agenta scenariusze? Drugie nieprzygotowane zadanie Ownera musi dać się wykonać bez pisania specjalnego kodu.
- Jak zachować w grze zadowalający ruch, walkę, przygodę i powrót do Srebrnej Bramy niezależnie od tego laboratorium?

**Dla Opusów/Astry:** wyniki są domenowym kontrprzykładem dla przyszłego Studio i granic zapisu. Nie ma tu postulatu uniwersalnej ontologii świata ani specyfikacji fundamentu Jaskini. Najpierw użyteczne gesty i prawdziwe znaczenie obiektu, potem ewentualny reuse.