import { readFileSync } from "node:fs";
import { verifyManifest } from "./verify-lib.mjs";

const args=process.argv.slice(2);
const index=args.indexOf("--manifest");
if(index<0||!args[index+1])throw new Error("Użycie: verify-legacy.mjs --manifest <plik>");
const manifestPath=new URL(`../../${args[index+1]}`,import.meta.url);
const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
const base=new URL("../../",import.meta.url);
const results=verifyManifest(base,manifest);
for(const result of results){console.log(`${result.ok?"PASS":"FAIL"} ${result.path} ${result.actualBytes} B ${result.actualSha256}`);}
if(results.some(result=>!result.ok))process.exitCode=1;
