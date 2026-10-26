"""Reproduce the exact standalone hybrid combat HTML from a pinned donor and adapter."""
from pathlib import Path
import hashlib
ROOT = Path(__file__).resolve().parent
DONOR = ROOT.parent/'adventure-view'/'Coopege_Przestrzen_Przygody_2026-10-25.html'
ADAPTER = ROOT/'spatial-hybrid.js'
OUTPUT = ROOT/'Coopege_Walka_Hybrydowa_AB_2026-10-26.html'
assert hashlib.sha256(DONOR.read_bytes()).hexdigest() == 'd53cea3f2ef8faefbccd104f3b2d5a98d716b9afa1fb392125a5f07fe6c4bd9b'
s = DONOR.read_text(encoding='utf-8')
prefix = 'coopege_adventure_view_2026_10_25_'
assert s.count(prefix) >= 5
s = s.replace(prefix, 'coopege_hybrid_combat_2026_10_26_')
anchor = 'lastT=performance.now();requestAnimationFrame(loop);'
assert s.count(anchor) == 1
s = s.replace(anchor, ADAPTER.read_text(encoding='utf-8') + '\n' + anchor)
OUTPUT.write_text(s, encoding='utf-8')
digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
assert digest == '228b2c7b6b5d7f563e57685d83f79287ca93d914cb39369d8235fdb64fa86af6', digest
print('PASS exact hybrid build', OUTPUT.stat().st_size, digest)
