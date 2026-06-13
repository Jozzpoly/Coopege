# COOPEGE — PLAYTEST LOG

> Testy automatyczne sprawdzają spójność. Ten plik zachowuje doświadczenie z prawdziwego grania. Najnowsze wpisy są na górze.

## 2026-06-13 — M7 owner acceptance

- **Wersja zamykająca:** `0.7.5-m7-owner-accepted`
- **Decyzja Przemka:** `ACCEPT_WITH_DEBT`
- **Następny etap:** M8 LAN Foundation / Entry Review

### Potwierdzone przez właściciela

- najważniejsze problemy M7 są usunięte;
- atlasy tekstur postaci nie mają już problemów;
- warianty i animacje terenu działają zgodnie z zamiarem;
- projekt może przejść do kolejnego etapu.

### Odłożony dług

- lokalny C0 po śmierci może zmienić punkt respawnu używany później solo;
- problem nie blokuje M8, ponieważ coop na jednym ekranie nie jest priorytetem;
- trwały wpis: `OWNER_FEEDBACK.md`, `OF-001`, status `BACKLOG`.

### Status

- `IMPLEMENTED`: TAK;
- `TECH_VERIFIED`: TAK;
- `OWNER_ACCEPTED`: TAK, z długiem;
- `SUCCESSOR_REVIEWED`: NIE;
- M8 LAN: aktywny etap wejściowy, implementacja po L2 review.

---

## 2026-06-13 - M7 owner feedback fixes

- **Wersja:** `0.7.4-m7-owner-fixes`
- **Źródło:** pełny feedback właściciela zapisany w `M7_OWNER_PLAYTEST_GUIDE.md`
- **Status:** poprawki wdrożone i technicznie zweryfikowane; wymagany krótki retest właściciela

### Naprawione

- zapis solo po wcześniejszej sesji P2 nie zachowuje threat nieistniejącego `player.local.2`;
- arkusze terenu są stabilnymi wariantami, a nie globalną animacją; animują się tylko woda i lawa;
- atlasy postaci są regenerowane do 80x80 i nie wycinają stóp ani broni;
- pełny workflow npm działa na Windowsie z Node 24.

### Dowody

- Node 94/94, migration 52/52, Chromium 9/9 + Ability Composer;
- ręczny browser QA: P2 join, zapis, disconnect, zapis solo i load bez błędów;
- obraz dwóch graczy i cztery arkusze kierunków sprawdzone wizualnie;
- integralność czterech plików legacy zachowana.

### Status

- `TECH_VERIFIED`: TAK;
- `OWNER_ACCEPTED`: NIE;
- retest właściciela: atlasy, warianty terenu, zapis P2 -> solo.

---

## 2026-06-13 — M7 Final Validation Candidate

- **Wersja:** `0.7.3-m7-validation-candidate`
- **Status:** TECH_VERIFIED / owner test jeszcze niewykonany

### Ostatnia rewizja

- naprawiono aim myszy po ruchu kamery;
- P2 nie wraca sam po ręcznym odłączeniu przy trzymanym klawiszu;
- drugi launcher bezpiecznie rozpoznaje działający serwer tej samej kopii;
- Handoff Protocol v2 i maszynowy `PROJECT_STATE.json` są w repo i mają automatyczny gate;
- Chromium suite izoluje scenariusze, ma timeout/retry i pełne 9/9 + Ability Composer.

### Status

- `IMPLEMENTED`: TAK;
- `TECH_VERIFIED`: TAK;
- `SUCCESSOR_REVIEWED`: NIE;
- `OWNER_ACCEPTED`: NIE;
- M8: ZABLOKOWANE.

---

## 2026-06-13 — M7 Final Playtest Candidate po krytycznej rewizji

- **Tryb:** przygotowanie kandydatury; automaty + prawdziwe ścieżki Chromium
- **Wersja:** `0.7.2-m7-final-candidate`
- **Owner test:** jeszcze niewykonany dla tej paczki

### Co naprawiono po pierwszym feedbacku

- authored layout 48×56 i stabilny pivot zamiast hardcoded 32 px;
- 24 realne transitions uruchamiane wejściem P1/P2;
- P2 keyboard: strzałki + prawy Ctrl/Numpad0;
- atomowa walidacja save/load;
- gamepad index/device ownership;
- transitions widoczne w Studio;
- gotowy launcher bez npm/build;
- portability i clean-package gate.

### Dowody techniczne

- Node 87/87; migration 52/52; legacy 4/4; Chromium 9/9 + Ability Composer;
- automated soak 27 000 ticków solo + 27 000 C0;
- clean-package install/build/check/portability PASS.

### Status

- `TECH READY`: TAK;
- `PLAYTEST CANDIDATE`: TAK;
- `OWNER ACCEPTED`: **NIE — czeka na test Przemka według M7_OWNER_PLAYTEST_GUIDE.md**.

---

## 2026-06-13 — M7 first owner launch + finalization feedback

- **Tryb:** solo runtime M7 na Windowsie
- **Czas:** krótki test uruchomieniowy właściciela
- **Sterowanie:** P1 klawiatura/mysz; P2 nieprzetestowany z powodu braku gamepada
- **Wynik:** projekt uruchomił się po hotfixie builda; postać chodzi po mapie i może zabijać potwory.

### Feedback właściciela

- `BUG/FEEL`: grafika i animacja postaci podczas ruchu „sfiruje”, jakby offsetowała się o wartość przemieszczenia.
- `BUG/CONTENT`: nie można wychodzić po schodach.
- `UX`: P2 wymaga dostępnego sposobu testowania bez gamepada albo ma zostać odłożony do M8 LAN.
- `PROCESS`: M7 nie może być uznane za zakończone tylko po testach automatycznych; potrzebna wersja final playtest candidate i akceptacja właściciela przed M8.

### Decyzja

Powstał zakres **M7 Finalization / M7B Stabilization**: naprawić animacje atlasów, realne transitions, P2 z klawiatury, diagnostykę uruchamiania i przygotować świadomy kandydat do ręcznego testu.

### Status

- `TECH`: poprawki wdrożone w M7 Final Candidate;
- `OWNER ACCEPTANCE`: **OTWARTE** — czeka na ponowny test Przemka.

---

## 2026-06-13 — M7 Gameplay Gate 0.1 automated soak

- **Tryb:** solo oraz coop C0 na wspólnym ekranie
- **Czas:** 15 symulowanych minut solo + 15 symulowanych minut C0
- **Sterowanie:** deterministyczny bot testowy, nie człowiek
- **Trasa:** authored świat, 2 automatyczne przejścia pięter w każdym trybie
- **Cel:** sprawdzić lifecycle 338 spawnów, cap, save/load, piętra i błędy wykonania

### Wynik techniczny

- PASS_AUTOMATED;
- 27 000 ticków na tryb;
- maks. 14 aktywnych aktorów solo i 15 w C0;
- 6 cykli save/load na tryb;
- 0 gameplay execution failures;
- brak przekroczenia capu i brak orphan/duplicate spawn state;
- 51 nagród solo, 77 wspólnych creditów C0.

### Ważne zastrzeżenie

To **nie jest prawdziwy playtest człowieka**. Bot nie ocenia sterowania, czytelności, tempa, przyjemności ani balansu. W obu symulacjach gracze ostatecznie giną; może to wynikać z prymitywnej strategii bota, ale ręczna sesja powinna sprawdzić trudność i regenerację.

### Status

- `TECH`: automatyczna bramka świata i save/load zamknięta;
- `BALANCE`: otwarte do oceny;
- `FEEL`: otwarte do oceny;
- `UX`: otwarte do oceny;
- ręczny gate 15 min solo + 15 min C0: **OTWARTE DLA PRZEMKA**.

---

## Szablon ręcznego wpisu

### YYYY-MM-DD — build / milestone

- **Tryb:** solo / coop wspólny ekran / coop LAN
- **Czas sesji:**
- **Urządzenia i sieć:**
- **Gracze i sterowanie:**
- **Trasa / miejsce:**
- **Cel sesji:**

#### Co było przyjemne

-

#### Coop i synchronizacja

- Czy każdy gracz miał pełną kontrolę i czytelny ekran?
- Czy kamera/tether albo opóźnienie ograniczały decyzje?
- Czy pojawiły się rozjazdy, teleporty, utrata wejścia lub problem z dołączeniem?

#### Co przeszkadzało

-

#### Co było niezrozumiałe

-

#### Najbardziej zapamiętany moment

-

#### Błędy lub podejrzane zachowania

-

#### Trzy najważniejsze poprawki

1.
2.
3.

#### Luźne pomysły

-

## Kategorie feedbacku

- `BUG` — sprzeczne z zamiarem;
- `UX` — interfejs, czytelność, sterowanie;
- `FEEL` — tempo, dynamika, animacja, satysfakcja;
- `BALANCE` — obrażenia, trudność, nagrody, progresja;
- `CONTENT` — mapa, potwory, umiejętności, lokacje;
- `ARCH` — wada fundamentu;
- `IDEA` — propozycja do późniejszej oceny.
