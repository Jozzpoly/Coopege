"""Build exact standalone RPG A/B witness from the pinned sibling Adventure View donor."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parent
DONOR=ROOT.parent/'adventure-view'/'Coopege_Przestrzen_Przygody_2026-10-25.html'
ADAPTER=ROOT/'spatial-combat.js'
OUTPUT=ROOT/'Coopege_Walka_Przestrzenna_AB_2026-10-26.html'
assert hashlib.sha256(DONOR.read_bytes()).hexdigest()=='d53cea3f2ef8faefbccd104f3b2d5a98d716b9afa1fb392125a5f07fe6c4bd9b', 'Unexpected donor version'
s=DONOR.read_text(encoding='utf-8')
old='coopege_adventure_view_2026_10_25_'
new='coopege_spatial_combat_2026_10_26_'
assert s.count(old)>=5
s=s.replace(old,new)
a='lastT=performance.now();requestAnimationFrame(loop);'
assert s.count(a)==1
s=s.replace(a,ADAPTER.read_text(encoding='utf-8')+'\n'+a)
OUTPUT.write_text(s,encoding='utf-8')
print('SHA-256',hashlib.sha256(OUTPUT.read_bytes()).hexdigest(), 'bytes',OUTPUT.stat().st_size)
