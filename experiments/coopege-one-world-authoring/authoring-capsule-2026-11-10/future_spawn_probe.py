"""Oct26 Rat: current actor 25 HP, future respawn uses 5 HP definition."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
base=Path(__file__).resolve().parent
file=base.parent/'continuity-2026-10-26'/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
raw=file.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
html=raw.decode()
assert html.count('function respawn(){')==html.count('function spawnAll(){')==1
html=html.replace('function respawn(){','window.__probeRespawn=()=>respawn();function respawn(){')
html=html.replace('function spawnAll(){','window.__actors=()=>MON;window.__player=()=>PL;function spawnAll(){')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.keyboard.press('1')
 page.wait_for_timeout(150)
 r=page.evaluate("""()=>{
   const mon=window.__actors(),pl=window.__player();
   const rat=mon.find(m=>m.alive&&m.z===pl.z&&m.tk==='rat');
   const known=new Set(mon),group=rat.spawnGroupId,oldHp=rat.mhp;
   rat.hp=0;
   const defs=TibiaContentAPI.exportPackage();defs.monsters.rat.hp=5;
   const changed=TibiaContentAPI.importPackage(defs,{respawn:false,syncPlayer:false});
   const current=rat.mhp,def=TibiaContentAPI.exportPackage().monsters.rat.hp;
   const alive=mon.filter(m=>m.alive).length;
   window.__probeRespawn();
   const fresh=mon.filter(m=>!known.has(m)&&m.tk==='rat'&&m.spawnGroupId===group);
   return{oldHp,current,def,alive,applied:changed.applied,fresh:fresh.map(m=>[m.hp,m.mhp,m.alive]),preserved:mon.includes(rat)};
 }""")
 assert r['applied'] and r['oldHp']==r['current']==25 and r['def']==5 and r['alive']==337
 assert r['preserved'] and r['fresh'] and all(x==[5,5,True] for x in r['fresh']),r
 assert not errors,errors
 print('PASS: old Rat remains 25, new Rat 5, no full respawn')
 b.close()
