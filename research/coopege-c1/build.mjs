import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";

const root=dirname(fileURLToPath(import.meta.url));
const names=["core.js","episode.js","atlas.js","view.js","witness.json","bootstrap.js"];
let html=readFileSync(resolve(root,"template.html"),"utf8");
for(const name of names){
 const marker=`__COOPEGE_SOURCE_${name}__`;
 if(html.split(marker).length!==2)throw new Error(`Missing or duplicate source marker: ${name}`);
 html=html.replace(marker,readFileSync(resolve(root,"src",name),"utf8"));
}
const out=resolve(root,"../../.build/coopege-c1/Coopege_C1_Expedition.html");
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,html);
const sha=createHash("sha256").update(html).digest("hex");
if(process.argv.includes("--verify-baseline")){
 const old=readFileSync(resolve(root,"../coopege-b5/Coopege_B5_Pierwsza_Wyprawa.html"),"utf8");
 if(old!==html)throw new Error("Byte-for-byte B5 parity broken before any C1 gameplay changes");
}
console.log(JSON.stringify({artifact:out,bytes:Buffer.byteLength(html),sha256:sha,baselineEqual:process.argv.includes("--verify-baseline")}));
