/* Coopege Oct26 — isolated authoring-document R&D adapter.
   No own Studio UI, game save, host contract or engine replacement. */
(function installCoopegeAuthoringDocument(root) {
  'use strict';
  const FORMAT='coopege-authoring-capsule', VERSION=1;
  const SOURCE='Coopege_Powrot_Do_Swiata_2026-10-26', MAX=32*1024*1024;
  let rollback=null,mutationBusy=false;
  const own=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
  const clone=obj=>JSON.parse(JSON.stringify(obj));
  function host() {
    const api={project:root.TibiaProjectAPI,content:root.TibiaContentAPI,
      map:root.TibiaMapAPI,asset:root.TibiaAssetAPI};
    if(Object.values(api).some(v=>!v))throw Error('Coopege domain API unavailable');
    return api;
  }
  async function snapshot() {
    const a=host();
    const p={format:a.project.format,formatVersion:a.project.formatVersion,
      content:a.content.exportPackage(),map:a.map.exportWorld(),
      assets:await a.asset.exportPackage({includeProcedural:false})};
    // Even a deliberately invalid draft must remain exportable for later editing.
    // Live import has stricter preconditions than saving the author's source.
    return p;
  }
  async function capture() {
    if(mutationBusy)throw Error('Authoring mutation in progress; capture is not a consistent snapshot');
    const p=await snapshot(),a=host();
    return {capsuleFormat:FORMAT,capsuleVersion:VERSION,capturedAt:new Date().toISOString(),
      source:SOURCE,worldId:p.map.world.id,engineVersion:a.project.engineVersion,project:p};
  }
  function parse(input) {
    if(typeof input==='string'){
      if(input.length>MAX)throw Error('Capsule too large');
      try{return JSON.parse(input);}catch(e){throw Error('Invalid JSON');}
    }
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected JSON object');
    return input;
  }
  function validate(input) {
    const c=parse(input),a=host(),errors=[];
    if(c.capsuleFormat!==FORMAT||c.capsuleVersion!==VERSION)errors.push('Unknown capsule format');
    if(!c.project||typeof c.project!=='object')errors.push('Missing project');
    if(!c.project||!['content','map','assets'].every(k=>own(c.project,k)))
      errors.push('Incomplete authoring project');
    if(c.project?.format!==a.project.format||c.project?.formatVersion!==a.project.formatVersion)
      errors.push('Incompatible native project');
    if(c.project?.map?.world?.id!==c.worldId)errors.push('Internal world ID mismatch');
    if(c.worldId!==a.map.exportWorld().world.id)errors.push('Different world');
    if(c.engineVersion!==a.project.engineVersion)errors.push('Engine version differs');
    let native={ok:false,errors:[],warnings:[]};
    if(!errors.length)try{native=a.project.validateProject(c.project);}
      catch(e){errors.push('Native preflight threw: '+e.message);}
    const bytes=JSON.stringify(c).length;
    if(bytes>MAX)errors.push('Capsule too large');
    return {ok:errors.length===0&&native.ok,
      problems:errors.concat(native.errors||[]),warnings:native.warnings||[],
      summary:{worldId:c.worldId,
        floorCount:Object.keys(c.project?.map?.floors||{}).length,
        monsterCount:Object.keys(c.project?.content?.monsters||{}).length,
        questCount:Array.isArray(c.project?.content?.quests)?c.project.content.quests.length:0,
        customTextureCount:Object.keys(c.project?.assets?.assets||{}).length,bytes}};
  }
  // Native Oct26 changes only these known serialisation details on reimport.
  // Every other authored field must compare, including entrances, spawns,
  // playability, classes, quests and exact custom asset metadata.
  function authoredCanonical(p){
    const x=clone(p);
    if(x.content)delete x.content.exportedAt;
    if(x.map?.world)delete x.map.world.exportedAt;
    if(x.assets)delete x.assets.createdAt;
    if(Array.isArray(x.map?.spawnGroups))
      x.map.spawnGroups.forEach(g=>{g.eliteCount=g.eliteCount??0;});
    return x;
  }
  const stable=v=>Array.isArray(v)?v.map(stable):
    v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  function compareAuthoring(a,b){
    const before=authoredCanonical(a),after=authoredCanonical(b),errors=[];
    for(const section of ['format','formatVersion','content','map','assets']){
      if(!same(before[section],after[section]))errors.push('Authored '+section+' differs');
    }
    return{ok:errors.length===0,errors};
  }
  async function preview(input){
    if(mutationBusy)throw Error('Authoring mutation in progress; preview requires a stable snapshot');
    const c=parse(input),check=validate(c);
    if(!check.ok)return{ok:false,check};
    const current=await snapshot(),next=c.project;
    const diff=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])]
      .filter(k=>!same(a[k],b[k]));
    const x=current.assets.assets||{},y=next.assets.assets||{};
    return{ok:true,check,changes:{
      monsterIds:diff(current.content.monsters,next.content.monsters),
      floorIds:diff(current.map.floors,next.map.floors),
      classIds:diff(current.content.classes,next.content.classes),
      questDataChanged:!same(current.content.quests,next.content.quests),
      customTexturesAdded:Object.keys(y).filter(k=>!own(x,k)),
      customTexturesRemoved:Object.keys(x).filter(k=>!own(y,k)),
      customTexturesReplaced:Object.keys(y).filter(k=>x[k]&&x[k].data!==y[k].data)},
      importEffects:['Full authored state replaced, not merged with adventure',
        'Native map import rebuilds active spawn instances',
        'Unlisted custom textures are removed',
        'No automatic persistence to file or browser storage']};
  }
  async function decodeCustomImages(assets){
    for(const [id,value] of Object.entries(assets.assets||{}))
      await new Promise((resolve,reject)=>{
        const img=new root.Image();
        img.onload=()=>resolve();
        img.onerror=()=>reject(Error('Custom PNG cannot be decoded before import: '+id));
        img.src=value.data;
      });
  }
  async function apply(input,options={}){
    if(mutationBusy)throw Error('Authoring mutation already in progress');
    mutationBusy=true;
    try{
    const c=parse(input),check=validate(c);
    if(!check.ok)throw Error('Capsule preflight rejected: '+check.problems.slice(0,4).join('; '));
    await decodeCustomImages(c.project.assets);
    const before=await snapshot();
    // An unchanged document MUST NOT reconstruct a live world.
    if(compareAuthoring(c.project,before).ok){
      return{applied:false,unchanged:true,verified:true,playability:true,
        warnings:check.warnings,summary:check.summary};
    }
    // Deliberate boundary: this rebuilds actors, it is not live editing.
    if(options.mode!=='cold-rebuild')
      throw Error('Nontrivial change requires explicit cold-rebuild (reconstructs living actors)');
    const imported=await host().project.importProject(clone(c.project));
    if(!imported.applied)throw Error('Native import not applied');
    const after=await snapshot(),verified=compareAuthoring(c.project,after);
    if(!verified.ok){
      try{await host().project.importProject(before);}
      catch(e){throw Error('Import verification and rollback failed: '+verified.errors.join('; ')+' | '+e.message);}
      throw Error('Import inconsistent, rolled back: '+verified.errors.join('; '));
    }
    rollback={before,after};
    return{applied:true,unchanged:false,verified:true,playability:imported.ok,
      warnings:check.warnings.concat(imported.warnings||[]),summary:check.summary};
    } finally {mutationBusy=false;}
  }
  async function undoLastApply(){
    if(mutationBusy)throw Error('Authoring mutation already in progress');
    mutationBusy=true;
    try{
    if(!rollback)return{restored:false,reason:'Nothing to undo'};
    const current=await snapshot(),check=compareAuthoring(rollback.after,current);
    if(!check.ok)return{restored:false,conflict:true,
      reason:'Authored project changed after import',differences:check.errors};
    const before=rollback.before,imported=await host().project.importProject(before);
    if(!imported.applied)throw Error('Native undo import failed');
    const verified=compareAuthoring(before,await snapshot());
    if(!verified.ok)throw Error('Undo inconsistent: '+verified.errors.join('; '));
    rollback=null;
    return{restored:true,verified:true,playability:imported.ok};
    } finally {mutationBusy=false;}
  }
  async function download(capsule=null,name='Coopege_Authoring_Project.json'){
    if(mutationBusy)throw Error('Authoring mutation in progress; cannot save inconsistent state');
    const data=capsule||await capture(),check=validate(data);
    if(data?.capsuleFormat!==FORMAT||data?.capsuleVersion!==VERSION||!data.project||
      !['content','map','assets'].every(k=>own(data.project,k)))
      throw Error('Cannot save incomplete capsule envelope');
    // Preserve invalid creative drafts; only live apply is blocked by native limits.
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),el=document.createElement('a');
    el.href=url;el.download=name;document.body.appendChild(el);el.click();el.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    return{bytes:blob.size,fileName:name,liveImportValid:check.ok,issues:check.problems};
  }
  if(root.CoopegeAuthoringDocument)throw Error('Authoring adapter already installed');
  Object.defineProperty(root,'CoopegeAuthoringDocument',{value:Object.freeze({
    version:VERSION,format:FORMAT,capture,validate,preview,apply,undoLastApply,
    download,compareAuthoring}),writable:false,configurable:false});
})(window);
