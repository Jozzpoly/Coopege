import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withChromiumPage } from "../browser/chromium-cdp.mjs";

const root = resolve(import.meta.dirname, "../..");
const outputDir = resolve(root, "docs/testing/screenshots");
mkdirSync(outputDir, { recursive: true });

async function waitFor(page, expression, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await page.evaluate(expression);
    if (value) return value;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 70));
  }
  const diagnostics = await page.evaluate("window.__COOPEGE_STUDIO_DIAGNOSTICS__ ?? null");
  throw new Error(`Timeout M6 Ability Composer [${label}]: ${JSON.stringify(diagnostics)}`);
}

const studioHtml = readFileSync(resolve(root, "dist/Coopege_Studio_v0.1.html"), "utf8");
const result = await withChromiumPage(async (page) => {
  await page.setContent(studioHtml);
  const initial = await waitFor(
    page,
    `(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;return d?.bridgeReady&&d.abilityGraphCount>0&&document.querySelector('[data-page="ability"]')?{revision:d.storeRevision,graphs:d.abilityGraphCount,checksum:d.projectChecksum}:null;})()`,
    "bootstrap",
  );

  await page.evaluate(`document.querySelector('[data-page="ability"]').click()`);
  await waitFor(page, `document.querySelectorAll('.ability-node').length>0`, "ability-page");
  await page.evaluate(`document.querySelector('#abilityNewHeal').click()`);
  const created = await waitFor(
    page,
    `(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;const p=window.__COOPEGE_STUDIO_DEBUG__.project();const a=p.content.abilities.find(x=>x.id.startsWith('ability.heal-'));return d.abilityGraphCount===${initial.graphs + 1}&&d.previewStudioRevision===d.storeRevision&&a?{revision:d.storeRevision,graphId:a.graphId,abilityId:a.id,checksum:d.projectChecksum}:null;})()`,
    "create-heal",
  );

  const graphState = await page.evaluate(`(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;return{selected:d.abilityGraphId,valid:d.abilityGraphValid,nodes:document.querySelectorAll('.ability-node').length,history:window.__COOPEGE_STUDIO_DEBUG__.history().undo.at(-1)};})()`);

  await page.evaluate(`document.querySelector('#abilityTestPlayer').value='player.local.1';document.querySelector('#abilityTest').click()`);
  const p1Trace = await waitFor(page, `document.querySelector('#abilityTrace').textContent.includes('owner=player.local.1')?document.querySelector('#abilityTrace').textContent:null`, "trace-p1");
  await page.evaluate(`document.querySelector('#abilityTestPlayer').value='player.local.2';document.querySelector('#abilityTest').click()`);
  const p2Trace = await waitFor(page, `document.querySelector('#abilityTrace').textContent.includes('owner=player.local.2')?document.querySelector('#abilityTrace').textContent:null`, "trace-p2");

  await page.evaluate(`(()=>{const card=[...document.querySelectorAll('.ability-node')].find(node=>node.querySelector('strong')?.textContent.includes('Stałe leczenie'));if(!card)throw new Error('Brak węzła leczenia');card.click();const input=document.querySelector('#abilityInspector input[type="number"]');if(!input)throw new Error('Brak pola amount');input.value='21';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const edited = await waitFor(
    page,
    `(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;const g=window.__COOPEGE_STUDIO_DEBUG__.project().gameplay.graphs.find(x=>x.id===${JSON.stringify(created.graphId)});const n=g?.nodes.find(x=>x.kind==='effect');return n?.parameters?.amount===21&&d.previewStudioRevision===d.storeRevision?{revision:d.storeRevision,amount:n.parameters.amount,checksum:d.projectChecksum}:null;})()`,
    "edit-parameter",
  );

  await page.evaluate(`document.querySelector('#undoButton').click()`);
  const undone = await waitFor(page, `(()=>{const p=window.__COOPEGE_STUDIO_DEBUG__.project();const g=p.gameplay.graphs.find(x=>x.id===${JSON.stringify(created.graphId)});return g?.nodes.find(x=>x.kind==='effect')?.parameters?.amount===15;})()`, "undo");
  await page.evaluate(`document.querySelector('#redoButton').click()`);
  const redone = await waitFor(page, `(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;const p=window.__COOPEGE_STUDIO_DEBUG__.project();const g=p.gameplay.graphs.find(x=>x.id===${JSON.stringify(created.graphId)});return g?.nodes.find(x=>x.kind==='effect')?.parameters?.amount===21&&d.previewStudioRevision===d.storeRevision;})()`, "redo");

  const beforeInvalid = await page.evaluate(`(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;return{revision:d.storeRevision,checksum:d.projectChecksum};})()`);
  await page.evaluate(`(()=>{const graph=window.__COOPEGE_STUDIO_DEBUG__.project().gameplay.graphs.find(x=>x.id===${JSON.stringify(created.graphId)});const entry=graph.nodes.find(x=>x.id===graph.entryNodeId);const card=[...document.querySelectorAll('.ability-node')].find(node=>node.querySelector('code')?.textContent===entry.id);card.click();const selects=[...document.querySelectorAll('#abilityInspector select')];const edge=selects[1];if(!edge)throw new Error('Brak selecta krawędzi');edge.value=entry.id;edge.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  const afterInvalid = await page.evaluate(`(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;return{revision:d.storeRevision,checksum:d.projectChecksum,summary:document.querySelector('#summary').textContent};})()`);

  await page.evaluate(`document.querySelector('#abilityDuplicate').click()`);
  const duplicated = await waitFor(page, `(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;return d.abilityGraphCount===${initial.graphs + 2}&&d.abilityGraphId.includes('.copy.')&&d.previewStudioRevision===d.storeRevision?{graphId:d.abilityGraphId,revision:d.storeRevision}:null;})()`, "duplicate");
  await page.evaluate(`document.querySelector('#abilityDelete').click()`);
  const deletedCopy = await waitFor(page, `(()=>{const d=window.__COOPEGE_STUDIO_DIAGNOSTICS__;return d.abilityGraphCount===${initial.graphs + 1}&&d.previewStudioRevision===d.storeRevision?{revision:d.storeRevision}:null;})()`, "delete-copy");
  await page.evaluate(`(()=>{const row=[...document.querySelectorAll('.ability-graph-row')].find(item=>item.querySelector('small')?.textContent.includes(${JSON.stringify(created.graphId)}));if(!row)throw new Error('Brak oryginalnego grafu');row.click();})()`);
  const beforeReferencedDelete = await page.evaluate(`window.__COOPEGE_STUDIO_DIAGNOSTICS__.storeRevision`);
  await page.evaluate(`document.querySelector('#abilityDelete').click()`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 220));
  const referencedDelete = await page.evaluate(`(()=>({revision:window.__COOPEGE_STUDIO_DIAGNOSTICS__.storeRevision,status:document.querySelector('#abilityStatus').textContent}))()`);

  const exportedHtml = await page.evaluate(`(()=>{const token='__COOPEGE_EXPORTED_PROJECT_JSON__';const project=window.__COOPEGE_STUDIO_DEBUG__.project();return window.__COOPEGE_RUNTIME_EXPORT_TEMPLATE__.replace(token,JSON.stringify(project).replaceAll('<','\u003c'));})()`);
  await page.screenshot(resolve(outputDir, "M6_Ability_Composer.png"));
  return { initial, created, graphState, p1Trace, p2Trace, edited, undone, redone, beforeInvalid, afterInvalid, duplicated, deletedCopy, beforeReferencedDelete, referencedDelete, exportedHtml };
});

const standalone = await withChromiumPage(async (page) => {
  await page.setContent(result.exportedHtml);
  return waitFor(page, `(()=>{const d=window.__COOPEGE_RUNTIME_DIAGNOSTICS__;return d?.ready&&d.gameplayGraphCount===${result.initial.graphs + 1}?d:null;})()`, "standalone-graph");
});

const ok = result.created.graphId.startsWith("graph.ability.heal-")
  && result.graphState.selected === result.created.graphId
  && result.graphState.valid === true
  && result.graphState.nodes === 4
  && result.p1Trace.includes("effect:effect.heal-fixed")
  && result.p2Trace.includes("effect:effect.heal-fixed")
  && result.edited.amount === 21
  && result.undone === true
  && result.redone === true
  && result.beforeInvalid.revision === result.afterInvalid.revision
  && result.beforeInvalid.checksum === result.afterInvalid.checksum
  && result.afterInvalid.summary.includes("cykl")
  && result.duplicated.graphId.includes(".copy.")
  && result.beforeReferencedDelete === result.referencedDelete.revision
  && result.referencedDelete.status.includes("Nie można usunąć")
  && standalone.projectSchemaVersion === 2
  && standalone.gameplayGraphCount === result.initial.graphs + 1;
if (!ok) throw new Error(`M6 Ability Composer failed: ${JSON.stringify(result)}`);
console.log(`PASS browser m6-ability-composer: graph=${result.created.graphId} · P1/P2 trace=PASS · parameter undo/redo=PASS · duplicate/delete=PASS · invalid cycle/reference guards=PASS · standalone graph=PASS`);
