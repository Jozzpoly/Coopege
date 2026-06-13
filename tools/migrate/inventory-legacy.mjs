import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const runtimePath=new URL("../../legacy/reference/Tibia_Enhanced_v14_1_DevAPI.html",import.meta.url);
const studioPath=new URL("../../legacy/reference/Tibia_Developer_Studio_v3_1.html",import.meta.url);
const runtime=readFileSync(runtimePath,"utf8"),studio=readFileSync(studioPath,"utf8");
const count=(text,pattern)=>(text.match(pattern)||[]).length;
const report={
 reportVersion:1,generatedBy:"static-inventory-v1",
 sources:{runtimeSha256:createHash("sha256").update(runtime).digest("hex"),studioSha256:createHash("sha256").update(studio).digest("hex")},
 apiMarkers:["TibiaAssetAPI","TibiaMapAPI","TibiaContentAPI","TibiaProjectAPI"].map(name=>({name,present:runtime.includes(name),references:count(runtime,new RegExp(name,"g"))})),
 runtimeSignals:{floorConstants:count(runtime,/FLOORS\s*=|FLOOR_MIN|FLOOR_MAX/g),embeddedRle:runtime.includes("EMBEDDED_FLOOR_RLE"),classTable:runtime.includes("const CLASSES="),monsterDefinitions:runtime.includes("MONSTER_DEFS"),assetManifest:runtime.includes("ASSET_MANIFEST")},
 studioSignals:{projectApply:studio.includes("TibiaProjectAPI"),undoReferences:count(studio,/undo/gi),checkpointReferences:count(studio,/checkpoint/gi),postMessageReferences:count(studio,/postMessage/g)},
 limitations:["Inwentaryzacja statyczna potwierdza punkty zaczepienia, ale nie zastępuje eksportu przez API w automatycznej przeglądarce.","Dynamiczny ekstraktor i golden fixture pozostają następnym zadaniem M0."]
};
writeFileSync(new URL("../../docs/migration/legacy-static-inventory.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log("Zapisano docs/migration/legacy-static-inventory.json");
