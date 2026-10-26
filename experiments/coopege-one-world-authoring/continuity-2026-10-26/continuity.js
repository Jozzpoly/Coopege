// Coopege optional travel kit v0.1 — no network, no automatic cross-version reads.
// Evaluated inside the existing RPG IIFE; intentionally does not change the world rules.
const TravelKit=(()=>{
  const format='coopege-portable-snapshot-v1', world='silver-gate-world-v11', mapVersion=4;
  const current='coopege_continuity_2026_10_26_';
  const known=[
    {prefix:current,label:'Ta wersja — Powrót do świata'},
    {prefix:'coopege_hybrid_combat_2026_10_26_',label:'Walka Hybrydowa (26.10)'},
    {prefix:'coopege_spatial_timing_2026_10_26_',label:'Kontakt Zamachu B (26.10)'},
    {prefix:'coopege_spatial_combat_2026_10_26_',label:'Walka Przestrzenna B (26.10)'},
    {prefix:'coopege_adventure_view_2026_10_25_',label:'Widok Przygody (25.10)'}
  ];
  const suffixes=['save','roster','settings','assets','terrain_patch'];
  const backupKey=current+'preimport_backup';
  const limit=6_000_000;
  let planned=null, open=false, priorPaused=false, stopSaveUntilReload=false;
  let sourceChoice, fileInput, info, check, importBtn, rollbackBtn, wrapper;
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
  const readKeys=(prefix)=>Object.fromEntries(suffixes.map(k=>[k,localStorage.getItem(prefix+k)]));
  const exists=v=>typeof v==='string'&&v.length>0;
  const brief=(v,max=150)=>String(v||'').slice(0,max);
  function safeTree(o,depth=0){
    if(depth>16)return false;
    if(o===null||typeof o==='string'||typeof o==='boolean')return true;
    if(typeof o==='number')return Number.isFinite(o);
    if(Array.isArray(o))return o.length<12000&&o.every(v=>safeTree(v,depth+1));
    if(!plain(o))return false;
    const entries=Object.entries(o);
    return entries.length<12000&&entries.every(([k,v])=>k!=='__proto__'&&k!=='constructor'&&k!=='prototype'&&safeTree(v,depth+1));
  }
  const json=(str)=>{if(!exists(str))return null;const v=JSON.parse(str);if(!safeTree(v))throw new Error('Niebezpieczna struktura danych');return v;};
  function validSave(v){
    if(!plain(v)||v.version!==11||v.mapFormat!==mapVersion||!plain(v.player))return false;
    const p=v.player;
    if(!['warrior','archer','mage'].includes(p.classKey))return false;
    if(![p.x,p.y,p.z,p.lv,p.hp,p.mhp,p.gold].every(Number.isFinite))return false;
    if(p.x<0||p.x>MW*TILE||p.y<0||p.y>MH*TILE||!FLOORS.includes(p.z))return false;
    if(p.lv<1||p.lv>1000||p.mhp<=0||p.mhp>1000000||p.hp<0||p.hp>1000000||p.gold<0||p.gold>1000000000)return false;
    if(!Array.isArray(p.inv)||p.inv.length>MAX_INV||!p.inv.every(v=>plain(v)&&typeof v.id==='string'&&v.id.length<96))return false;
    if(!plain(p.equip)||!plain(p.stats)||!plain(p.talents))return false;
    if(!plain(v.quest)||!plain(v.kills))return false;
    if(v.courier!=null&&!plain(v.courier))return false;
    if(v.outpost!=null&&!plain(v.outpost))return false;
    return true;
  }
  function validateRaw(raw){
    if(!plain(raw)||Object.keys(raw).some(k=>!suffixes.includes(k)))throw new Error('Nieznane pola pakietu');
    const lengths=suffixes.map(k=>raw[k]?.length||0);
    if(lengths.reduce((a,b)=>a+b,0)>limit)throw new Error('Za duży pakiet (limit 6 MB)');
    for(const k of suffixes)if(raw[k]!==null&&raw[k]!==undefined&&typeof raw[k]!=='string')throw new Error('Nieprawidłowy zapis '+k);
    const save=json(raw.save),roster=json(raw.roster),settings=json(raw.settings),assets=json(raw.assets),terrain=json(raw.terrain_patch);
    if(!save && !roster && !settings && !assets && !terrain)throw new Error('Brak danych do przeniesienia');
    if(save&&!validSave(save))throw new Error('Niepasujący format postaci lub mapy');
    if(roster){
      if(!plain(roster)||Object.keys(roster).some(k=>!['warrior','archer','mage'].includes(k)))throw new Error('Nieznana lista postaci');
      if(Object.values(roster).some(v=>!validSave(v)))throw new Error('Niepoprawny zapis w liście postaci');
    }
    if(settings&&!plain(settings))throw new Error('Niepoprawne ustawienia');
    if(assets){
      const test=TibiaAssetAPI.validatePackage(assets);
      if(!test.ok||test.warnings.length)throw new Error('Niezgodny zestaw assetów; import wycofany');
      if(JSON.stringify(assets).length>4_500_000)throw new Error('Za dużo assetów dla pamięci gry');
    }
    if(terrain){
      if(terrain.edits?.length>0&&StudioLite.patches>0)throw new Error('Ta wersja ma już własne zmiany mapy. Najpierw zapisz je osobno i użyj czystego egzemplarza do odzyskania.');
      if(!plain(terrain)||terrain.format!=='coopege-authored-tiles-v1'||terrain.version!==1||terrain.world!=='Srebrna Brama / Tibia v14.1 donor'||!Array.isArray(terrain.edits)||terrain.edits.length>5000)throw new Error('Niepasujący format zmian mapy');
      const seen=new Set();
      for(const e of terrain.edits){
        if(!plain(e)||!['x','y','z','before','after'].every(k=>Number.isInteger(e[k])))throw new Error('Niepoprawne pole mapy');
        const key=e.z+'/'+e.x+'/'+e.y;
        if(seen.has(key)||!FLOORS.includes(e.z)||e.x<0||e.x>=MW||e.y<0||e.y>=MH||e.before<0||e.before>=18||e.after<0||e.after>=18||e.before===e.after)throw new Error('Zmiany mapy nie są zgodne');
        seen.add(key);
        // Validates against the exact donor, when current Studio has no own edits.
        if(StudioLite.patches===0&&TibiaMapAPI.getTile(e.z,e.x,e.y)!==e.before)throw new Error('Zmiana mapy dotyczy innego świata');
      }
    }
    return {save,roster,terrain,assets,counts:{characters:roster?Object.keys(roster).length:save?1:0,terrain:terrain?.edits?.length||0,assets:assets?Object.keys(assets.assets||{}).length:0},classKey:save?.player.classKey||null,level:save?.player.lv||null};
  }
  function preview(env){
    if(!plain(env)||env.format!==format||env.version!==1||env.world!==world||env.mapFormat!==mapVersion||!known.some(k=>k.prefix===env.sourcePrefix)||!safeTree(env))throw new Error('Plik pochodzi z innej lub nieobsługiwanej wersji');
    const raw=env.values,detail=validateRaw(raw);
    return {env,detail};
  }
  function planFromOlder(prefix){
    if(prefix===current||!known.some(k=>k.prefix===prefix))throw new Error('Wybierz znaną poprzednią wersję');
    return preview({format,version:1,world,mapFormat:mapVersion,sourcePrefix:prefix,values:readKeys(prefix)});
  }
  function ownEnvelope(){return {format,version:1,world,mapFormat:mapVersion,sourcePrefix:current,exportedAt:new Date().toISOString(),values:readKeys(current)};}
  function planFile(env){return preview(env);}
  function describe(plan){
    const d=plan.detail,count=d.counts;
    return 'Znaleziono: '+(d.classKey?`${d.classKey} poziom ${d.level}`:'brak aktywnej postaci')+`, ${count.characters} postaci, ${count.terrain} zmian terenu, ${count.assets} własnych grafik.\n`+
      'Źródło: '+known.find(k=>k.prefix===plan.env.sourcePrefix).label+'.\n'+
      'Dane docelowe nie są jeszcze modyfikowane. Po zatwierdzeniu potrzebne jest ponowne wczytanie pliku HTML.';
  }
  function exportNow(){
    if(StudioLite.open)throw new Error('Zamknij edytor F2 przed eksportem');
    if(gameState==='play'&&!saveGame(true))throw new Error('Nie udało się utrwalić postaci do kopii');
    const env=ownEnvelope();preview(env);
    fileDownload('Coopege-Moja-Przygoda-2026-10-26.json',new Blob([JSON.stringify(env,null,2)],{type:'application/json'}));
    return env;
  }
  function applyPlan(plan,{confirmed=false}={}){
    if(!confirmed||!plan||plan!==planned)throw new Error('Najpierw obejrzyj podgląd i świadomie potwierdź');
    if(StudioLite.open)throw new Error('Zamknij F2 przed importem');
    const validated=preview(plan.env);
    const currentValues=readKeys(current);
    // One rollback capsule for any existing target data; never touches the old source prefix.
    const oldBackup=localStorage.getItem(backupKey);
    const rollback={format:'coopege-preimport-rollback-v1',world,values:currentValues};
    const entries=validated.env.values;
    let backupMade=false;
    try{
      localStorage.setItem(backupKey,JSON.stringify(rollback));backupMade=true;
      for(const k of suffixes){if(exists(entries[k]))localStorage.setItem(current+k,entries[k]);else localStorage.removeItem(current+k);}
    }catch(e){
      for(const k of suffixes){try{if(currentValues[k]!==null)localStorage.setItem(current+k,currentValues[k]);else localStorage.removeItem(current+k);}catch(_){} }
      if(backupMade){try{if(oldBackup===null)localStorage.removeItem(backupKey);else localStorage.setItem(backupKey,oldBackup);}catch(_){} }
      throw new Error('Nie udało się zapisać bezpiecznie. Dane źródłowe nie zostały zmienione.');
    }
    stopSaveUntilReload=true;planned=null;
    return {applied:true,source:plan.env.sourcePrefix,needsReload:true};
  }
  function restorePrevious(){
    const raw=localStorage.getItem(backupKey);
    if(!raw)throw new Error('Brak kopii do cofnięcia');
    const backup=json(raw);
    if(!plain(backup)||backup.format!=='coopege-preimport-rollback-v1'||backup.world!==world)throw new Error('Nieznana kopia cofania');
    if(Object.values(backup.values||{}).some(exists))validateRaw(backup.values); // a fresh target can have an empty backup
    const before=readKeys(current);
    try{for(const k of suffixes){if(backup.values[k]!==null)localStorage.setItem(current+k,backup.values[k]);else localStorage.removeItem(current+k);}}
    catch(e){for(const k of suffixes)try{if(before[k]===null)localStorage.removeItem(current+k);else localStorage.setItem(current+k,before[k]);}catch(_){};throw new Error('Przywracanie się nie powiodło');}
    stopSaveUntilReload=true;return true;
  }
  const originalSave=saveGame;
  saveGame=function(...args){return stopSaveUntilReload?false:originalSave(...args);};
  function note(str,error=false){info.textContent=str;info.style.color=error?'#ffa7a7':'#b8e8cc';}
  function setPlan(p){planned=p;check.checked=false;importBtn.disabled=true;note(describe(p));}
  function toggle(){
    if(!wrapper)return;
    if(!open){if(StudioLite.open){note('Zamknij najpierw F2',true);return;}priorPaused=paused;paused=true;open=true;wrapper.style.display='block';}
    else{open=false;wrapper.style.display='none';paused=priorPaused;planned=null;}
  }
  function init(){
    const launch=document.createElement('button');launch.textContent='Powrót [F7]';launch.type='button';launch.title='Kopia postaci, mapy i własnych assetów';
    launch.style.cssText='position:fixed;left:12px;top:11px;z-index:930;background:#20373a;color:#f9e5bd;border:1px solid #a18b66;border-radius:6px;padding:8px;font:12px monospace;cursor:pointer;';launch.onclick=toggle;document.body.append(launch);
    wrapper=document.createElement('section');wrapper.style.cssText='position:fixed;z-index:940;left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,90vw);max-height:80vh;overflow:auto;background:#102028;color:#ecdec8;border:2px solid #b7a071;border-radius:10px;padding:15px;font:13px monospace;box-shadow:0 8px 70px #000c;display:none;';document.body.append(wrapper);
    const h=document.createElement('h3');h.textContent='Powrót do świata · bezpieczna próba';h.style.cssText='font: bold 17px monospace;margin:2px 0 10px';wrapper.append(h);
    const intro=document.createElement('p');intro.textContent='Stare zapisy pozostają nietknięte. Nic nie przenosimy automatycznie. Przed importem zobaczysz dokładny zakres.';wrapper.append(intro);
    const button=(label,click)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='background:#29424b;color:#ffe6bb;border:1px solid #786d53;border-radius:5px;padding:7px;margin:5px 3px;cursor:pointer;font:12px monospace';b.onclick=()=>{try{click();}catch(e){note(e.message,true);}};wrapper.append(b);return b;};
    button('Pobierz moje dane JSON',()=>{const env=exportNow();note('Przygotowano plik kopii. Nie zastępuje on kopii poza platformą.');});
    const line=document.createElement('hr');wrapper.append(line);
    const label=document.createElement('label');label.textContent='Odzyskaj z wcześniejszej wersji (ten sam magazyn przeglądarki):';wrapper.append(label);
    sourceChoice=document.createElement('select');sourceChoice.style.cssText='width:100%;background:#273a40;color:#ffecc8;padding:7px;margin:7px 0';
    for(const k of known.slice(1)){const o=document.createElement('option');o.value=k.prefix;o.textContent=k.label;sourceChoice.append(o);}wrapper.append(sourceChoice);
    button('Sprawdź wcześniejszy zapis',()=>setPlan(planFromOlder(sourceChoice.value)));
    wrapper.append(document.createElement('hr'));
    const labelFile=document.createElement('label');labelFile.textContent='Albo wybierz plik kopii przenośnej:';labelFile.style.cssText='display:block;margin:8px 0 5px';wrapper.append(labelFile);
    fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.style.cssText='display:block;max-width:100%;margin:6px 0';wrapper.append(fileInput);
    button('Sprawdź plik',async()=>{try{const f=fileInput.files?.[0];if(!f)throw new Error('Wybierz plik JSON');if(f.size>limit+100_000)throw new Error('Plik jest za duży');setPlan(planFile(JSON.parse(await f.text())));}catch(e){note(e.message,true);}});
    info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:12px monospace;background:#192d33;padding:10px;line-height:1.5';info.textContent='Brak wybranego importu.';wrapper.append(info);
    const confirm=document.createElement('label');confirm.style.cssText='display:block;margin:8px 0';check=document.createElement('input');check.type='checkbox';confirm.append(check);confirm.append(document.createTextNode(' Sprawdziłem podgląd i zgadzam się zastąpić dane TYLKO tej wersji'));wrapper.append(confirm);
    importBtn=button('Zastosuj import',()=>{const result=applyPlan(planned,{confirmed:check.checked});note('Przeniesiono. Kliknij «Przeładuj grę po imporcie». Do cofnięcia służy kopia sprzed importu.');});importBtn.disabled=true;
    check.onchange=()=>{importBtn.disabled=!check.checked||!planned;};
    button('Przeładuj grę po imporcie',()=>{if(!stopSaveUntilReload)throw new Error('Najpierw zastosuj lub cofnij import');location.reload();});
    rollbackBtn=button('Cofnij ostatni import',()=>{restorePrevious();note('Przywrócono poprzednie dane. Przeładuj stronę.');});
    button('Zamknij',toggle);
    window.addEventListener('keydown',e=>{if(e.key==='F7'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();toggle();}else if(open&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();toggle();}},true);
  }
  init();
  return Object.freeze({inspect:()=>({format,world,mapVersion,current,hasBackup:!!localStorage.getItem(backupKey),pending:!!planned,stopSaveUntilReload}),
    envelope:ownEnvelope,planFromOlder,planFile,preview,validateRaw,setPlan,applyPlan,restorePrevious,exportNow,toggle});
})();
window.CoopegeTravelKit=TravelKit;
