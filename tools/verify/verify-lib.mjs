import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256File(path){return createHash("sha256").update(readFileSync(path)).digest("hex");}
export function verifyManifest(root,manifest){
  const results=[];
  for(const artifact of manifest.artifacts){
    const path=new URL(artifact.path,root);
    const bytes=readFileSync(path);
    const sha256=createHash("sha256").update(bytes).digest("hex");
    results.push({path:artifact.path,expectedBytes:artifact.bytes,actualBytes:bytes.length,expectedSha256:artifact.sha256,actualSha256:sha256,ok:bytes.length===artifact.bytes&&sha256===artifact.sha256});
  }
  return results;
}
