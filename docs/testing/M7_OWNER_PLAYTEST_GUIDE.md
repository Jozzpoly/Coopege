# M7 FINAL VALIDATION — OWNER PLAYTEST GUIDE

Wersja: `0.7.3-m7-validation-candidate`. Ten test jest warunkiem `OWNER_ACCEPTED`; automaty już przeszły, ale nie oceniają feelu.

## Minimalny test regresji finalizacji

\\  Potwierdzone  //  1. Uruchom `PLAY_COOPEGE.bat`, a potem kliknij go drugi raz — nie powinien pojawić się `EADDRINUSE`.
\\  Potwierdzone  //  2. Poruszaj P1 i trzymaj kursor nieruchomo na celu podczas ruchu/kamery; kierunek ataku nie powinien „odpływać”.
\\  Potwierdzone  //  3. Dołącz P2 strzałką, trzymaj strzałkę i kliknij `Odłącz P2`; P2 ma pozostać odłączony. Zwolnij i naciśnij ponownie — ma dołączyć.
\\  Potwierdzone  //  4. Przejdź minimum trzema różnymi parami schodów w obie strony.
\\  Potwierdzone  //  5. Zapisz/wczytaj po walce i po zmianie piętra.
\\  Potwierdzone  //  6. Zagraj 15 minut solo i 15 minut C0; otwórz Studio przynajmniej raz.

---

Status wejściowy: **PLAYTEST CANDIDATE / NOT OWNER ACCEPTED**

Ten test nie ma udowodnić, że Coopege jest już pełną grą. Ma odpowiedzieć, czy fundament M7 jest wystarczająco stabilny i świadomy, aby rozpocząć M8 LAN.

## 0. Uruchomienie

1. Rozpakuj paczkę do nowego folderu.
2. Kliknij `PLAY_COOPEGE.bat`.
3. Nie uruchamiaj `npm install` ani builda do zwykłego testu.
4. Gdy przeglądarka nie otworzy się sama, użyj `http://localhost:4173/dist/Coopege_v0.01.html`.
5. Pozostaw terminal otwarty. Zakończenie: `Ctrl+C`.

Wynik:

- [ ] gra otworzyła się bez instalacji; [ Potwierdzone ]
- [ ] nie było `Not found`, błędu registry ani builda; [ Potwierdzone ]
- [ ] ekran diagnostyczny pokazuje M7 Playtest Candidate. [ Potwierdzone ]

## 1. P1 — ruch i obraz (minimum 5 minut)

- chodź długo w lewo, prawo, górę i dół;
- zmieniaj kierunek szybko i po przekątnej;
- podejdź pod ściany i przeszkody;
- walcz podczas ruchu i po zatrzymaniu.

Sprawdź:

- [ ] sprite pozostaje przyklejony do postaci i nie przesuwa się wraz z drogą; [ Potwierdzone ]
- [ ] nie widać losowych fragmentów sąsiednich klatek atlasu; [ Nie potwierdzone - buty są ucięte, gdy miecz skierowany jest w górę to buty pojawiają się nad mieczem i widać cały miecz, gdy miecz skierowany jest w prawo,lewo,dół wtedy częsć miecza zostaje ucieta i nie widać jej w ogóle ]
- [ ] pivot stóp jest stabilny przy zmianie kierunku; [ nie rozumiem do konca "pivot sóp" ale nie zauważyłem nic "nie stabilnego" przy szybkiej zmianie kierunków, ewentualnie to część sprawy którą poruszyłem w sprawie sąsiednich klatek atlasu, stopy są ucięte ]
- [ ] kamera i kliknięcie celu nie mają narastającego offsetu; [ klikanie działa tylko na pobliskie potwory jako atakowanie ich, raczej działa bez offsetu. kamera działa okej(przydała by się na przyszłośc opcja z oddalaniem i rpzyblizaniem kamery scrolem, trzeba było by zadbać by świat i ekran się adaptował do zmiany kamery]
- [ ] kolizja nie wpycha w ścianę ani nie blokuje bez powodu.[ Potwierdzone ]

## 2. Walka i lifecycle potworów (minimum 5 minut)

- zabij kilka grup;
- odejdź od częściowo rannego potwora i wróć;
- wróć później do zabitego spawnu;
- przemierzaj pustszy i gęstszy obszar.

Sprawdź:

- [ ] potwory nie duplikują się po odejściu i powrocie; [ Potwierdzone ]
- [ ] ranny potwór zachowuje sensowny stan; [ Potwierdzone ]
- [ ] respawn nie pojawia się w ścianie; [ Nie zaobserwowałem ]
- [ ] gra nie zwalnia wraz z eksploracją; [ Potwierdzone ]
- [ ] threat i atak nie zaczynają śledzić niewłaściwej postaci. [ nie jestem pewny ]

## 3. Schody i piętra

- użyj co najmniej trzech różnych par schodów;
- każdą sprawdź w obie strony;
- spróbuj wejść na schody z różnych kierunków;
- po zmianie piętra poruszaj się od razu dalej.

Sprawdź:

- [ ] wejście na podświetlone schody zmienia piętro; [ Potwierdzone ]
- [ ] gracz pojawia się na walkowalnym polu, nie w ścianie; [ Potwierdzone ]
- [ ] nie następuje natychmiastowe odbicie z powrotem; [ Potwierdzone ]
- [ ] potwory starego piętra nie pozostają aktywne na ekranie; [ Potwierdzone ]
- [ ] powrót prowadzi do właściwej lokacji. [ Potwierdzone ]

## 4. Save/load po realnym gameplayu

- zapisz grę po walce;
- zapisz po zmianie piętra;
- wczytaj i kontynuuj;
- sprawdź pozycję, HP, piętro, potwory i P2, jeżeli był dołączony.

Sprawdź:

- [ ] wczytanie nie resetuje całego świata; [ Potwierdzone ]
- [ ] aktywne piętro i pozycja są zgodne; [ Potwierdzone ]
- [ ] nie pojawiają się duplikaty graczy lub potworów; [ Potwierdzone ]
- [ ] uszkodzenie/odrzucenie save’a nie niszczy bieżącej sesji. [ gdy zapiszę swiat z dwoma graczami wszystko super działa dopóki na tej samej sesji nie chcę zapisać stanu z jednym graczem, wtedy nie da się juz takiego zapisu wczytać(finalnie nie będzie coopa na jednym ekranie w grze, albo będzie bardzo ograniczony wiec nie wiem czy to naprawiać) Zapis odrzucony bez zmiany sesji: Spawn spawn.legacy.surface_north_wild_pack.troll.1.instance.001 zawiera threat nieistniejącego gracza player.local.2. gdy  ]

## 5. P2 bez gamepada (minimum 5 minut)

- dołącz P2 strzałką albo prawym Ctrl;
- P1 porusza się WASD, P2 strzałkami;
- P2 atakuje prawym Ctrl albo Numpad0 w ostatnim kierunku ruchu;
- rozdziel graczy na tyle, aby kamera/tether zareagowały;
- niech P2 jako pierwszy wejdzie na schody;
- odłącz/dołącz P2, jeżeli interfejs na to pozwala.

Sprawdź:

- [ ] P2 dołącza bez gamepada; [ Potwierdzone ]
- [ ] strzałki nie sterują P1; [ Potwierdzone ]
- [ ] P1 i P2 mogą poruszać się jednocześnie w granicach możliwości klawiatury; [ Potwierdzone ]
- [ ] atak P2 jest jednorazowy, nie pozostaje „wciśnięty”; [ Potwierdzone ]
- [ ] kamera i tether nie blokują normalnej gry; [ Potwierdzone ]
- [ ] schody przenoszą całą drużynę na osobne pola; [ Potwierdzone ]
- [ ] podłączenie pada nie kradnie sterowania P2, który dołączył klawiaturą. [ brak mozliwości sprawdzenia ]

     Dodatkowy feedback z testów: sposób w jaki wracamy do zycia w trybie dwuch graczy powoduje że zmienia nam się respawn point w trybie jednego gracza, nie wiem na ile musimy to naprawiać bo kłopot z respawnem powodowany jest tym że przy smierci jednego gracza respimy go tam gdzie padł, by nie teleportować gracza na drugi konieć mapy gdyby byli daleko od spawnu.

Uwaga: część klawiatur ma ograniczony key rollover. Brak rejestracji konkretnej kombinacji wielu klawiszy może być ograniczeniem sprzętu, ale należy zapisać dokładną kombinację. [ posiadam klawiaturę mechaniczną więc lajt ]

## 6. Studio i Asset Vault — krótki smoke

1. Zatrzymaj runtime (`Ctrl+C`).
2. Kliknij `START_STUDIO.bat`.
3. Otwórz mapę i znajdź znaczniki transitions.
4. Otwórz Asset Browser.
5. Nie musisz wykonywać pełnej pracy contentowej; sprawdź, czy UI się otwiera i preview działa.

Sprawdź:

- [ ] Studio startuje z gotowego builda; [ Potwierdzone ]
- [ ] mapa pokazuje przejścia; [ Potwierdzone ]
- [ ] preview uruchamia ten sam projekt; [ Potwierdzone ]
- [ ] Asset Vault nie pozwala bez ostrzeżenia podmienić atlasu PNG o złych wymiarach. [ Potwierdzone ]

## 7. Dłuższa obserwacja

Łącznie zagraj co najmniej 15 minut solo i 10–15 minut z P2 keyboard. Zwróć uwagę na:

- stabilność FPS i pamięci;
- fun i tempo walki;
- czytelność mapy, HP, celów i schodów;
- irytujące lub powtarzalne zachowania;
- miejsca, w których fundament techniczny ogranicza pomysł na grę.



## 8. Feedback

Najbardziej wartościowy format:

- co robiłeś krok po kroku;
- co oczekiwałeś;
- co się wydarzyło;
- czy błąd powtarza się zawsze;
- screenshot lub `coopege-diagnostics.json`, jeżeli dotyczy uruchomienia.

Decyzja końcowa może brzmieć:

- **ACCEPT M7** — fundament wystarcza do rozpoczęcia M8;
- **ACCEPT WITH DEBT** — M8 może ruszyć, ale wymienione długi są jawnie zapisane;
- **REJECT / FIX M7** — blokujące problemy muszą zostać naprawione przed M8.



Koncowe obserwacje i feedback:
tile terenu animują się ponieważ interpretujesz je jako animację (w rpzypadku wody masz racę) jednak co do trawy drzew i bloków Tibia_Enhanced_v14_1_DevAPI z uzywało image sheets też jako różne warianty bloków, które były pseudolosowo rozmieszczane.
powinniśmy to teraz lepiej przemyśleć, chcę mieć rózne warianty bloków, teraz czy warto rpzechowywać je w taki sposób ? przeanalizuj sytuację i podejmij decyzję, poinformuj mnie dla czego ja podjąłeś.

Co do testów grania to bardzo mało jest do testowania, trzeba zbudować system walki i progresję postaci ale tymi zajał bym się dopiero po postawieniu działajacego lokalnego multi na lanie, podobnie z gamestudio, bardzo dużo niedokonczonych systemów, które chciałbym doszlifować zaraz po ogarnięciu lana.
