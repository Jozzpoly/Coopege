# COOPEGE — DUSZA PROJEKTU

> Ten dokument chroni sens projektu przed zgubieniem go w samym kodzie, milestone’ach i testach.
> Nie jest specyfikacją techniczną. Opisuje, **po co** powstaje Coopege, jakie doświadczenie ma dawać i jak agenci AI powinni rozumieć intencje Przemka/Jozza.

## 1. Dlaczego powstaje Coopege

Coopege nie powstaje po to, aby udowodnić, że można napisać kolejny silnik RPG ani po to, aby bez końca rozbudowywać narzędzia developerskie.

Powstaje, ponieważ Przemek chce stworzyć własny, żywy świat, który:

- daje frajdę z samego chodzenia, odkrywania i rozwijania postaci;
- można przeżywać wspólnie z drugą osobą: najpierw na jednym ekranie, a możliwie szybko także na osobnych urządzeniach połączonych w sieci lokalnej;
- można stale rozszerzać własnymi lokacjami, potworami, grafikami, umiejętnościami i historiami;
- pozostaje zrozumiały i możliwy do rozwijania także przez twórcę, który nie chce być zawodowym programistą;
- może być łatwo uruchomiony i udostępniony jako samodzielny plik HTML.

Technologia jest środkiem. Celem jest gra, do której chce się wracać, oraz Studio, które daje poczucie twórczej kontroli zamiast poczucia walki z kodem.

## 2. Obietnica dla gracza

Coopege ma dawać poczucie, że:

- świat istnieje także poza ekranem gracza;
- każda wyprawa może przynieść odkrycie, rozwój albo ciekawą historię;
- walka jest czytelna, mięsista i satysfakcjonująca, a nie tylko poprawna matematycznie;
- dwaj gracze są prawdziwą drużyną, a nie jednym graczem i doklejonym pomocnikiem;
- klasy i buildy różnią się sposobem gry, a nie jedynie kolorem efektu i wartościami statystyk;
- porażka uczy i zachęca do następnej próby zamiast irytować przypadkowością;
- content tworzony w Studio naprawdę staje się częścią świata bez ręcznego przepisywania kodu.

## 3. Filary projektowe

### 3.1. Najpierw przyjemność z grania

Architektura, edytory i testy są ważne, ale po każdym większym fundamencie musi pojawić się realny, grywalny rezultat. Długie okresy rozwoju bez nowej jakości odczuwalnej przez gracza są sygnałem ostrzegawczym.

### 3.2. Coop jest rdzeniem, nie dodatkiem

Coop na jednym ekranie jest ważnym dowodem architektury, ale nie jest końcem tej obietnicy. Docelowo podstawowym sposobem testowania ma być także lokalna gra na osobnych urządzeniach w tej samej sieci, z niezależnym ekranem, wejściem i kamerą każdego gracza.

Każdy system powinien odpowiadać na pytania:

- kto jest właścicielem działania;
- kto otrzymuje nagrodę;
- jak system zachowuje się, gdy gracze są daleko od siebie;
- czy P2 ma taką samą podmiotowość jak P1;
- czy zapis, replay i AI nadal są deterministyczne dla całej drużyny.

Nie wolno tworzyć osobnej, uproszczonej ścieżki gameplayu tylko dla drugiego gracza.

### 3.3. Świat ma być żywy, ręcznie ułożony i czytelny

Proceduralność może pomagać, lecz nie może zastępować sensownego projektowania miejsc. Lokacje, spawny, przejścia i ekologia powinny tworzyć logiczne regiony, progresję zagrożenia oraz momenty zapamiętywane przez graczy.

### 3.4. Studio ma dawać sprawczość

Przemek powinien móc tworzyć content przez widoczne narzędzia, podgląd, walidację, undo/redo i bezpieczny eksport. Surowy JSON może istnieć jako format, ale nie powinien być głównym interfejsem twórczym.

### 3.5. Rozwój ma być odwracalny i uczciwy

Każda istotna operacja powinna mieć walidację, możliwość cofnięcia i dowód w testach. Agent nie może ogłaszać ukończenia dlatego, że interfejs wygląda przekonująco albo pojedynczy happy path zadziałał.

### 3.6. Charakter ponad bezosobową poprawność

Gra nie ma skończyć jako sterylny framework. Potrzebuje charakteru: własnej atmosfery, humoru, nieco tajemnicy, wyrazistych animacji, miejsc z historią i elementów, które Przemek będzie chciał pokazywać znajomym.

## 4. Czym Coopege nie powinno się stać

- wiecznym projektem infrastrukturalnym bez pełnej pętli gry;
- klonem Tibii ograniczonym do odtwarzania starych zachowań;
- zestawem efektownych paneli Studia, które nie wpływają na prawdziwy runtime;
- grą, w której P2 ma mniej systemów, gorszy zapis albo sztuczne ograniczenia;
- monolitem single-file rozwijanym bez źródeł modułowych;
- sandboxem wykonującym dowolny kod z contentu;
- projektem, którego nie da się uruchomić bez skomplikowanej konfiguracji;
- demonstracją technologiczną pozbawioną własnego świata i emocji.

## 5. Relacja Przemek ↔ agent AI

Przemek jest właścicielem wizji, twórcą contentu, graczem i najważniejszym testerem. Nie należy wymagać od niego, aby rozstrzygał niskopoziomowe szczegóły implementacji, które agent może bezpiecznie zaprojektować i zweryfikować samodzielnie.

Symboliczna ciągłość głównego agenta jest opisana w `docs/product/AGENT_SOUL.md`, a przyszła struktura wielu agentów i ich miejsce w fabule w `docs/product/PANTHEON.md`.

Agent AI pełni jednocześnie cztery role:

1. **Budowniczy** — dostarcza działający kod i gotowe pliki.
2. **Strażnik architektury** — nie pozwala krótkim skrótom zniszczyć przyszłego coopa i authoringu.
3. **Krytyczny tester** — szuka błędów, przypadków brzegowych i fałszywego poczucia ukończenia.
4. **Tłumacz** — wyjaśnia Przemkowi rezultat prostym językiem, bez zmuszania go do czytania całego kodu.

Agent powinien być ambitny, ale nie teatralny. Ma pokazywać dowody, jawnie nazywać braki i nie udawać, że placeholder jest gotowym systemem.

## 6. Jak rozpoznać dobry postęp

Dobry etap rozwoju spełnia większość poniższych warunków:

- gracz lub twórca potrafi zrobić coś, czego wcześniej realnie nie mógł;
- rozwiązanie działa dla P1 i P2 bez osobnych wyjątków;
- projekt przechodzi testy i prawdziwy scenariusz Chromium;
- istnieje gotowy plik do uruchomienia;
- zmiana jest widoczna lub odczuwalna w grze albo Studio;
- dokumentacja stanu została skrócona do aktualnej prawdy;
- znane braki są nazwane bez ukrywania ich w opisie sukcesu;
- kolejny agent wie, od czego zacząć bez odtwarzania historii czatu.

## 7. Sygnały ostrzegawcze

Następny agent powinien zatrzymać się i skorygować kierunek, gdy:

- przez kilka etapów nie powstaje nowa grywalna pętla;
- liczba abstrakcji rośnie szybciej niż liczba działających mechanik;
- funkcja działa tylko dla P1 albo tylko w Studio;
- test zastępuje rzeczywiste zachowanie specjalnym hookiem niedostępnym w produkcji;
- nowy edytor powstaje przed ustaleniem i przetestowaniem mechaniki, którą ma edytować;
- mapa, walka lub coop stają się mniej czytelne mimo większej liczby funkcji;
- agent unika zmiany złego planu tylko dlatego, że został wcześniej zapisany;
- dokumentacja mówi „gotowe”, a użytkownik nadal nie może sensownie użyć systemu.

## 8. Północna gwiazda projektu

Docelowy prosty test sensu Coopege:

> Dwie osoby uruchamiają Coopege — na jednym ekranie albo na dwóch urządzeniach w tej samej sieci — wybierają różne role, wychodzą z bezpiecznej lokacji, eksplorują ręcznie zaprojektowany region, walczą z grupami potworów, współpracują przy zagrożeniu, znajdują nagrody, wracają silniejsze i chcą odbyć jeszcze jedną wyprawę. Następnego dnia Przemek otwiera Studio, eksportuje placeholdery, podmienia je własnymi teksturami, dodaje potwora, umiejętność albo fragment mapy i widzi tę zmianę bez ręcznego patchowania kodu.

Każdy większy milestone powinien przybliżać projekt do tego obrazu.

## 9. Ton i charakter świata — kierunek, nie zamknięta biblia

- klasyczne action RPG z czytelnym pixel-artowym/retro rodowodem, ale nowoczesnym feelingiem sterowania;
- atmosfera przygody, tajemnicy i niebezpieczeństwa, bez przesadnej ponurości;
- świat, w którym obok poważniejszych miejsc mogą istnieć dziwne, sympatyczne i zabawne elementy;
- grafika może zaczynać jako placeholder, ale animacje, efekty i reakcje powinny stopniowo nadawać wszystkiemu życie;
- nazwy, potwory i lokacje powinny z czasem odchodzić od bezpośredniego dziedzictwa Tibii i budować własną tożsamość Coopege.

## 10. Najważniejsze zdanie dla kolejnych agentów

**Nie buduj tylko systemów. Buduj grę Przemka — świat, który chce tworzyć, rozwijać, ogrywać z drugą osobą i z dumą pokazywać innym.**
