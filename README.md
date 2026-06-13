# Coopege — LAN-first coop action RPG

Aktualna wersja: **0.7.3-m7-validation-candidate**. Status: **M7 FINAL VALIDATION CANDIDATE / TECH_VERIFIED / NOT OWNER ACCEPTED**.

## Najszybszy start

Na Windowsie rozpakuj paczkę i uruchom `PLAY_COOPEGE.bat`. Gotowe HTML są w `dist`; zwykły playtest nie wymaga instalacji ani builda. Studio uruchamia `START_STUDIO.bat`.

- Runtime: `dist/Coopege_v0.01.html`
- Studio: `dist/Coopege_Studio_v0.1.html`
- Asset Vault: `dist/Coopege_M7A_Asset_Vault.zip`
- Instrukcja: `START_HERE.md`
- Owner test: `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`

## Fundament M7

Deterministyczny GameWorld 30 Hz, project schema v2, save v3, 338 authored spawn states, party-aware aktywacja, 24 realne transitions, local C0 P1/P2, wspólna kamera/tether, bezpieczny gameplay language, Studio z tym samym projektem, Ability Composer oraz Asset Vault 45 PNG.

Finalizacja dodaje poprawne layouty atlasów, stabilny pivot, aim zależny od aktualnej kamery, edge-triggered P2 join, atomowe save/load, Windows-safe build, publiczny registry, gotowe launchery, server reuse i egzekwowany Handoff Protocol v2.

## Polecenia

```powershell
npm ci --ignore-scripts
npm run doctor
npm run check
npm run test:browser
npm run test:gameplay-gate
npm run validate
```

`npm run validate` jest pełną bramką wydania. `npm run play` używa gotowego builda; `npm run play:rebuild` jawnie przebudowuje źródła.

## Baseline

Doctor 17/1/0, handoff 24/24, portability 21/0/0, TypeScript PASS, Node 90/90, migration 52/52, legacy 4/4, Chromium 9/9 + Ability Composer, server reuse PASS, Gameplay Gate 54 000 ticków i saves 6/6.

## Ograniczenia

To nadal wczesny runtime: brak LAN/reconnectu, pełnych clipów attack/death, transition CRUD, docelowych itemów/questów/dialogów/talentów/AI authoringu oraz finalnego balansu i feelu. P2 keyboard może zależeć od key rollover. Automaty nie zastępują testu Przemka.

## Przekazanie

Nowy główny agent zaczyna od `PROJECT_STATE.json`, `AI_PROJECT_MEMORY.md`, `CURRENT_MILESTONE.md`, `LAST_HANDOFF.md` i `AGENT_HANDOFF_PROTOCOL_V2.md`. Przed M8 wykonuje niezależny L2 review. Tylko Przemek nadaje `OWNER_ACCEPTED`.
