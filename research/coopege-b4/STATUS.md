# Coopege B4 — kontrpróba oprawy, nie nowy kanon

## Źródło decyzji
23.10.2026 Owner po testowaniu B3 powiedział, że **skrzynka działa teraz jakoś sensowniej, choć nie idealnie**, ale **cała reszta gry wygląda bardzo źle**. Traktować to jako znaczący produktowy FAIL, nie jako komentarz o kolorach. Nie rozwijać ślepo B3 dlatego, że technicznie dobrze działa.

## Co sprawdzamy
- Nie zmieniamy symulacji B3, authored map, zachowania wózka ani klawiszy. Zmieniamy tylko rendering w view.js i opakowanie HTML. W B4 wizualizacja jest wciąż wymienialną hipotezą.
- Stylizowane top-down 2D, odczytywalne materiały murów i traktu, detale trawy, światłocień/obrysy postaci i istot, wyraźniejsze wózki/NPC, porządek HUD.
- Autentyczny rejon Srebrnej Bramy jako porównywalny materiał; wciąż zero nowej fabuły, nowych zdolności i pogłębienia RPG.
- Zachować mechanikę pchania i chwytu z B3, współdzieloną geometrię dla widoku, wzroku, trafień i save.

## Co absolutnie pozostaje otwarte
Oprawa świata i odczucie życia NIE są rozstrzygnięte. Wygenerowane kształty proceduralne mogą nadal wyglądać słabo. A1 jest bogatszy jako RPG, ale wizualnie również ma duże długi. Nie stosować uproszczenia „B4 piękniejszy => wybrany silnik”. Krytyczna praca to spójność świata, czytelne role, atrakcyjność wyprawy, autorstwo i materialne możliwości, nie malowanie zielonej kratownicy na ładniejsze odcienie.

## Dowody
Wymagany dokładny SHA w workflow B4: autorskie dane, testy świata i inputu, Chromium real player, side-by-side A1/B4 oraz screenshot review. Do czasu PASS i obejrzenia screenshotów: **NIEUDOWODNIONE**.

## Wynik i krytyczna ocena po realnym Chromium

- **TECH PASS**, CI commit `75f9bd5447f70c1ac993525d06198d184deb0d15`: [run #40020853490](https://github.com/Jozzpoly/Coopege/actions/runs/40020853490). Dotychczasowe mechaniki, kontakt z wózkiem, save, A1/B4 comparison i screenshoty zachowane. Ruch południowy: A1 y84.5→99.87, B4 y84.5→98.5 przy zwykłym S (nie benchmark szybkości).
- **VISUAL FAIL względem ambicji Ownera**, mimo zauważalnej różnicy z B3. Ogląd screenshotów `coopege-b2/B4-01-city.png` i `coopege-b1/B4-03-continuous-body-push.png` w artefakcie Actions: nadal ogromne puste i powtarzalne pola, postać oraz przeciwnicy bardzo małe i niezbyt charakterystyczne, brak atrakcyjnych punktów zainteresowania i życia świata. Proceduralne cegły czy trawa nie wystarczają.
- **PRODUCT FAIL** bez poprawy: 1 sztuczny trakt, 5 szczurów, symboliczny wózek i brak bogatszej pętli wyprawy. B4 nie przybliża istotnie Coopege do większego, własnego RPG. Nie bronić B4 i nie inwestować dalej w kolejną iterację szumu na Canvas.
- Następne krytyczne rozstrzygnięcie: wziąć konkretną autorską lokację i mocne doświadczenie z dawnego Tibia/A1 jako donor treści i spójności oraz zbadać odrębny, **asset/scene-driven** kierunek oprawy z własną tożsamością Coopege, nie odziedziczoną ślepo grafiką. Budować najpierw grywalne miejsce z rolami, czytelnymi sprawami, sensownymi affordances oraz wyborem. Pchać tylko systemy, które to wspierają.

## Następny krok po wizualnym wyniku
Krytycznie wybrać 1 małą, authored sytuację RPG ze społeczną/materialną konsekwencją, w której człowiek ma powód zostać, eksplorować i wrócić, zamiast ciągłego testowania szczurów i drogi z wózkiem. Bez łączenia projektów, LAN, nowego fundamentu bez evidence.
