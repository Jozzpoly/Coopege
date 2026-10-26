"""Chromium witness: manual Space, held attacks, AUTO T, and legacy A; no feel claims."""
from pathlib import Path
from playwright.sync_api import sync_playwright
source=Path(__file__).with_name('Coopege_Walka_Hybrydowa_AB_2026-10-26.html').read_text()
anchor='lastT=performance.now();requestAnimationFrame(loop);'
assert source.count(anchor)==1
source=source.replace(anchor, """window.__tick=t=>{for(let i=0;i<Math.round(t*120);i++)update(1/120)};
window.__mob=(dy=29)=>{MON.length=0;PL.dir='s';PL.atkCd=0;PL.tgt=null;
let m=new Monster(PL.x,PL.y+dy,'rat',PL.z);m.hp=400;m.mhp=400;m.upd=()=>{};MON.push(m)};
window.__hp=()=>MON[0].hp;
"""+anchor.replace('requestAnimationFrame(loop);','/* QA no animation frame */'))
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    p=browser.new_page();errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.clock.install();p.set_content(source,wait_until='load');p.keyboard.press('1');p.keyboard.press('b')
    s=lambda:p.evaluate('()=>CoopegeSpatialCombat.inspect()')
    tick=lambda t:p.evaluate('(t)=>__tick(t)',t)
    p.evaluate('()=>__mob()');p.keyboard.press('Space');tick(.15)
    assert p.evaluate('()=>__hp()')<400
    n=s()['swings'];tick(3);assert s()['swings']==n
    p.evaluate('()=>__mob()');p.keyboard.down('Space');tick(4.6)
    assert s()['heldStarts']>0 and s()['swings']>n+1,s()
    p.keyboard.up('Space');n=s()['swings'];tick(2.2);assert s()['swings']==n
    p.evaluate('()=>__mob(-29)');p.keyboard.press('t')
    assert s()['auto'];start=s()['swings'];tick(.20)
    assert s()['automaticStarts']>0 and s()['swings']>start and p.evaluate('()=>__hp()')<400,s()
    p.keyboard.press('t');p.keyboard.press('b');p.evaluate('()=>__mob(-29)')
    p.keyboard.press('Space');assert p.evaluate('()=>__hp()')<400
    assert not errors,errors
    print('PASS one tap, hold/release, T AUTO facing+timed contact, A reversible; pageerrors 0')
    browser.close()
