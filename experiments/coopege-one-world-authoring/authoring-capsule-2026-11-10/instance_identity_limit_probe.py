"""Oct26 RPG occurrence identity gap: transient local Rat variant dies with runtime actor.
Disposable Chromium: test-only observer, no Owner saves or game source edits.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
here=Path(__file__).resolve().parent
file=here.parent/'continuity-2026-10-26'/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
raw=file.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
html=raw.decode('utf-8')
assert html.count('function spawnAll(){')==html.count('function respawn(){')==1
html=html.replace('function spawnAll(){','window.__actors=()=>MON;window.__player=()=>PL;function spawnAll(){')
html=html.replace('function respawn(){','window.__respawn=()=>respawn();function respawn(){')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.keyboard.press('1')
 page.wait_for_timeout(120)
 r=page.evaluate("""()=>{
  const actors=window.__actors(),pl=window.__player(),
        rats=actors.filter(m=>m.alive&&m.tk==='rat'&&m.z===pl.z);
  const first=rats[0],second=rats[1];
  if(!first||!second)throw Error('Need two Rat actors');
  const originalHp=first.mhp,def=TibiaContentAPI.exportPackage().monsters.rat.hp;
  const group=first.spawnGroupId,prior=new Set(actors);
  first.name='Szczurzyca lokalna';first.mhp=5;first.hp=5;
  const local={first:[first.name,first.hp,first.mhp],second:[second.name,second.hp,second.mhp],
    authoredDefinition:TibiaContentAPI.exportPackage().monsters.rat.hp};
  first.hp=0;window.__respawn();
  const fresh=actors.filter(m=>!prior.has(m)&&m.tk==='rat'&&m.spawnGroupId===group);
  const groups=TibiaMapAPI.exportWorld().spawnGroups;
  return{originalHp,def,actorIds:actors.filter(m=>m.id!==undefined).length,
    groupCount:groups.length,
    memberCount:groups.reduce((n,g)=>n+Object.values(g.members||{}).flat().length,0),
    occurrenceIds:groups.some(g=>Object.values(g.members||{}).flat().some(x=>!Array.isArray(x)&&x?.id)),
    local,fresh:fresh.map(m=>[m.name,m.hp,m.mhp]),oldActorStillInArray:actors.includes(first)};
 }""")
 assert r['originalHp']==r['def']==25 and r['actorIds']==0 and not r['occurrenceIds'],r
 assert r['groupCount']==45 and r['memberCount']==338,r
 assert r['local']['first']==['Szczurzyca lokalna',5,5] and r['local']['second'][1]==25
 assert r['local']['authoredDefinition']==25
 assert r['fresh'] and all(x[1:]==[25,25] and x[0]!='Szczurzyca lokalna' for x in r['fresh']),r
 assert not errors,errors
 print('PASS negative: actor variant not durable; Oct26 338 anonymous points, 45 named groups; no stable actor IDs')
 b.close()
