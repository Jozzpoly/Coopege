"""Rebuild the isolated Coopege portable-return candidate byte-for-byte."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parent
DONOR = ROOT/'Coopege_Walka_Hybrydowa_AB_2026-10-26_DONOR.html'
if not DONOR.exists():
    DONOR = ROOT.parent/'combat-hybrid-2026-10-26'/'Coopege_Walka_Hybrydowa_AB_2026-10-26.html'
ADAPTER=ROOT/'continuity.js'
OUTPUT=ROOT/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
assert hashlib.sha256(DONOR.read_bytes()).hexdigest()=='228b2c7b6b5d7f563e57685d83f79287ca93d914cb39369d8235fdb64fa86af6', 'Donor changed'
s=DONOR.read_text(encoding='utf-8')
old='coopege_hybrid_combat_2026_10_26_'
assert s.count(old)==5, 'Unexpected browser-storage namespace'
s=s.replace(old,'coopege_continuity_2026_10_26_')
anchor='lastT=performance.now();requestAnimationFrame(loop);'
assert s.count(anchor)==1
s=s.replace(anchor,ADAPTER.read_text(encoding='utf-8')+'\n'+anchor)
OUTPUT.write_text(s,encoding='utf-8')
print('Rebuilt', OUTPUT.stat().st_size, hashlib.sha256(OUTPUT.read_bytes()).hexdigest())
