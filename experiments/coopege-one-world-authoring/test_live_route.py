"""One-world in-browser authoring regression; intentionally not an AI/feel test.
Run: python test_live_route.py (Playwright + local Chromium). No network/save origin.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).with_name('Coopege_One_World_Studio_Trial.html').read_text(encoding='utf-8')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install()
    page.set_content(html, wait_until='load')
    page.keyboard.press('1')
    page.keyboard.down('s')
    page.clock.run_for(5600)
    page.keyboard.up('s')
    started = page.evaluate('() => window.CoopegeOneWorldTrial.inspect()')
    assert started['phase'] == 'returning', started
    page.clock.run_for(1000)
    before = page.evaluate('() => window.CoopegeOneWorldTrial.inspect()')
    assert before['actor']['x'] == 86.5 and before['actor']['y'] > 110, before
    tile = page.evaluate('() => window.TibiaMapAPI.getTile(0,86,110)')
    assert tile != 2, tile
    patch = {'format': 'coopege-authored-tiles-v1', 'version': 1,
             'edits': [{'z':0, 'x':86, 'y':110, 'before':tile, 'after':2}]}
    page.keyboard.press('F2')
    assert page.evaluate('() => window.CoopegeStudioLite.open')
    assert page.evaluate('(p) => window.CoopegeStudioLite.importPatch(p)', patch)
    assert page.evaluate('() => window.TibiaMapAPI.getTile(0,86,110)') == 2
    page.keyboard.press('F2')
    page.clock.run_for(4700)
    after = page.evaluate('() => window.CoopegeOneWorldTrial.inspect()')
    assert after['repaths'] >= 1, after
    assert after['actor']['x'] < 86 and after['actor']['y'] < 110, after
    assert after['actor']['alive'], after
    assert page.evaluate('() => window.TibiaMapAPI.getTile(0,86,110)') == 2
    assert not errors, errors
    print('PASS: live authored barrier after route planning; player used natural WASD; NPC detoured in same RPG world')
    print(f"courier {before['actor']['x']:.2f},{before['actor']['y']:.2f} -> {after['actor']['x']:.2f},{after['actor']['y']:.2f}; replans={after['repaths']}; JS errors={len(errors)}")
    browser.close()
