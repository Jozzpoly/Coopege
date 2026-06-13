# ADR — Project-first jako źródło prawdy

## Status
Zaakceptowane — 2026-06-12

## Decyzja
Kanonicznym źródłem danych jest wersjonowany projekt Coopege. Runtime otrzymuje snapshot; Studio otwiera projekt bez potrzeby analizowania pliku HTML gry.

## Konsekwencje
- Preview i standalone build muszą korzystać z tego samego zwalidowanego snapshotu.
- Stan runtime, zapis postaci i stan UI Studia nie są definicjami contentu.
- Legacy HTML jest wejściem migracyjnym, nigdy bieżącą bazą danych.
