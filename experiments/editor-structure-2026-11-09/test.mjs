import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {simulateMove, reciprocal, decodeTiles} from './core.mjs';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const original=JSON.parse(readFileSync(resolve(root,'project/migration/legacy-v14.1/coopege.project.json'),'utf8'));
const BEFORE=JSON.stringify(original), f='floor.legacy.z_0';
function one(rect,dx,dy,policy){
 return simulateMove(original,{floorId:f,rect,dx,dy,policy,clearTileId:'tile.legacy.0'});
}
const canal={x:75,y:86,w:10,h:10};
const terr=one(canal,16,14,'terrain'), sem=one(canal,16,14,'relations');
assert.equal(terr.report.sources.transitions.length,1);
assert.equal(sem.report.counterparts.length,1);
assert.match(terr.report.warnings.join(' '),/stairs/);
assert.deepEqual(sem.report.reciprocityErrors,[]);
const t=sem.project.world.transitions.find(x=>x.id==='transition.legacy.kana_y_miasta.forward');
const rev=reciprocal(sem.project.world.transitions,t);
assert.equal(t.source.x,95);assert.equal(t.source.y,104);
assert.equal(rev.id,'transition.legacy.kana_y_miasta.return');
assert.equal(rev.destination.x,95);assert.equal(rev.destination.y,104);
const temple=one({x:88,y:69,w:18,h:15},17,20,'relations');
assert.equal(temple.report.counterparts.length,2);
assert.equal(temple.report.tiles.blockedAtTargetBefore,90);
assert.deepEqual(temple.report.reciprocityErrors,[]);
const start=one({x:84,y:80,w:10,h:9},14,-7,'relations');
assert.equal(start.report.sources.playerStart,true);
assert.equal(start.project.manifest.playerStart.x,102);
assert.equal(start.project.manifest.playerStart.y,77);
assert.equal(start.report.destination.transitions.length,1);
assert.equal(JSON.stringify(original),BEFORE);
for(const sample of [terr,sem,temple,start]) {
 const fl=sample.project.world.floors.find(x=>x.id===f);
 assert.equal(decodeTiles(fl).length,40000);
 assert.equal(sample.report.oldProjectUntouched,true);
}
for(const bad of [
 {floorId:f,rect:canal,dx:2,dy:1,policy:'relations',clearTileId:'tile.legacy.0'},
 {floorId:f,rect:{x:-1,y:0,w:5,h:5},dx:10,dy:10,policy:'terrain',clearTileId:'tile.legacy.0'},
 {floorId:f,rect:canal,dx:16,dy:14,policy:'relations',clearTileId:'wrong'},
]) assert.throws(()=>simulateMove(original,bad));
console.log('PASS 3 real Coopege locations; reciprocal links, start, destination conflicts, invalid regions, source unchanged');
