# NPM registry distribution hotfix — 2026-06-13

## Problem

W wydaniu M7/M7A trzy pola `resolved` w `package-lock.json` wskazywały na prywatny cache npm środowiska OpenAI. Adres jest niedostępny na komputerze właściciela i kończył `npm install` błędem `ETIMEDOUT`.

## Przyczyna

Lockfile został wygenerowany w środowisku budującym korzystającym z niestandardowego registry. Ponieważ wpisy były pełnymi URL-ami do custom registry, zmiana globalnego `npm config registry` na komputerze użytkownika nie gwarantowała ich zastąpienia.

## Naprawa

- zmieniono trzy URL-e `resolved` na publiczne `https://registry.npmjs.org/`;
- zachowano wersje i sumy `integrity` bez zmian;
- dodano projektowy `.npmrc`, aby kolejne operacje npm używały publicznego registry;
- dodano `repair-npm-registry.ps1` oraz `INSTALL_WINDOWS.md`.

## Zakres ryzyka

Nie zmieniono kodu źródłowego, danych gry, zależności ani ich wersji. Jest to wyłącznie poprawka dystrybucji i instalacji.

## Kontrole

- `package-lock.json` parsuje się jako poprawny JSON;
- lockfile nie zawiera już wewnętrznego hosta w polach instalacyjnych;
- URL-e publiczne odpowiadają tym samym pakietom i wersjom, a istniejące SHA-512 `integrity` pozostają mechanizmem weryfikacji pobranych archiwów;
- pełnego `npm install` z publicznego npm nie można było wykonać w środowisku OpenAI, ponieważ to środowisko nie rozwiązuje publicznego hosta `registry.npmjs.org`; instalację należy potwierdzić na komputerze właściciela.
