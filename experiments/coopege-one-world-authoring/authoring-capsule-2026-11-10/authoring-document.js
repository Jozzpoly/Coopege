/* Coopege Oct26 — isolated authoring-document R&D adapter.
   No own Studio UI, game save, host contract or engine replacement. */
(function installCoopegeAuthoringDocument(root) {
  'use strict';
  const FORMAT='coopege-authoring-capsule', VERSION=1;
  const SOURCE='Coopege_Powrot_Do_Swiata_2026-10-26', MAX=32*1024*1024;
  let rollback=null;
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
    const v=a.project.validateProject(p);
    if(!v.ok)throw Error('Current authoring state invalid: '+v.errors.slice(0,3).join('; '));
    return p;
  }
  async function capture() {
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
  const stable=v=>Array.isArray(v)?v.map(stable):
    v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  const normalizedGroups=groups=>(groups||[]).map(g=>({...g,eliteCount:g.eliteCount??0}));
  function compareAuthoring(a,b){
    const errors=[];
    if(!same(a.content.monsters,b.content.monsters))errors.push('Monsters differ');
    if(!same(a.content.classes,b.content.classes))errors.push('Classes differ');
    if(!same(a.content.skills,b.content.skills))errors.push('Skills differ');
    if(!same(a.content.quests,b.content.quests))errors.push('Quests differ');
    if(!same(a.map.floors,b.map.floors))errors.push('Map floors differ');
    // Known native normalization: optional eliteCount -> 0.
    if(!same(normalizedGroups(a.map.spawnGroups),normalizedGroups(b.map.spawnGroups)))
      errors.push('Spawn groups differ');
    if(!same(a.map.start,b.map.start))errors.push('Start differs');
    if(!same(a.map.links,b.map.links))errors.push('Links differ');
    if(!same(a.map.npcs,b.map.npcs))errors.push('NPCs differ');
    const x=a.assets.assets||{},y=b.assets.assets||{},ka=Object.keys(x).sort(),kb=Object.keys(y).sort();
    if(!same(ka,kb))errors.push('Texture IDs differ');
    for(const k of ka){
      if(x[k]?.data!==y[k]?.data)errors.push('PNG bytes differ: '+k);
      if(!same(x[k]?.meta||{},y[k]?.meta||{}))errors.push('PNG metadata differ: '+k);
    }
    return {ok:!errors.length,errors};
  }
  async function preview(input){
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
  async function apply(input){
    const c=parse(input),check=validate(c);
    if(!check.ok)throw Error('Capsule preflight rejected: '+check.problems.slice(0,4).join('; '));
    await decodeCustomImages(c.project.assets);
    const before=await snapshot();
    const imported=await host().project.importProject(clone(c.project));
    if(!imported.applied)throw Error('Native import not applied');
    const verified=compareAuthoring(c.project,await snapshot());
    if(!verified.ok){
      try{await host().project.importProject(before);}
      catch(e){throw Error('Import verification and rollback failed: '+verified.errors.join('; ')+' | '+e.message);}
      throw Error('Import inconsistent, rolled back: '+verified.errors.join('; '));
    }
    rollback=before;
    return{applied:true,verified:true,playability:imported.ok,
      warnings:check.warnings.concat(imported.warnings||[]),summary:check.summary};
  }
  async function undoLastApply(){
    if(!rollback)return{restored:false,reason:'Nothing to undo'};
    const before=rollback,imported=await host().project.importProject(before);
    const check=compareAuthoring(before,await snapshot());
    if(!check.ok)throw Error('Undo inconsistent: '+check.errors.join('; '));
    rollback=null;
    return{restored:true,verified:true,playability:imported.ok};
  }
  async function download(capsule=null,name='Coopege_Authoring_Project.json'){
    const data=capsule||await capture(),check=validate(data);
    if(!check.ok)throw Error('Cannot export invalid capsule: '+check.problems.join('; '));
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),el=document.createElement('a');
    el.href=url;el.download=name;document.body.appendChild(el);el.click();el.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    return{bytes:blob.size,fileName:name};
  }
  if(root.CoopegeAuthoringDocument)throw Error('Authoring adapter already installed');
  Object.defineProperty(root,'CoopegeAuthoringDocument',{value:Object.freeze({
    version:VERSION,format:FORMAT,capture,validate,preview,apply,undoLastApply,
    download,compareAuthoring}),writable:false,configurable:false});
})(window);
