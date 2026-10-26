"""Minimal Chromium countertest; the complete QA suite is in the portable ZIP."""
from pathlib import Path
from playwright.sync_api import sync_playwright

s=Path(__file__).with_name('Coopege_Powrot_Do_Swiata_2026-10-26.html').read_text(encoding='utf-8')
mock="""<script>
window.__DATA=Object.create(null);
Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({
getItem:k=>Object.hasOwn(__DATA,k)?__DATA[k]:null,
setItem:(k,v)=>__DATA[k]=String(v),removeItem:k=>delete __DATA[k]})});
</script>"""
s=s.replace('<script>',mock+'<script>',1)
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install();page.set_content(s,wait_until='load')
    page.keyboard.press('F9')
    assert page.locator('#asset-panel-v12').evaluate('(e)=>e.style.display')=='flex'
    page.keyboard.press('F9')
    page.keyboard.press('1');page.keyboard.press('k')
    key='coopege_continuity_2026_10_26_save'
    old='coopege_hybrid_combat_2026_10_26_save'
    page.evaluate('([key,old])=>{__DATA[old]=__DATA[key]}',[key,old])
    before=page.evaluate('()=>JSON.stringify(__DATA)')
    plan=page.evaluate('()=>CoopegeTravelKit.planFromOlder("coopege_hybrid_combat_2026_10_26_")')
    assert plan['detail']['classKey']=='warrior'
    assert page.evaluate('()=>JSON.stringify(__DATA)')==before
    page.keyboard.press('F7')
    page.get_by_role('button',name='Sprawdź wcześniejszy zapis').click()
    assert page.get_by_role('button',name='Zastosuj import').is_disabled()
    page.get_by_role('checkbox').check()
    page.get_by_role('button',name='Zastosuj import').click()
    assert page.evaluate('(key)=>__DATA[key]',old)==page.evaluate('(key)=>__DATA[key]',key)
    assert page.evaluate('()=>CoopegeTravelKit.inspect().hasBackup')
    page.get_by_role('button',name='Cofnij ostatni import').click()
    assert page.evaluate('(key)=>__DATA[key]',old)==page.evaluate('(key)=>__DATA[key]',key)
    assert not errors,errors
    print('PASS F9 preserved, F7 preview/confirmation, exact source retention and rollback')
    b.close()
