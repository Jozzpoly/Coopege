"""A0 non-destructive and conflict witness on pinned Oct26 playable HTML.
This test injects a test-only read-only accessor to the runtime monster list.
It MUST NOT be used against Owner saves or a production browser profile.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib

here = Path(__file__).resolve().parent
donor = here.parent / 'continuity-2026-10-26' / 'Coopege_Powrot_Do_Swiata_2026-10-26.html'
data = donor.read_bytes()
assert hashlib.sha256(data).hexdigest() == '01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
html = data.decode('utf-8')
assert html.count('function spawnAll(){') == 1
html = html.replace('function spawnAll(){','window.__a0Actors=()=>MON;function spawnAll(){')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.add_script_tag(path=str(here/'authoring-document.js'))
    page.keyboard.press('1')
    page.wait_for_timeout(100)
    result=page.evaluate("""async () => {
      const a=CoopegeAuthoringDocument;
      const actor=window.__a0Actors().find(m=>m.alive&&m.tk==='rat');
      if(!actor)throw Error('No live Rat actor');
      const before=TibiaContentAPI.getRuntimeSnapshot().alive;
      const original=await a.capture();
      actor.hp=0;
      const defeated=TibiaContentAPI.getRuntimeSnapshot().alive;
      // A no-op authoring import must not revive this defeated actor.
      const noOp=await a.apply(original);
      const afterNoOp=TibiaContentAPI.getRuntimeSnapshot().alive;
      const sameActor=window.__a0Actors().includes(actor);
      const changed=JSON.parse(JSON.stringify(original));
      changed.project.content.monsters.rat.hp=5;
      let blocked='';
      try{await a.apply(changed);}catch(e){blocked=e.message;}
      const afterBlocked=TibiaContentAPI.getRuntimeSnapshot().alive;
      const proposal=await a.preview(changed);const committed=await a.apply(changed,{mode:'cold-rebuild',proposalId:proposal.proposalId});
      const afterCold=TibiaContentAPI.getRuntimeSnapshot().alive;
      // An independent authored tile edit after import must block blind undo.
      const edited=TibiaMapAPI.setTile(0,118,95,2);
      const conflict=await a.undoLastApply();
      const still={hp:TibiaContentAPI.exportPackage().monsters.rat.hp,tile:TibiaMapAPI.getTile(0,118,95)};
      TibiaMapAPI.setTile(0,118,95,0);
      const undo=await a.undoLastApply();
      const restored={hp:TibiaContentAPI.exportPackage().monsters.rat.hp,tile:TibiaMapAPI.getTile(0,118,95)};
      const changedEntrance=JSON.parse(JSON.stringify(original));
      changedEntrance.project.map.entrances[0].name='changed';
      const cmp=a.compareAuthoring(original.project,changedEntrance.project);
      return {before,defeated,noOp,afterNoOp,sameActor,blocked,afterBlocked,
              committed,afterCold,edited,conflict,still,undo,restored,cmp};
    }""")
    print(result)
    assert result['before']==338 and result['defeated']==337
    assert result['noOp']['unchanged'] and not result['noOp']['applied']
    assert result['afterNoOp']==337 and result['sameActor']
    assert 'cold-rebuild' in result['blocked'] and result['afterBlocked']==337
    assert result['committed']['applied'] and result['committed']['verified']
    assert result['afterCold']==338 and result['edited']
    assert result['conflict']['conflict'] and not result['conflict']['restored']
    assert result['still']=={'hp':5,'tile':2}
    assert result['undo']['restored'] and result['restored']=={'hp':25,'tile':0}
    assert result['cmp']['errors']==['Authored map differs']
    assert not errors,errors
    print('PASS: no-op protects live actor, guarded cold apply, post-import edit blocks undo, complete map comparison')
    browser.close()
