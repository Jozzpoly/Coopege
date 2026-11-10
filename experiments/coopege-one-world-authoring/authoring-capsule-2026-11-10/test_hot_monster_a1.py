"""Oct26 A1 authoring: one future-only Rat definition change, then respawn.
No Owner save, no hosted Jaskinia. Chromium on pinned source.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
here=Path(__file__).resolve().parent
game=here.parent/'continuity-2026-10-26'/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
raw=game.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
html=raw.decode('utf-8')
assert html.count('function respawn(){')==html.count('function spawnAll(){')==1
html=html.replace('function respawn(){','window.__labRespawn=()=>respawn();function respawn(){')
html=html.replace('function spawnAll(){','window.__labActors=()=>MON;window.__labPlayer=()=>PL;function spawnAll(){')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.add_script_tag(path=str(here/'hot-monster-a1.js'))
 page.keyboard.press('1')
 page.wait_for_timeout(120)
 r=page.evaluate("""()=>{
  const tool=CoopegeHotMonsterLab,mon=window.__labActors(),pl=window.__labPlayer();
  const rat=mon.find(m=>m.tk==='rat'&&m.alive&&m.z===pl.z);
  if(!rat)throw Error('No Rat spawn fixture');
  const before={hp:rat.hp,mhp:rat.mhp,alive:mon.filter(m=>m.alive).length,
    def:TibiaContentAPI.exportPackage().monsters.rat.hp};
  const plan=tool.prepare('rat',{hp:5});
  const applied=tool.apply(plan),def=TibiaContentAPI.exportPackage().monsters.rat.hp;
  const after={hp:rat.hp,mhp:rat.mhp,alive:mon.filter(m=>m.alive).length,
    actorPreserved:mon.includes(rat)};
  const prior=new Set(mon),group=rat.spawnGroupId;
  rat.hp=0;window.__labRespawn();
  const spawned=mon.filter(m=>!prior.has(m)&&m.tk==='rat'&&m.spawnGroupId===group);
  const modified=TibiaContentAPI.exportPackage();
  modified.monsters.rat.name='Szczur nowej edycji';
  TibiaContentAPI.importPackage(modified,{respawn:false,syncPlayer:false});
  const blocked=tool.undo();
  const again=TibiaContentAPI.exportPackage();
  again.monsters.rat.name='Szczur';
  TibiaContentAPI.importPackage(again,{respawn:false,syncPlayer:false});
  const undo=tool.undo();
  return{before,preview:plan.preview,applied,after,def,
    spawned:spawned.map(x=>({hp:x.hp,mhp:x.mhp,alive:x.alive})),
    blocked,undo,restoredDef:TibiaContentAPI.exportPackage().monsters.rat.hp};
 }""")
 assert r['before']=={'hp':25,'mhp':25,'alive':338,'def':25},r
 assert r['applied']['verified'] and r['after']=={'hp':25,'mhp':25,'alive':338,'actorPreserved':True},r
 assert r['def']==5 and r['spawned'] and all(x=={'hp':5,'mhp':5,'alive':True} for x in r['spawned']),r
 assert r['blocked']['conflict'] and r['undo']['restored'] and r['restoredDef']==25,r
 assert not errors,errors
 print('PASS: old rat 25, new rat 5; stale undo blocked; definition rollback; no JS errors')
 browser.close()
