# ADR — Modułowy TypeScript i generowane HTML

## Status
Zaakceptowane — 2026-06-12

## Decyzja
Źródła pozostają modułowe i testowalne w TypeScript. Samodzielne HTML są generowanym rezultatem builda.

## Konsekwencje
- `dist/` nie jest źródłem prawdy.
- Nie patchujemy regexem istniejącego monolitu jako głównego procesu builda.
- Oficjalne nazwy wersji są używane dopiero po przejściu odpowiednich bramek.
