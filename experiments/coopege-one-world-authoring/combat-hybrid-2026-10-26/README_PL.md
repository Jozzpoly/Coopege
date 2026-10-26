# Coopege — walka hybrydowa po Owner playtest (26.10.2026)

**Izolowany kandydat gry, nie kanoniczny system walki i nie Owner-approved feel.** [Uruchom samodzielny HTML](./Coopege_Walka_Hybrydowa_AB_2026-10-26.html) — 382127 B, SHA-256 `228b2c7b6b5d7f563e57685d83f79287ca93d914cb39369d8235fdb64fa86af6`, Git blob `462f5fdb72c647b27f96f2518c56328d0e45034a`.

**Owner feedback:** na prywatnym nagraniu (około 162 s) gracz rzeczywiście eksploruje, walczy w podziemiach, używa istniejącego RPG UI i przełącza tryby; Owner potwierdza pozytywne odczucie braku przenikania się postaci i potworów, ale chce autoatak oraz mniej ciągłego wciskania klawisza ataku. Nagranie jest prywatne, nie należy go umieszczać w publicznym repo ani paczce. Nie znamy dokładnej liczby fizycznych naciśnięć klawisza na podstawie nagrania.

## Sterowanie i faktyczny kontrakt
- `B` (wojownik) przełącza A: klasyczne wybieranie wroga/autoatak, i B: przestrzenny cios z kontaktem ~135 ms w animacji.
- **B, tap Spacja:** jeden zamach. **B, przytrzymaj Spację:** zamachy powtarzają się według cooldownu broni, bez dodatkowych komend; zwykłe WASD/kierunek i możliwość pudła pozostają.
- **B, T lub istniejący przycisk AUTO:** automatycznie rozpoczyna te same przestrzenne zamachy, gdy wróg jest bezpośrednio w zasięgu i nie jest zasłonięty. Nie goni wroga, nie zmienia reguł obrażeń, nie sięga przez mur/wóz. W bezruchu postać ustawia kierunek do najbliższego wroga; podczas WASD/click-move pozostaje kierunek gracza, a rozpatrywani są wyłącznie wrogowie z przodu. Krótsza Spacja ma pierwszeństwo przed AUTO. `T` w historycznym A nadal oznacza stare auto-celowanie.
- **Kolizja postaci i potworów** jest regułą niezależną od B i działa również w A i dla pozostałych klas; nadal jest to przybliżone rozdzielanie ciał, nie pełny solver fizyki. Cztery kierunki, obecna szybkość i charakter gry pozostają eksperymentalne.
- `V` przełącza widok przygody; `F2` nadal pozwala edytować teren. Przy pauzie, ekranie ekwipunku i edytorze nie zaczynają się nowe automatyczne ciosy; niedokończony zamach zostaje anulowany przy otwarciu panelu. Przestrzeń kluczy zapisu jest nowa: `coopege_hybrid_combat_2026_10_26_`.

## Przeprowadzone próby i ograniczenia
- Chromium: tap = pojedynczy cios bez powtórzeń; przytrzymana Spacja 6.6 s = 5 zamachów, puszczenie kończy serię; T bez Spacji daje **prawdziwy cios**, również w historycznym świecie ze szczurami. W kontrolowanym teście pierwsze 90 ms nie daje obrażeń, dopiero moment kontaktu je rozstrzyga.
- Wrogowie za plecami podczas ruchu nie są automatycznie atakowani; bliższy z tyłu nie przesłania celu z przodu. Ściana blokuje AUTO. Brak ataku w pauzie, ekwipunku i F2. Miękki kontakt w A i B działa. Start wojownika, łucznika i maga, pięć danych warstw mapy, korekta uderzenia, HUD V i dane zapisu (poza istniejącym AUTO T) przeszły badane regresje.
- Naturalne spotkanie ze szczurami: w B+T **bez Spacji** wojownik wykonał 2 ciosy, 4 kontakty obrażeń, pokonał jednego wroga (HP 115→106 w tej próbce). Długie marsze testowe napędzane były normalną funkcją gry `update()`, lecz nie każda klatka była rysowana — nie ma Owner testu feelingu nowej wersji.
- Cała odziedziczona wyprawa RPG z realnym lootem, ubraniem zdobytej zbroi i rzeczywistym zakupem u kupca przeszła ponownie. Początkowy test starej kolizji wymagał przenikania w trybie A i stał się celowo nieaktualny — zastąpił go pozytywny świadek kontaktu w A i B.
- **NIEUDOWODNIONE:** czy takie AUTO jest optymalnie wygodne w zatłoczonych podziemiach, balans, animacyjne wygładzenie, wszystkie przejścia pięter, sieciowy co-op, trwałość real-origin localStorage, Owner werdykt nowego feelu. Nie promować domyślnie na main ani nie rozszerzać na klasy bez dowodu.

## Ważne przed powrotem po kolejnej aktualizacji

**Zapis postaci, lista postaci, ustawienia, własne assety oraz edycje mapy mają oddzielne klucze w każdej wersji eksperymentalnej.** To chroni wcześniejsze dane przed nadpisaniem, ale najnowsza Hybryda **nie wczytuje automatycznie** zapisów z wariantu „Kontakt Zamachu” ani jego własnych zmian terenu i grafik. Test w izolowanej przeglądarce: stara wersja rozpoznaje przykładowy stary zapis, nowa nie; nowa rozpoznaje swój własny zapis. Nie jest to dowód usunięcia danych ani pełnego zachowania na zwykłym `file://` lub HTTPS. Własnych zapisów i assetów nie wolno kopiować między formatami ani czytać automatycznie bez jawnego wyboru, walidacji i możliwości wycofania.

**Nie myl trzech powrotów:** do właściwej wersji gry, do swojej rozpoczętej postaci/zmienionej mapy i do własnego zamiaru sprzed przerwy. Dokładny kod mamy odzyskiwalny; przenoszenie drugiej warstwy między eksperymentami nadal wymaga świadomego rozwiązania. Nie obiecujemy migracji w obecnym buildzie.

## Odtworzenie
[Adapter](./spatial-hybrid.js), przypięty [donor widoku przygody](../adventure-view/Coopege_Przestrzen_Przygody_2026-10-25.html) i [builder](./build_from_repo.py) odtwarzają byte-identical standalone HTML. [Minimalny test Playwright](./smoke_hybrid.py). W rozmowie pełna paczka `COOPEGE_WALKA_HYBRYDOWA_2026-10-26.zip` zawiera bardziej szczegółowe scenariusze, screenshot tylko z nowego builda i manifest; 17 plików, 928366 B, SHA-256 `36fc568d3eda4871d949ee31dae9c2d83c2b0ecd7beb44cd03d3e1c0a711581b`, CRC/manifest i cold rebuild PASS. ZIP jako załącznik ChatGPT nie jest niezależnym off-platform backupem. Bez zmiany main, bez PR-a.
