"""Rebuild exact standalone RPG A/B contact witness from the pinned adventure donor."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent
DONOR = ROOT.parent / 'adventure-view' / 'Coopege_Przestrzen_Przygody_2026-10-25.html'
ADAPTER = ROOT / 'spatial-timing.js'
OUTPUT = ROOT / 'Coopege_Kontakt_Zamachu_AB_2026-10-26.html'
assert hashlib.sha256(DONOR.read_bytes()).hexdigest() == 'd53cea3f2ef8faefbccd104f3b2d5a98d716b9afa1fb392125a5f07fe6c4bd9b'
s = DONOR.read_text(encoding='utf-8')
old = 'coopege_adventure_view_2026_10_25_'
assert s.count(old) >= 5
s = s.replace(old, 'coopege_spatial_timing_2026_10_26_')
anchor = 'lastT=performance.now();requestAnimationFrame(loop);'
assert s.count(anchor) == 1
s = s.replace(anchor, ADAPTER.read_text(encoding='utf-8') + '\n' + anchor)
OUTPUT.write_text(s, encoding='utf-8')
assert hashlib.sha256(OUTPUT.read_bytes()).hexdigest() == '9434b76ea967088e2ae98c4d6115f72e8bf4002b51bbcb39552353561417156e'
print('PASS exact standalone contact build', OUTPUT.stat().st_size)
