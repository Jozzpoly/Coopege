"""Oct26 Coopege authored-document test. Requires Python Playwright + local Chromium.
Run from any directory; uses exact pinned donor in sibling continuity folder.
No user's browser profile or save is opened or modified.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from tempfile import TemporaryDirectory
import hashlib
import json

HERE=Path(__file__).resolve().parent
GAME=HERE.parent/'continuity-2026-10-26'/'Coopege_Powrot_Do_Swiata_2026-10-26.html'
SCRIPT=HERE/'authoring-document.js'
EXPECTED='01095479ece35c7a6c3a981bbee90f9636d10bbf880fa18127f5dc56378694ff'
assert hashlib.sha256(GAME.read_bytes()).hexdigest()==EXPECTED, 'Donor HTML has changed; test must be reviewed'
html=GAME.read_text(encoding='utf-8')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(accept_downloads=True,viewport={'width':1200,'height':820})
    errors=[]
    def page():
        p=context.new_page()
        p.on('pageerror', lambda e:errors.append(str(e)))
        p.set_content(html,wait_until='load')
        p.add_script_tag(path=str(SCRIPT))
        return p
    src=page()
    before=src.evaluate("""async () => ({
      hp:TibiaContentAPI.exportPackage().monsters.rat.hp,
      tile:TibiaMapAPI.getTile(0,118,95),
      images:Object.keys((await TibiaAssetAPI.exportPackage({includeProcedural:false})).assets).length
    })""")
    assert before=={'hp':25,'tile':0,'images':0},before
    authored=src.evaluate("""async () => {
      const c=TibiaContentAPI.exportPackage();
      c.monsters.rat.hp=5;
      c.monsters.rat.name='Szczur testowego Studia';
      if(!TibiaContentAPI.importPackage(c).applied)throw Error('Content not applied');
      if(!TibiaMapAPI.setTile(0,118,95,2))throw Error('Tile not applied');
      const canvas=document.createElement('canvas');
      canvas.width=16;canvas.height=16;
      const g=canvas.getContext('2d');
      g.fillStyle='#cf4678';g.fillRect(0,0,16,16);
      g.fillStyle='#ffee55';g.fillRect(4,4,8,8);
      await TibiaAssetAPI.registerTexture('monster.rat',canvas.toDataURL('image/png'),
        {frameWidth:16,frameHeight:16,frames:1,directions:1});
      const capsule=await CoopegeAuthoringDocument.capture();
      return {capsule,check:CoopegeAuthoringDocument.validate(capsule)};
    }""")
    assert authored['check']['ok'],authored['check']
    assert authored['check']['summary']['floorCount']==5
    assert authored['check']['summary']['customTextureCount']==1
    with src.expect_download() as dl:
        src.evaluate("() => CoopegeAuthoringDocument.download()")
    with TemporaryDirectory() as tmp:
        dst=Path(tmp)/dl.value.suggested_filename
        dl.value.save_as(str(dst))
        doc=json.loads(dst.read_text(encoding='utf-8'))
        assert doc['project']['content']['monsters']['rat']['hp']==5
        assert doc['project']['assets']['assets']['monster.rat']['data']==authored['capsule']['project']['assets']['assets']['monster.rat']['data']
    print('PASS: captured real content/map/PNG and downloaded the project JSON')

    dst=page()
    report=dst.evaluate("""async doc => {
      const api=CoopegeAuthoringDocument;
      const preview=await api.preview(doc);
      const applied=await api.apply(doc,{mode:'cold-rebuild'});
      const result={
        hp:TibiaContentAPI.exportPackage().monsters.rat.hp,
        name:TibiaContentAPI.exportPackage().monsters.rat.name,
        tile:TibiaMapAPI.getTile(0,118,95),
        pngs:Object.keys((await TibiaAssetAPI.exportPackage({includeProcedural:false})).assets)
      };
      const undo=await api.undoLastApply();
      const restored={
        hp:TibiaContentAPI.exportPackage().monsters.rat.hp,
        tile:TibiaMapAPI.getTile(0,118,95),
        pngs:Object.keys((await TibiaAssetAPI.exportPackage({includeProcedural:false})).assets)
      };
      return {preview,applied,result,undo,restored};
    }""",doc)
    assert report['preview']['ok'] and 'rat' in report['preview']['changes']['monsterIds']
    assert '0' in report['preview']['changes']['floorIds']
    assert 'monster.rat' in report['preview']['changes']['customTexturesAdded']
    assert report['applied']['applied'] and report['applied']['verified'] and report['applied']['playability']
    assert report['result']=={'hp':5,'name':'Szczur testowego Studia','tile':2,'pngs':['monster.rat']}
    assert report['undo']['restored'] and report['undo']['verified']
    assert report['restored']=={'hp':25,'tile':0,'pngs':[]}
    print('PASS: cold import + explicit affected-content preview + in-memory undo')

    bad=dst.evaluate("""doc => {
      const d=JSON.parse(JSON.stringify(doc));
      d.worldId='another-world';const world=CoopegeAuthoringDocument.validate(d);
      d.worldId=doc.worldId;delete d.project.assets;
      const incomplete=CoopegeAuthoringDocument.validate(d);
      d.project.assets=doc.project.assets;
      d.project.content.monsters.rat.hp=5555555;
      const extreme=CoopegeAuthoringDocument.validate(d);
      return {world:world.ok,incomplete:incomplete.ok,extreme:extreme.ok};
    }""",doc)
    assert bad=={'world':False,'incomplete':False,'extreme':False},bad
    print('PASS: foreign world, incomplete authoring, unsupported numeric range rejected')
    # Deliberately invalid drafts must still be exportable for later authoring.
    with dst.expect_download() as draft_download:
        draft=dst.evaluate("""async doc => {
          const d=JSON.parse(JSON.stringify(doc));
          d.project.content.monsters.rat.hp=5555555;
          const validation=CoopegeAuthoringDocument.validate(d);
          const save=await CoopegeAuthoringDocument.download(d,'Coopege_Invalid_Draft.json');
          return {valid:validation.ok,reportedValid:save.liveImportValid,bytes:save.bytes};
        }""",doc)
    assert draft_download.value.suggested_filename=='Coopege_Invalid_Draft.json'
    assert draft['valid'] is False and draft['reportedValid'] is False and draft['bytes']>1000
    print('PASS: invalid experiment saved as draft; import remains disallowed')

    corrupt=dst.evaluate("""async doc => {
      const broken=JSON.parse(JSON.stringify(doc));
      broken.project.assets.assets['monster.rat'].data='data:image/png;base64,AAAA';
      const nativePreflight=CoopegeAuthoringDocument.validate(broken);
      let error='';
      try{await CoopegeAuthoringDocument.apply(broken,{mode:'cold-rebuild'});}catch(e){error=e.message;}
      return {nativePreflight:nativePreflight.ok,error,
        hp:TibiaContentAPI.exportPackage().monsters.rat.hp,
        tile:TibiaMapAPI.getTile(0,118,95),
        custom:Object.keys((await TibiaAssetAPI.exportPackage({includeProcedural:false})).assets).length};
    }""",doc)
    assert corrupt['nativePreflight'] and 'cannot be decoded' in corrupt['error'],corrupt
    assert (corrupt['hp'],corrupt['tile'],corrupt['custom'])==(25,0,0)
    print('PASS: invalid PNG detected BEFORE any authoring-state replacement')
    assert not errors,errors
    print('PASS: no JavaScript page errors; all scenarios complete')
    browser.close()
