import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectRaw} from './raw-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const raw=JSON.parse(readFileSync(resolve(root,'project/migration/legacy-v14.1/raw/legacy-export.normalized.json'),'utf8'));
const cases=[['kanały',{x:75,y:86,w:10,h:10}],['świątynia i wieża',{x:88,y:69,w:18,h:15}],['start/targ',{x:84,y:80,w:10,h:9}]];
for(const [name,rect] of cases)console.log(name,JSON.stringify(inspectRaw(raw,rect),null,2));
