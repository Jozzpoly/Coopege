import { readFileSync } from "node:fs";
import { verifyManifest } from "./verify-lib.mjs";
const manifest=JSON.parse(readFileSync(new URL("../../legacy/reference/declared-baseline.json",import.meta.url),"utf8"));
const results=verifyManifest(new URL("../../",import.meta.url),manifest);
for(const result of results){
  console.log(`${result.ok?"MATCH":"MISMATCH"} ${result.path}`);
  if(!result.ok){console.log(`  deklarowane: ${result.expectedBytes} B ${result.expectedSha256}`);console.log(`  otrzymane:   ${result.actualBytes} B ${result.actualSha256}`);}
}
if(results.some(result=>!result.ok))process.exitCode=2;
