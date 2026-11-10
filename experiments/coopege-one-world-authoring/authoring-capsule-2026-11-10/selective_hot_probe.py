"""Probe real Oct26 Coopege selective live APIs without re-spawning its actors.
Separate authoring definition from the current monster instance, map, and PNG.
Observer accessor exists only in disposable browser HTML (no source changes).
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
html=html.replace('function spawnAll(){',
    'window.__probeActors=()=>MON;window.__probePlayer=()=>PL;window.__probeQuest=()=>QUEST;function spawnAll(){')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.keyboard.press('1') # Actual warrior game starts
    page.wait_for_timeout(100)
    result=page.evaluate("""async () => {
      const actors=window.__probeActors(),rat=actors.find(m=>m.tk==='rat'&&m.alive);
      const player=window.__probePlayer(),quest=window.__probeQuest();
      const state=()=>({
        alive:window.__probeActors().filter(m=>m.alive).length,
        player:{x:player.x,y:player.y,z:player.z,hp:player.hp,mhp:player.mhp,
                mp:player.mp,mmp:player.mmp,lv:player.lv},
        quest:{index:quest.index,progress:quest.progress,completed:quest.completed},
        rat:{hp:rat.hp,mhp:rat.mhp,sameActor:window.__probeActors().includes(rat)}
      });
      const before=state(),original=TibiaContentAPI.exportPackage();
      const edited=JSON.parse(JSON.stringify(original));edited.monsters.rat.hp=5;
      const changedDefinition=TibiaContentAPI.importPackage(edited,{respawn:false,syncPlayer:false});
      const newDefinitionHp=TibiaContentAPI.exportPackage().monsters.rat.hp;
      const afterDefinition=state();
      const originalTile=TibiaMapAPI.getTile(0,118,95);
      const tileChanged=TibiaMapAPI.setTile(0,118,95,2);
      const afterTerrain=state();
      const canvas=document.createElement('canvas');
      canvas.width=16;canvas.height=16;canvas.getContext('2d').fillRect(0,0,16,16);
      await TibiaAssetAPI.registerTexture('monster.rat',canvas.toDataURL('image/png'),
        {frameWidth:16,frameHeight:16,frames:1,directions:1});
      const pngPresent=!!(await TibiaAssetAPI.exportPackage({includeProcedural:false})).assets['monster.rat'];
      const afterAsset=state();
      TibiaMapAPI.setTile(0,118,95,originalTile);
      TibiaAssetAPI.removeTexture('monster.rat');
      TibiaContentAPI.importPackage(original,{respawn:false,syncPlayer:false});
      const restored=state();
      return {before,newDefinitionHp,applied:changedDefinition.applied,afterDefinition,
        tileChanged,afterTerrain,pngPresent,afterAsset,restored};
    }""")
    assert result['before']['alive']==338
    assert result['newDefinitionHp']==5 and result['applied']
    assert result['tileChanged'] and result['pngPresent']
    for key in ('afterDefinition','afterTerrain','afterAsset','restored'):
        assert result[key]==result['before'],(key,result[key])
    assert not errors,errors
    print('PASS: authored definition 25→5, tile and PNG while real Rat stays 25/25;')
    print('PASS: 338 actor identities, player stats/position and quest state unchanged;')
    print('PASS: original authoring state restored; no page errors.')
    browser.close()
