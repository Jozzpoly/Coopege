import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { withChromiumPage } from "../browser/chromium-cdp.mjs";

const root = resolve(import.meta.dirname, "../..");
const legacyRelative = "legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html";
const legacyPath = resolve(root, legacyRelative);
const outputDir = resolve(root, process.argv[2] ?? "project/migration/legacy-v14.1/raw");
const sourceSha256 = createHash("sha256").update(readFileSync(legacyPath)).digest("hex");

function normalizeVolatile(value) {
  if (Array.isArray(value)) return value.map(normalizeVolatile);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (["createdAt", "exportedAt"].includes(key)) continue;
    result[key] = normalizeVolatile(value[key]);
  }
  return result;
}

const legacySource = readFileSync(legacyPath, "utf8");
const migrationBridgeMarker = "function loop(ts){";
const migrationBridge = `window.__COOPEGE_MIGRATION_RENDER__=Object.freeze({
  makeCanvas:(width,height)=>makeCanvas(width,height),
  drawPlayer:(context,player,x,y,time,options)=>drawPlayerArt(context,player,x,y,time,options),
  classAttackType:(classId)=>CLASSES[classId].atkType,
  directions:()=>DIR_ORDER.slice()
});
function loop(ts){`;
const legacyHtml = legacySource.replace(migrationBridgeMarker, migrationBridge);
if (legacyHtml === legacySource) throw new Error("Nie znaleziono punktu wstrzyknięcia renderera migracji.");
const snapshotText = await withChromiumPage(async (page) => {
    await page.setContent(legacyHtml);
    return await page.evaluate(`(async()=>{
      const deadline=Date.now()+30000;
      while(Date.now()<deadline){
        if(window.TibiaMapAPI&&window.TibiaContentAPI&&window.TibiaAssetAPI&&window.TibiaProjectAPI)break;
        await new Promise(resolve=>setTimeout(resolve,25));
      }
      if(!(window.TibiaMapAPI&&window.TibiaContentAPI&&window.TibiaAssetAPI&&window.TibiaProjectAPI))throw new Error('Legacy Developer API nie uruchomiło się w terminie.');
      await new Promise(resolve=>setTimeout(resolve,100));
      const map=window.TibiaMapAPI.exportWorld();
      const content=window.TibiaContentAPI.exportPackage();
      const assetManifest=window.TibiaAssetAPI.getManifest();
      const assets=await window.TibiaAssetAPI.exportPackage({includeProcedural:true});
      const customAssets=await window.TibiaAssetAPI.exportPackage({includeProcedural:false});
      const migrationRender=window.__COOPEGE_MIGRATION_RENDER__;
      if(!migrationRender)throw new Error('Renderer migracji legacy nie jest dostępny.');
      for(const classId of ['warrior','archer','mage']){
        const assetId='player.'+classId,frameWidth=80,frameHeight=80;
        const {canvas,g}=migrationRender.makeCanvas(frameWidth*4,frameHeight*4);
        const directions=migrationRender.directions();
        const fake={classKey:classId,dir:'s',moving:true,abonus:5,wbonus:6,blessTimer:0,atkType:migrationRender.classAttackType(classId)};
        for(let direction=0;direction<4;direction++)for(let frame=0;frame<4;frame++){
          migrationRender.drawPlayer(g,fake,frame*frameWidth+frameWidth/2,direction*frameHeight+52,frame/4,{classKey:classId,dir:directions[direction],moving:true,state:'walk',frame});
        }
        const layout={
          frameWidth,frameHeight,frames:4,directions:4,
          pivotX:.5,pivotY:(.78*56)/frameHeight,
          worldWidthTiles:1.08*frameWidth/48,
          worldHeightTiles:1.26*frameHeight/56,
        };
        assets.assets[assetId]={...assets.assets[assetId],data:canvas.toDataURL('image/png'),meta:{...assets.assets[assetId]?.meta,...layout}};
        assetManifest.assets[assetId]={...assetManifest.assets[assetId],...layout};
      }
      const validation={
        mapSchema:window.TibiaMapAPI.validatePackage(map),
        mapWorld:window.TibiaMapAPI.validateWorld(),
        content:window.TibiaContentAPI.validatePackage(content),
        assets:window.TibiaAssetAPI.validatePackage(assets),
        projectCapabilities:window.TibiaProjectAPI.getCapabilities(),
      };
      return JSON.stringify({
        source:{runtimeSha256:${JSON.stringify(sourceSha256)},runtimePath:${JSON.stringify(legacyRelative)}},
        api:{
          map:{formatVersion:window.TibiaMapAPI.formatVersion,width:window.TibiaMapAPI.width,height:window.TibiaMapAPI.height,floors:window.TibiaMapAPI.floors,capabilities:window.TibiaMapAPI.getCapabilities()},
          content:{format:window.TibiaContentAPI.format,formatVersion:window.TibiaContentAPI.formatVersion,engineVersion:window.TibiaContentAPI.engineVersion,capabilities:window.TibiaContentAPI.getCapabilities()},
          assets:{format:window.TibiaAssetAPI.format,formatVersion:window.TibiaAssetAPI.formatVersion,engineVersion:window.TibiaAssetAPI.engineVersion},
          project:{format:window.TibiaProjectAPI.format,formatVersion:window.TibiaProjectAPI.formatVersion,engineVersion:window.TibiaProjectAPI.engineVersion,capabilities:window.TibiaProjectAPI.getCapabilities()},
        },
        map,content,assetManifest,assets,customAssets,validation,
      });
    })()`, { timeoutMs: 120000 });
  });
if (typeof snapshotText !== "string") throw new Error("Ekstraktor nie zwrócił tekstowego snapshotu.");
  const normalized = normalizeVolatile(JSON.parse(snapshotText));
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "legacy-export.normalized.json");
  const text = JSON.stringify(normalized, null, 2) + "\n";
  writeFileSync(outputPath, text);
  const digest = createHash("sha256").update(text).digest("hex");
  writeFileSync(resolve(outputDir, "legacy-export.sha256"), `${digest}  legacy-export.normalized.json\n`);
console.log(`Wyeksportowano legacy snapshot: ${outputPath}`);
console.log(`SHA-256: ${digest}`);
console.log(`Mapa: ${Object.keys(normalized.map.floors).length} pięter · content: ${Object.keys(normalized.content.monsters).length} potworów · assety: ${normalized.assets.assetCount}`);
