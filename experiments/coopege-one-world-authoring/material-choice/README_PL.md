# Coopege — Materialna Wyprawa: poprawiony posterunek i ruchoma osłona (25.10.2026)

**Eksperyment, nie nowy silnik i nie zatwierdzone przez Ownera Coopege.** Kontynuuje jeden świat i jedną pętlę RPG na odzyskanej Tibii v14.1. **Nie wymaga Jaskini** do uruchomienia, ale traktuje jej szeroką wizję wspólnego tworzenia/uruchamiania jako intencję długoterminową. Stara architektura nie zostaje zamrożona.

## Zagraj

Otwórz `Coopege_Wyprawa_Woz_2026-10-25.html` w Chrome albo Operze. Wybierz `1` wojownika / `2` łucznika / `3` maga. `WASD` — ruch, `Spacja` — atak, `E` — interakcja, `C` — ekwipunek, `F2` — edycja świata. Wyjdź południową bramą Srebrnej Bramy, idź ku drogowskazowi **STRAŻ**, zejdź na wschód. Podejdź do porzuconego wozu z dowolnej strony i naciśnij `E`: wóz przesunie się **od postaci**, jeżeli następne pole nie jest zajęte. Można nim zmienić drogę potworów i osłonę przed pociskami; nie trzeba go ruszać, aby odwiedzić posterunek. W skrzyni jest pierwotny jednorazowy łup, dostępny przez oryginalny plecak; możesz wrócić do kupca w mieście. Szczury mogą ominąć wóz i nadal zranić gracza — osłona nie daje niezwyciężoności.

## Właściwe odkrycie audytu — stara wersja rysowała nieprawdę

W poprzednim `Coopege_Expedition_Outpost.html` wstawienie `Outpost.drawWorld()` i `drawHUD()` tylko do pierwszego renderera nie wystarczało: późniejszy `render=function(){...}` w historycznej Tibii **zastępuje** tamten renderer. Poprzednia mechanika skrzyni działała, lecz **skrzyń, drogowskazu i kontekstowego HUD-u nie rysował aktualny renderer**. Jest to materialna wada poprzedniego świadectwa, nie kosmetyczny szczegół. Skrypt `test_renderer_counterexample.py` testuje oba dokładne HTML-e: wcześniejszy render wypisuje **zero** wywołań tekstów `Zapomniana skrzynia`/`STRAŻ`, a poprawiony wyświetla oba. `test_render.py` sprawdza jeszcze prompt `Pchnij wóz` i zrzuty klatek z czynnego renderera. Nie deklarować wcześniejszego wizualnego PASS.

## Co zostało sprawdzone (ścisłe scope)

- `test_render.py`: na jednej rzeczywistej stronie Chromium z normalnym renderem widoczne są **drogowskaz, skrzynia, wóz i prompt interakcji**. Zrzuty: `one-world-visible-before.png`, `one-world-visible-after.png`.
- `test_material.py`: normalne WASD do wozu, `E` kilka razy, kolejne przesunięcia na prawdziwych polach, blokada przez istniejącą ścianę, aktualna kolizja nóg i linii strzału; płytka mapy pozostaje oryginalna. Zapis/odtworzenie pozycji wozu przez **wewnętrzny format save** działa bez `localStorage` na realnym originie.
- `test_actor.py`: rzeczywisty kod `Monster` w kontrolowanym, sztucznie przygotowanym spotkaniu zmienia tor poruszania: bez osłony szczur idzie y=108.5, z osłoną obchodzi ją przez okolice y=109; nie wchodzi w zajęte pole. **Test ustawienia bodźca**, nie dowód zbalansowanej taktyki w nieprzewidywalnej przygodzie.
- `test_projectiles.py`: rzeczywiste klasy `Shot` oraz `EnemyShot` pokonują swobodne pole, ale kończą lot po kontakcie z dynamiczną osłoną; podłoże (tile=16) pozostaje identyczne.
- `test_rpg_loop.py`: rzeczywiste klawisze w symulacji z szybkim `update()` (bez rysowania każdej klatki), dotarcie do posterunku, odbiór jednorazowego łupu, **kliknięcie** zbroi do ekwipunku, naturalny powrót przez wąskie przejście miasta, otwarcie kupca i **kliknięcie KUP**. Złoto spada, liczba mikstur rośnie. Istniejący tragarz nadal może niezależnie dostarczyć zaopatrzenie; potwory nadal zadają obrażenia. `rpg-purchase.png` — końcowy kadr. **To nie jest rzetelny test feelu w czasie rzeczywistym.**
- `test_choices.py`: łucznik i mag startują bez automatycznie przypisanej nagrody; 338 historycznych potworów. `test_authoring_consistency.py`: F2 maluje mur na skrzyni, E nie daje nagrody przez mur, Ctrl+Z przywraca dostęp. `TibiaMapAPI.validateWorld()` w badanej wersji zwraca `ok:true`.
- Wszystkie istotne klucze zapisu (`SAVE`, roster, ustawienia, assety, teren) mają osobny prefix `coopege_material_choice_2026_10_25_`. Brak fallbacku do zapisów historycznej Tibii lub wcześniejszych prototypów.

## Nieudowodnione / nieprzyjęte

- Brak **Owner feel testu**; to nadal głównie stara Tibia z jedną małą sceną i pomysłem na przestawny wóz. Wóz wydłuża drogę szczura, ale nie musi tworzyć ciekawych decyzji. **Nie seryjnie dodawać wozów i skrzyń.**
- Nie sprawdzono normalnej trwałości `file://` ani magazynu na pełnym real-origin HTTP (narzędzie blokuje lokalną nawigację); testy stanu używają bezpośredniego pack/restore. Nie sprawdzono pełnej ekonomii, wszystkich pięter, wszystkich interakcji i własnych assetów Ownera.
- `TibiaMapAPI.exportWorld()` pozostaje mapą **statycznych terenów**, a nowy dynamiczny wóz żyje w osobnym stanie gry; to świadome rozdzielenie, nie finalna architektura. Edytor F2 nie posiada jeszcze własnej palety ruchomych obiektów.
- Mechanika pchania jest **na siatce** i bardzo prosta; nie jest fizyką skrzyń, nie daje gwarancji jakości sterowania ani pełnej społecznej ekologii. Agent może ją całkowicie odrzucić, jeśli nie pomaga grywalności.

## Odtwarzanie

W katalogu paczki wykonaj `python build.py`. Wyjściowy HTML musi mieć dokładnie **370191 bajtów** i SHA-256 `84c7499a5b8569bbb12e6c02c7c1ea112ff3b4bf00f566a4ababff01308e42d8`. Źródłem generatora jest zachowany `sources/Coopege_Expedition_Outpost.html` (SHA-256 `3440559a4160c362505209291c2a75698f1c77285b6992b42026b1ff77040be6`). Wszystkie testy przeglądarkowe wymagają Pythona + Playwright + Chromium; gracz otwiera pojedynczy HTML bez żadnej instalacji. Manifest pinowany sumami SHA-256 do zawartości ZIP.

**Następna decyzja produktowa:** po mocnej weryfikacji właściwej grafiki i możliwości gry wybrać, czy kontynuować inwestycję w materiałowe, emergentne interakcje, czy priorytetem stało się naprawienie feelu ruchu/walki, prezentacji i odkrywania świata. Nie zamieniać tej wersji w nowy monolityczny fundament przez inercję. Oryginalna Tibia, Jaskinia i powstające Coopege pozostają rozdzielnymi źródłami prawdy, dopóki rzeczywiste doświadczenie nie uzasadni integracji.