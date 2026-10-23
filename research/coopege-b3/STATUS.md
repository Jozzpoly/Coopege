# Coopege B3 — bezpośredni kontakt z obiektem, po Owner feedback 23.10.2026

## Krytyczna korekta Ownera
Owner stanowczo odrzucił sterowanie polegające na wciśnięciu klawisza, aby przesunąć skrzynkę/wózek dokładnie o jedno pole. Problemem nie jest numer klawisza; dyskretny skok jest fałszywą materialnością, nie daje rzeczywistego sterowania i nie pasuje do ambicji gry. Nie przywracać tego wzorca pod inną nazwą ani nie bronić nim decyzji technicznej.

## Hipoteza B3 (nie finalna fizyka)
- **Napieranie ruchem postaci:** kontakt dwóch kolistych brył podczas WASD przesuwa wózek **w sposób ciągły**, wprost od względnego ruchu gracza. Przesunięcie ma wielkość ułamka kafla w kroku symulacji, bez skoków ani teleportów. Wózek może zostać zatrzymany przez ścianę, potwora, mieszkańca, a postać także nie przenika przeszkód.
- **Bezpośredni chwyt myszą / dotykiem w zasięgu ręki:** przytrzymanie na wózku, gdy gracz znajduje się blisko, pozwala kierować nim płynnie do wskazanego miejsca z ograniczoną prędkością, oporem i kolizjami. Nie ma zdalnej telekinezy: po oddaleniu obiektu poza zasięg ruch ustaje. To nie jest uniwersalny chwyt/sterownik ciała.
- **Krótka bezwładność:** prosty model prędkości i wygaszania, nie profesjonalny solver fizyki. Obiekt współdzieli pozycję dla ruchu, przesłaniania widzenia i walki.
- **E** zachowano tylko dla rozmowy z mieszkańcem. Nie przesuwa już wózka.
- Stan ruchu trafia do nowego save v2 i osobnego localStorage, więc historyczne sesje B1/B2 nie są wczytywane automatycznie.

## Granice i kryteria 
- To **mały, wymienialny model eksperymentalny**. Okręgi, stały opór, wzrok/kolizje kafli i surowy obraz nie udowadniają docelowej fizyki ciał, tarcia, rotacji, chwytu ani materialności bardziej złożonego świata.
- Nie wolno ogłaszać feelu, wygody mobilnej, ciężaru, ciągłej gry RPG ani dojrzałego buildera na podstawie samych unit testów. Decyzje mają wychodzić z bezpośredniej zabawy Ownera, a nie defensywnych architektonicznych deklaracji.
- CI ma obejmować autorskie dane B0, testy w świecie, realne klawiaturowe pchanie w Chromium, cofnięcie, zapis/odczyt, oraz porównanie drogi A1/B3.
- Gameplayowym pytaniem pozostaje, czy materialność daje **nowe, ciekawe wybory**, czy tylko zmienia sposób odsuwania blokady na drodze. Nie poszerzać RPG losowymi placeholderami bez jasnej korzyści.

## Autonomia zmian
B3 jest izolowaną eksperymentalną gałęzią nad B2 [PR #5](https://github.com/Jozzpoly/Coopege/pull/5). Nie scalać do main, nie wypuszczać do Jaskini. Nie przepisywać A1 ani M7. B3 może zostać zastąpione, jeśli dalszy test nie obroni UX.

## Weryfikacja
Wypełnić po exact-HEAD CI, nie na podstawie starszego SHA.
