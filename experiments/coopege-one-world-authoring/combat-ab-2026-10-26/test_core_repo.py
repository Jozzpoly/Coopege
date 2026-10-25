"""Minimal isolated real-Chromium comparison. Only test fixtures may place monsters."""
from pathlib import Path
from playwright.sync_api import sync_playwright
s=Path(__file__).with_name('Coopege_Walka_Przestrzenna_AB_2026-10-26.html').read_text(encoding='utf-8')
a='lastT=performance.now();requestAnimationFrame(loop);'
assert s.count(a)==1
s=s.replace(a,'''window.__qaTick=s=>{for(let i=0;i<Math.ceil(s*60);i++)update(1/60)};
window.__qaSetup=()=>{MON.length=0;PL.tgt=null;PL.dir='s';PL.atkCd=0;
for(const [dy,name] of [[-29,'rear'],[29,'front']]){const m=new Monster(PL.x,PL.y+dy,'rat',PL.z);m.name=name;m.hp=200;m.mhp=200;m.upd=()=>{};MON.push(m);}}
window.__qaHP=()=>Object.fromEntries(MON.map(m=>[m.name,m.hp]));
'''+a)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.clock.install()
 p.set_content(s,wait_until='load');p.keyboard.press('1')
 p.evaluate('()=>__qaSetup()');p.keyboard.press('Space');classic=p.evaluate('()=>__qaHP()')
 assert classic['rear']<200 and classic['front']==200,classic
 p.evaluate('()=>__qaSetup()');p.keyboard.press('b');p.keyboard.press('Space');manual=p.evaluate('()=>__qaHP()')
 assert manual['front']<200 and manual['rear']==200,manual
 before=p.evaluate('()=>__qaHP()');p.evaluate('()=>__qaTick(2)');after=p.evaluate('()=>__qaHP()')
 assert before==after,(before,after)
 p.keyboard.press('b');assert p.evaluate('()=>CoopegeSpatialCombat.inspect().mode')=='legacy'
 assert not errors,errors
 print('PASS classic rear hit, B forward-only manual swing, no hidden repeats, reversible A/B; JS errors 0')
 b.close()
