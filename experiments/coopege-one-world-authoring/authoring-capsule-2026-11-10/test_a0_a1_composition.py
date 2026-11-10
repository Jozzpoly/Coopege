"""A0+A1 integration: edit existing live definition, save authored JSON, cold-reopen.
Pinned Oct26 game, disposable Chromium; no user data or Jaskinia changes.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import json,hashlib
here=Path(__file__).resolve().parent
game=here.parent/'continuity-2026-10-26'/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
raw=game.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
html=raw.decode('utf-8')
assert html.count('function spawnAll(){')==1
html=html.replace('function spawnAll(){','window.__getActors=()=>MON;function spawnAll(){')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(accept_downloads=True)
 errors=[]
 def page():
  p=ctx.new_page()
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(html,wait_until='load')
  p.add_script_tag(path=str(here/'authoring-document.js'))
  p.add_script_tag(path=str(here/'hot-monster-a1.js'))
  return p
 p1=page()
 p1.keyboard.press('1')
 p1.wait_for_timeout(100)
 first=p1.evaluate("""()=>{
   const old=window.__getActors().find(a=>a.tk==='rat'&&a.alive);
   const before=old.mhp,plan=CoopegeHotMonsterLab.prepare('rat',{hp:5,name:'Szczur twórczy A1'});
   const applied=CoopegeHotMonsterLab.apply(plan);
   return{before,oldHp:old.mhp,definition:TibiaContentAPI.exportPackage().monsters.rat.hp,
     oldActorPreserved:window.__getActors().includes(old),applied:applied.applied};
 }""")
 assert first=={'before':25,'oldHp':25,'definition':5,'oldActorPreserved':True,'applied':True},first
 with p1.expect_download() as dl:
  p1.evaluate('() => CoopegeAuthoringDocument.download()')
 with TemporaryDirectory() as tmp:
  dest=Path(tmp)/dl.value.suggested_filename
  dl.value.save_as(str(dest))
  authoring=json.loads(dest.read_text(encoding='utf-8'))
  assert authoring['project']['content']['monsters']['rat']['hp']==5
  p2=page()
  p2.keyboard.press('1')
  p2.wait_for_timeout(100)
  imported=p2.evaluate("""async cap=>{
     const before=TibiaContentAPI.exportPackage().monsters.rat.hp;
     const preview=await CoopegeAuthoringDocument.preview(cap);
     const result=await CoopegeAuthoringDocument.apply(cap,{mode:'cold-rebuild'});
     const rat=TibiaContentAPI.exportPackage().monsters.rat;
     const actor=window.__getActors().find(a=>a.alive&&a.tk==='rat');
     return{before,changed:preview.changes.monsterIds,verified:result.verified,
       hp:rat.hp,name:rat.name,actorHp:actor.mhp};
  }""",authoring)
  assert imported=={'before':25,'changed':['rat'],'verified':True,
                   'hp':5,'name':'Szczur twórczy A1','actorHp':5},imported
 stale=p1.evaluate("""()=>{
   const plan=CoopegeHotMonsterLab.prepare('rat',{hp:12});
   const changed=TibiaContentAPI.exportPackage();
   changed.monsters.rat.name='Rival Edit';
   TibiaContentAPI.importPackage(changed,{respawn:false,syncPlayer:false});
   let reason='';try{CoopegeHotMonsterLab.apply(plan)}catch(e){reason=e.message}
   return{reason,hp:TibiaContentAPI.exportPackage().monsters.rat.hp,
     name:TibiaContentAPI.exportPackage().monsters.rat.name};
 }""")
 assert 'Content changed since preparation' in stale['reason'],stale
 assert stale['hp']==5 and stale['name']=='Rival Edit'
 assert not errors,errors
 print('PASS: live definition future-only, downloaded JSON, cold runtime import, stale plan rejection')
 browser.close()
