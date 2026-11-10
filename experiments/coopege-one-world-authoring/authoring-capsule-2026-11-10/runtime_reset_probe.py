"""Explicit negative witness: unchanged native project import resets live monsters.
Test-only injection exposes the game's MON array; production source is untouched.
Run with Python Playwright and local Chromium, not on valuable browser storage.
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
# Test-only observer inside the same source lexical scope as the runtime actors.
html=html.replace('function spawnAll(){','window.__a0MonsterRefs=()=>MON;function spawnAll(){')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.keyboard.press('1') # actual playable warrior start; 338 authored spawn actors
    page.wait_for_timeout(100)
    r=page.evaluate("""async () => {
      const actors=window.__a0MonsterRefs();
      const actor=actors.find(a=>a.alive);
      const before=TibiaContentAPI.getRuntimeSnapshot().alive;
      // Simulate exactly one defeated actor in a disposable browser test.
      actor.hp=0;
      const defeated=TibiaContentAPI.getRuntimeSnapshot().alive;
      const project={
        format:TibiaProjectAPI.format,formatVersion:TibiaProjectAPI.formatVersion,
        content:TibiaContentAPI.exportPackage(),
        map:TibiaMapAPI.exportWorld(),
        assets:await TibiaAssetAPI.exportPackage({includeProcedural:false})
      };
      const applied=await TibiaProjectAPI.importProject(project); // identical authoring data!
      return {before,defeated,after:TibiaContentAPI.getRuntimeSnapshot().alive,
        actorReplaced:!window.__a0MonsterRefs().includes(actor),
        applied:applied.applied,playability:applied.ok};
    }""")
    print(r)
    assert r=={'before':338,'defeated':337,'after':338,'actorReplaced':True,'applied':True,'playability':True},r
    assert not errors,errors
    print('PASS (negative): no-op native project import reconstructs living spawn actors')
    browser.close()
