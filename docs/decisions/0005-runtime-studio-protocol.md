# ADR — Wersjonowany protokół Runtime–Studio

## Status
Zaakceptowane — 2026-06-12

## Decyzja
Komunikacja używa ściśle walidowanych wiadomości `postMessage` z wersją protokołu, nonce sesji, request ID i capabilities.

## Konsekwencje
- Nowy most nie potrzebuje `allow-same-origin`.
- Nieznane typy i wersje są odrzucane.
- Zastosowanie projektu w preview jest atomowe.
