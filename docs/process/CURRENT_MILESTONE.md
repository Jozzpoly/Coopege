# CURRENT MILESTONE — M7 FINAL OWNER VALIDATION

## Status

**M7 FINAL VALIDATION CANDIDATE / TECH_VERIFIED / NOT SUCCESSOR_REVIEWED / NOT OWNER ACCEPTED**

M8 jest zablokowane. Następne działania to ręczny test Przemka, poprawki z feedbacku oraz niezależny L2 Inheritance Review następnego głównego agenta.

## Dokumenty obowiązkowe

1. `PROJECT_STATE.json`
2. `AI_PROJECT_MEMORY.md`
3. `docs/process/LAST_HANDOFF.md`
4. `docs/process/AGENT_HANDOFF_PROTOCOL_V2.md`
5. `docs/process/PLAYTEST_LOG.md`
6. `docs/testing/M7_FINAL_VALIDATION_REPORT.md`
7. `docs/testing/M7_OWNER_PLAYTEST_GUIDE.md`
8. ADR-0003, 0004, 0008, 0010, 0011, 0013, 0014 i 0015

## Baseline

```powershell
npm ci --ignore-scripts
npm run validate
```

Oczekiwane: doctor bez FAIL, handoff 24/24, portability bez FAIL, legacy 4/4, TypeScript PASS, Node 90/90, migration 52/52, Chromium 9/9 + Ability Composer, server reuse PASS i Gameplay Gate PASS_AUTOMATED.

## Owner gate

Przemek sprawdza normalnym interfejsem:

- uruchomienie przez `PLAY_COOPEGE.bat` bez instalacji/builda;
- P1: ruch, mysz, atak, kilka walk i stabilny sprite;
- celowanie przy ruchu postaci i kamery;
- kilka par schodów w obie strony;
- save/load po walce i po zmianie piętra;
- P2 keyboard: join, ruch, atak, ręczne odłączenie przy trzymanym klawiszu i ponowne dołączenie po nowym naciśnięciu;
- kamera/tether oraz krótka wspólna walka;
- Studio i ponowne uruchomienie launchera.

## OWNER ACCEPTED

Tylko Przemek może nadać ten status po feedbacku i poprawkach. Następca nie rozpoczyna M8 przed własnym L2 review i zamknięciem `BLOCKER`/`MUST_FIX_BEFORE_NEXT`.
