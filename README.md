# Coopege — LAN-first coop action RPG

Aktualna wersja: **0.8.1-m8-lan-vs3-retest**. M7 pozostaje **TECH_VERIFIED / OWNER_ACCEPTED_WITH_DEBT / SUCCESSOR_REVIEWED**. M8 VS-3 jest **otwarte: stabilizacja i owner retest wymagane**.

## Najszybszy start

Na Windowsie rozpakuj paczkę i uruchom `PLAY_COOPEGE.bat`. Gotowe HTML są w `dist`; zwykły playtest nie wymaga instalacji ani builda. Studio uruchamia `START_STUDIO.bat`.

- Runtime: `dist/Coopege_v0.01.html`
- Studio: `dist/Coopege_Studio_v0.1.html`
- Asset Vault: `dist/Coopege_M7A_Asset_Vault.zip`
- Instrukcja: `START_HERE.md`
- Owner test: `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`
- LAN jednym kliknięciem: `PLAY_COOPEGE_LAN.bat`

## Fundament M7

Deterministyczny GameWorld 30 Hz, project schema v2, save v3, 338 authored spawn states, party-aware aktywacja, 24 realne transitions, local C0 P1/P2, wspólna kamera/tether, bezpieczny gameplay language, Studio z tym samym projektem, Ability Composer oraz Asset Vault 45 PNG.

Finalizacja dodaje poprawne layouty atlasów, stabilny pivot, aim zależny od aktualnej kamery, edge-triggered P2 join, atomowe save/load, Windows-safe build, publiczny registry, gotowe launchery, server reuse i egzekwowany Handoff Protocol v2.

## M8 LAN VS-1, VS-2 i VS-3

Powstał niezależny od transportu `@coopege/lan-protocol`, autorytatywny `apps/lan-host` oraz kandydat klienta `dist/Coopege_M8_LAN_Client.html`. Po negatywnym owner teście VS-3 ponownie otwarto: naprawiono konflikt tokenu dwóch kart, szarpany input i uruchomienie wymagające ręcznej komendy. Automatyczne testy przechodzą, ale etap nie jest ukończony bez owner retestu.

Przy okazji naprawiono OF-001: lokalny coop ma jedną kotwicę respawnu drużyny, a stare save'y z różnymi punktami P1/P2 są normalizowane przy wczytaniu.

## Polecenia

```powershell
npm ci --ignore-scripts
npm run doctor
npm run check
npm run test:browser
npm run test:lan-host
npm run test:gameplay-gate
npm run validate
```

`npm run validate` jest pełną bramką wydania. `npm run play` używa gotowego builda; `npm run play:rebuild` jawnie przebudowuje źródła.

## Baseline

Doctor 18/0/0, handoff bez FAIL, portability 25/0/0, TypeScript PASS, Node 112/112, migration 52/52, legacy 4/4, Chromium 10/10 + Ability Composer, server reuse PASS, LAN two-real-tabs smoke PASS, Gameplay Gate 54 000 ticków i saves 6/6.

## Ograniczenia

LAN pozostaje kandydatem do retestu, nie ukończonym etapem. Brakuje potwierdzenia płynnego działania u właściciela i na dwóch fizycznych urządzeniach, timeoutów oraz kontrolowanych profili latency/jitter/drop. Poprawka respawnu C0 także oczekuje na ręczny retest.

## Przekazanie

Nowy główny agent zaczyna od `PROJECT_STATE.json`, `AI_PROJECT_MEMORY.md`, `CURRENT_MILESTONE.md`, `LAST_HANDOFF.md`, `OWNER_FEEDBACK.md` i `AGENT_HANDOFF_PROTOCOL_V2.md`. M7 ma `OWNER_ACCEPTED`, a niezależny L2 review wejścia do M8 zakończył się `PASS` 2026-06-14. Normatywny plan implementacji znajduje się w `docs/process/M8_LAN_VERTICAL_SLICE_PLAN.md`.
