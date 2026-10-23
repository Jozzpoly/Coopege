import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"../.."),out=resolve(root,".build/coopege-b1");
const witness=JSON.parse(readFileSync(resolve(root,".build/coopege-b0/source-authored-witness.json"),"utf8"));
if(witness.authored.spawnGroups.length<40||Object.keys(witness.authored.floors).length!==5)throw Error("Incomplete source witness");
const json=JSON.stringify(witness).replace(/</g,"\\u003c");
const core=readFileSync(resolve(root,"research/coopege-b1/world.js"),"utf8");
const renderer=readFileSync(resolve(root,"research/coopege-b1/view.js"),"utf8");
const html=`<!doctype html>
<html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coopege B4 — Trakt pod Srebrną Bramą</title>
<style>
:root{color-scheme:dark;font:14px system-ui,sans-serif;background:#101715;color:#e8dcc2}
*{box-sizing:border-box}body{margin:0;height:100dvh;overflow:hidden;display:flex;flex-direction:column}
header{display:flex;justify-content:space-between;align-items:center;padding:10px 18px;gap:18px;flex:none;background:linear-gradient(100deg,#2f382f,#1a2724);border-bottom:1px solid #817559}
h1{font:normal 22px Georgia,serif;color:#e9d1a0;margin:0}h1 small{color:#a6c2ac;font:13px system-ui}header p{font-size:11px;margin:4px 0 0;color:#c0cdbb;max-width:720px}
#hud{padding:9px 15px;color:#e7e2c3;background:#202b27;font-size:12px;font-weight:650;letter-spacing:.04em}
#meterbg{height:3px;background:#3b4236}#meter{height:100%;width:100%;background:#c4a76a;transition:width .1s linear}
main{flex:1;min-height:0;position:relative;background:#17271f}#game{display:block;width:100%;height:100%;touch-action:none}
footer{flex:none;background:#1d2825;border-top:1px solid #6f6551;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:49px;padding:8px 14px}
#message{color:#f0dcab;font-size:12px}#help{color:#acbfb1;font-size:11px;text-align:right}
#actions{display:flex;gap:6px;flex-wrap:wrap}
button{border:1px solid #61765d;background:#2b4435;color:#e9eccf;border-radius:7px;padding:7px 10px;font-size:11px;cursor:pointer}
button:hover{background:#426149}#hint{font-size:11px;color:#d5c9a7;max-width:310px;text-align:right}
@media(max-width:900px){header{padding:8px 12px}header p{display:none}h1{font-size:19px}#hint{display:none}#help{display:none}footer{min-height:60px;align-items:flex-start;flex-direction:column;gap:5px;padding:6px 12px}}
@media(max-width:520px){#hud{font-size:10px}#message{font-size:10px}}
</style></head>
<body>
<header><div><h1>Coopege <small>/ B4 — Oprawa świata</small></h1><p>Nie remont starych skryptów. Ten sam teren Srebrnej Bramy, nowa możliwość działania.</p></div>
<div id="hint">Wyprawa: wyjdź południową bramą. Ta sama mechanika B3. Kontrpróba świata, postaci i atmosfery. Wózek: napieraj ruchem lub chwyć myszą.</div></header>
<div id="hud">Ładowanie autorskiego świata…</div><div id="meterbg"><div id="meter"></div></div>
<main><canvas id="game" aria-label="Grywalny świat Coopege B3"></canvas></main>
<footer><div><div id="message">Otwieranie Srebrnej Bramy…</div><div id="help">WASD — ruch · Spacja — cios · Kontakt WASD — pchanie · LPM przy wózku — chwytaj/przeciągaj · E — rozmowa · R — opatrunek · P — zapisz · L — wczytaj · N — nowa próba</div></div>
<div id="actions"><button onclick="CoopegeB1Evidence.save()">Zapisz</button><button onclick="CoopegeB1Evidence.load()">Wczytaj</button><button onclick="CoopegeB1Evidence.reset()">Nowy świat</button></div></footer>
<script>${core}</script>
<script>${renderer}</script>
<script type="application/json" id="witness">${json}</script>
<script>
const source=JSON.parse(document.getElementById("witness").textContent);
window.CoopegeB1View.attach(source);
</script>
</body></html>`;
mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,"Coopege_B4_Trakt_Srebrnej_Bramy.html"),html);
console.info("COOPEGE_B1_BUILD",JSON.stringify({bytes:Buffer.byteLength(html),floors:Object.keys(witness.authored.floors).length,npc:witness.authored.npcs.length,group:witness.authored.spawnGroups.length}));
