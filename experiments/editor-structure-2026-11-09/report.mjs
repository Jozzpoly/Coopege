import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateMove} from './core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const p=JSON.parse(readFileSync(resolve(root,'project/migration/legacy-v14.1/coopege.project.json'),'utf8'));
const f='floor.legacy.z_0';
const cases=[['kanały',{x:75,y:86,w:10,h:10},16,14],['świątynia i wieża',{x:88,y:69,w:18,h:15},17,20],['start gracza',{x:84,y:80,w:10,h:9},14,-7]];
for(const [name,rect,dx,dy] of cases) {
 console.log('\n'+name.toUpperCase());
 for(const policy of ['terrain','relations']) {
  const {report}=simulateMove(p,{floorId:f,rect,dx,dy,clearTileId:'tile.legacy.0',policy});
  console.log(JSON.stringify(report,null,2));
 }
}
