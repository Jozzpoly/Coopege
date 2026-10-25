# Coopege — Walka Przestrzenna A/B (26.10.2026)

**Status: izolowany, odwracalny eksperyment, NIE zatwierdzony model walki.** Kontynuuje bieżącą linię RPG zamiast tworzyć osobną grę. [Otwórz dokładny HTML](./Coopege_Walka_Przestrzenna_AB_2026-10-26.html). Wariant SHA-256 `dbede2c065008718c53871f63ea2313e8fadf685c33741ab5748f57e551a3373`, 378292 B, Git blob `53075fe552aafe570571a8aa190be7bbfc776ca1`.

## Wybór, który faktycznie zmienia walkę

- **Domyślnie A:** historyczna walka celowana, pierwsza Spacja wybiera najbliższego wroga; później może atakować go automatycznie, także za plecami.
- **B (tylko wojownik):** WASD nadaje kierunek, Spacja wykonuje jeden zamach w łuku przed postacią. Zamiast automatycznego wyboru celu liczy się pozycja, zasięg, sektor i niezasłonięta linia. Pudło także zużywa cooldown. Możliwe jest trafienie kilku przeciwników. Ruch nie zostaje zablokowany na czas ataku. Powrót B do A jest natychmiastowy, bez restartu.
- W B włączona jest również miękka korekta nakładania się ciał wojownika i potworów. Sprawdza cztery narożniki docelowej pozycji, nie przepycha przez nieprzechodnie pole. Gdy ściana uniemożliwia odepchnięcie, częściowe nakładanie **pozostaje** — to nie jest pełny solver kolizji.

**Istotny falsyfikator:** porównanie A/B zmienia dwa powiązane elementy (kierunek zamachu i kontakt ciał), więc nawet pozytywny Owner verdict nie rozstrzyga, który odpowiada za poprawę. Cztery dyskretne kierunki mogą być niewystarczające. Nie utożsamiać wymagania ręcznego sterowania z automatycznie większą przyjemnością walki.

## Dowody

- [Źródło adaptera](./spatial-combat.js) — jeden czytelny moduł, wstrzyknięty do **tego samego historycznego RPG runtime**. [Deterministyczny builder](./build_from_repo.py) odtwarza HTML z przypiętego [donora widoku przygody](../adventure-view/Coopege_Przestrzen_Przygody_2026-10-25.html) (SHA-256 `d53cea3f2ef8faefbccd104f3b2d5a98d716b9afa1fb392125a5f07fe6c4bd9b`); cold build sprawdzony bajt po bajcie.
- [Minimalna regresja Chromium](./test_core_repo.py): A trafia najbliższego wroga *za* postacią; B trafia tylko w sektorze przed postacią; po jednym zamachu brak ukrytego automatycznego powtarzania; powrót B do A; brak JS errors.
- Pełniejszy pakiet wykonanych lokalnie testów obejmuje: rzeczywistą trasę WASD na południe z pokonaniem naturalnego szczura, obrót z klawiatury, pusty zamach, wiele celów, mur/odblokowanie, kontrolę soft-contact (zablokowanie przez ścianę), zapis bez zmiany stanu po B, trzy klasy, F2/malowanie, wóz/pociski, HUD V oraz realną pętlę wyprawy, ekwipunku i sklepu. **Długie marsze używają prawdziwego update() bez rysowania każdej klatki; nie są Owner feel-testem.**
- Pełne źródła, 10+ skryptów, obrazy rzeczywistego łuku zamachu i `MANIFEST.sha256` w paczce rozmowy `COOPEGE_WALKA_PRZESTRZENNA_AB_2026-10-26.zip` — 20 pozycji, 1293234 B, SHA-256 `a09bc6d114cc14a5302e9b960c7917b0a639db80cbfce795b8a76c6e796058e3`. ZIP CRC/manifest/cold rebuild PASS. Archiwum nie jest niezależnym backupem poza ChatGPT, jednak dokładny HTML, adapter, builder i minimalny test są w GitHubie.

## Granice i następny sensowny ruch

- **Nieudowodnione:** real-origin trwałość localStorage, dłuższy feel walki, kompetencja AI, pełne pięć pięter, balans, koop i Owner ocena. Środowisko blokowało nawigację do testowego originu `ERR_BLOCKED_BY_ADMINISTRATOR`; to ograniczenie dowodu, nie stwierdzony błąd gry.
- **Następna hipoteza:** czy bezpośrednia geometria walki, kontakt ciał i lepsza czytelność sprawiają, że chcesz spontanicznie walczyć dalej — albo czy po kilku minutach B staje się bardziej męczące od celowania A? Werdykt wymaga ludzkiego testu obu trybów, nie następnej partii abstrakcyjnych metryk.
- **Nie robić:** nie promować B do `main`, nie mnożyć podobnych systemów, nie rozbudowywać bez końca historycznego HTML, nie uzależniać już teraz RPG od Jaskini. Tibia Studio i Jaskinia pozostają wspólną długoterminową wizją autorstwa, a nie dzisiejszą blokadą.
