import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import clipping from 'polygon-clipping';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
import {landscapeRoadCorridors} from './map-landscape-layout.mjs';
await build({entryPoints:['src/utils/map/polygonLabelLayout.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/map-label-test.cjs'});
const {polygonLabelLayout}=await import('../tmp/map-label-test.cjs');
const data=JSON.parse(fs.readFileSync('cms/seed/content.json','utf8'));
const center=[53.624016,56.609196],sx=111320*Math.cos(center[1]*Math.PI/180);
const xy=p=>[(p[0]-center[0])*sx,(p[1]-center[1])*111320];
const area=poly=>Math.abs(poly[0].reduce((s,a,i,r)=>{const b=r[(i+1)%r.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2);
const roads=landscapeRoadCorridors(data);
const broad=f=>!f.properties.parentZoneId&&['parking','camping','autocamp','comfort'].includes(f.properties.zoneType)&&!/гостиниц/i.test(f.properties.name);
const shapes=data.mapZones.features.map(f=>({f,poly:[f.geometry,...(f.properties.geometryParts??[])].map(g=>g.coordinates.map(r=>r.map(xy)))}));
for(const {f,poly} of shapes) {
  assert.ok(clipping.intersection(poly,roads).reduce((s,p)=>s+area(p),0)<0.01,'Footprint crosses road: '+f.properties.name);
  const layout=polygonLabelLayout(f);
  assert.ok(layout.widthMeters>0&&layout.heightMeters>0,'Usable interior label: '+f.properties.name);
  const a=layout.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),scale=111320*Math.cos(layout.center.lat*Math.PI/180);
  for(const u of [-.5,0,.5])for(const v of [-.5,0,.5]){
    const x=u*layout.widthMeters,y=v*layout.heightMeters;
    const p=[layout.center.lng+(x*c-y*s)/scale,layout.center.lat-(x*s+y*c)/111320];
    assert.ok(booleanPointInPolygon(p,f),'Caption leaves polygon: '+f.properties.name);
  }
}
for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++) {
  const a=shapes[i],b=shapes[j];
  // Area / its contents is intentional; standalone buildings and pitches never overlap.
  if(broad(a.f)!==broad(b.f))continue;
  const overlap=clipping.intersection(a.poly,b.poly).reduce((s,p)=>s+area(p),0);
  assert.ok(overlap<0.01,`Overlapping footprints: ${a.f.properties.name} / ${b.f.properties.name}`);
}
const stages=data.mapZones.features.filter(f=>f.properties.zoneType==='stage_area');
assert.equal(stages.length,3);
assert.equal(new Set(stages.map(f=>f.properties.name)).size,3);
const autocamp=data.mapZones.features.filter(f=>f.properties.parentZoneId==='plan-2026-autocamp');
assert.equal(autocamp.length,296);
assert.equal(new Set(autocamp.map(f=>f.properties.markerLabel)).size,296);
assert.deepEqual(autocamp.map(f=>f.properties.bookingNumber).sort((a,b)=>a-b),Array.from({length:296},(_,i)=>i+1));
for(const [start,end] of [...Array.from({length:12},(_,i)=>[i*20+1,i*20+20]),[241,246],[247,266],[267,296]]) {
  const cells=autocamp.filter(f=>f.properties.bookingNumber>=start&&f.properties.bookingNumber<=end);
  assert.equal(cells.length,end-start+1,`Complete autocamp block ${start}–${end}`);
  assert.ok(cells.every(f=>f.properties.bookingGroup===`${start}–${end}`));
}
console.log(`Map layout passed: ${shapes.length} footprints clear of roads, no overlapping buildings/pitches, ${shapes.length} interior captions, 3 stages, official autocamp places 1–296.`);
