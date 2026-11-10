"""Research falsifier: applying a definition without respawn preserves current actors.
Only a read-only actor observer is added to test HTML, original donor stays intact.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib

here=Path(__file__).resolve().parent
donor=here.parent/'continuity-2026-10-26'/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
data=donor.read_bytes()
assert hashlib.sha256(data).hexdigest()=='01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
html=data.decode('utf-8')
assert html.count('function spawnAll(){')==1
html=html.replace('function spawnAll(){','window.__probeActorList=()=>MON;function spawnAll(){')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.keyboard.press('1')
    page.wait_for_timeout(100)
    result=page.evaluate("""()=>{
      const rat=window.__probeActorList().find(a=>a.tk==='rat' && a.alive);
      const before={hp:rat.hp,mhp:rat.mhp,def:TibiaContentAPI.exportPackage().monsters.rat.hp};
      const content=TibiaContentAPI.exportPackage();
      content.monsters.rat.hp=5;
      const applied=TibiaContentAPI.importPackage(content,{respawn:false});
      const after={hp:rat.hp,mhp:rat.mhp,def:TibiaContentAPI.exportPackage().monsters.rat.hp};
      return {before,after,actorPreserved:window.__probeActorList().includes(rat),
        alive:TibiaContentAPI.getRuntimeSnapshot().alive,applied:applied.applied};
    }""")
    print(result)
    assert result=={
      'before':{'hp':25,'mhp':25,'def':25},
      'after':{'hp':25,'mhp':25,'def':5},
      'actorPreserved':True,'alive':338,'applied':True},result
    assert not errors,errors
    print('PASS: definition changes but existing rat actors keep 25 HP without respawn')
    browser.close()
