"""Chromium regression: no sword damage before visible contact, no hidden B autoattack.
Requires local Python Playwright and Chromium. Synthetic enemy position is test-only.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
s = (root / 'Coopege_Kontakt_Zamachu_AB_2026-10-26.html').read_text()
anchor = 'lastT=performance.now();requestAnimationFrame(loop);'
assert s.count(anchor) == 1
fixture = """window.__qaTick=t=>{for(let i=0;i<Math.round(t*600);i++)update(1/600)};
window.__qaSetup=()=>{MON.length=0;PL.dir='s';PL.atkCd=0;PL.tgt=null;autoTarget=false;
const m=new Monster(PL.x,PL.y+29,'rat',PL.z);m.hp=200;m.mhp=200;m.upd=()=>{};MON.push(m);};
window.__qaHP=()=>MON[0].hp;
"""
# Disable background RAF only in QA so time advances exactly when the test commands.
s = s.replace(anchor, fixture + 'lastT=performance.now(); /* QA only: no RAF */')
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                 args=['--no-sandbox', '--disable-dev-shm-usage'])
    p = browser.new_page(); errors = []
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.clock.install(); p.set_content(s, wait_until='load')
    p.keyboard.press('1'); p.evaluate('()=>__qaSetup()')
    p.keyboard.press('Space')
    assert p.evaluate('()=>__qaHP()') < 200, 'Legacy A changed'
    p.keyboard.press('b'); p.evaluate('()=>__qaSetup()')
    p.keyboard.press('Space')
    assert p.evaluate('()=>__qaHP()') == 200, 'B struck before animation contact'
    p.evaluate('()=>__qaTick(.09)')
    assert p.evaluate('()=>__qaHP()') == 200, 'B struck before 90 ms'
    p.evaluate('()=>__qaTick(.06)')
    assert p.evaluate('()=>__qaHP()') < 200, 'B did not strike during visible swing'
    hp = p.evaluate('()=>__qaHP()'); p.evaluate('()=>__qaTick(2)')
    assert p.evaluate('()=>__qaHP()') == hp, 'B automatically repeated the attack'
    assert not errors, errors
    print('PASS A instant vs B delayed, after ~135 ms, no automatic repeat or JS errors')
    browser.close()
