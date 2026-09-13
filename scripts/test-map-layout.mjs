import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import clipping from 'polygon-clipping';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
import {landscapeRoadCorridors} from './map-landscape-layout.mjs';
import {currentCentralStreet, currentPublicRoad, nearestOnLine} from './map-site-registration.mjs';
await build({entryPoints:['src/utils/map/polygonLabelLayout.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/map-label-test.cjs'});
const {polygonLabelLayout}=await import('../tmp/map-label-test.cjs');
const data=JSON.parse(fs.readFileSync('cms/seed/content.json','utf8'));
const center=[53.624016,56.609196],sx=111320*Math.cos(center[1]*Math.PI/180);
const xy=p=>[(p[0]-center[0])*sx,(p[1]-center[1])*111320];
const area=poly=>Math.abs(poly[0].reduce((s,a,i,r)=>{const b=r[(i+1)%r.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2);
const roads=landscapeRoadCorridors(data);
const shapes=data.mapZones.features.map(f=>({f,poly:[f.geometry,...(f.properties.geometryParts??[])].map(g=>g.coordinates.map(r=>r.map(xy)))}));
const close=ring=>[...ring,ring[0]];
const outerFence=data.mapPaths.features.find(f=>f.properties.id==='path-mr8m9bz5');
const boundary=[close(outerFence.geometry.coordinates).map(xy)];
const sourceBoundary={type:'Polygon',coordinates:[close(outerFence.properties.schematicGeometry.coordinates)]};
const totalArea=multi=>multi.reduce((sum,p)=>sum+area(p),0);
assert.deepEqual(data.mapPaths.features.find(f=>f.properties.id==='path-mr8mckl0').geometry.coordinates,currentCentralStreet,'Central Street matches the current basemap');
const entrance=id=>data.mapPois.features.find(f=>f.properties.id===`plan-2026-entry-${id}`).geometry.coordinates;
assert.deepEqual(entrance(1),currentCentralStreet[0],'Entrance 1 stays on the public road junction');
for(const id of [2,3,4])assert.ok(nearestOnLine(entrance(id),currentPublicRoad).distance<19,`Entrance ${id} stays beside the public road`);
assert.ok(entrance(4)[0]<nearestOnLine(entrance(4),currentPublicRoad).coordinate[0],'Entrance 4 stays across the public road');
for(const {f,poly} of shapes) {
  assert.ok(clipping.intersection(poly,roads).reduce((s,p)=>s+area(p),0)<0.01,'Footprint crosses road: '+f.properties.name);
  const source=f.properties.schematicGeometry.coordinates[0];
  const center=source.reduce((sum,p)=>[sum[0]+p[0]/source.length,sum[1]+p[1]/source.length],[0,0]);
  if(booleanPointInPolygon(center,sourceBoundary))assert.ok(totalArea(clipping.difference(poly,boundary))<.01,'Internal footprint leaves the perimeter: '+f.properties.name);
  if(f.properties.parentZoneId){
    const parent=shapes.find(s=>s.f.properties.id===f.properties.parentZoneId);
    assert.ok(parent,'Pitch has a parent area: '+f.properties.name);
    assert.ok(totalArea(clipping.difference(poly,parent.poly))<.01,'Pitch leaves its parent area: '+f.properties.name);
  }
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
  // Only a numbered pitch may overlay its own parent area.
  if(a.f.properties.parentZoneId===b.f.properties.id||b.f.properties.parentZoneId===a.f.properties.id)continue;
  const overlap=clipping.intersection(a.poly,b.poly).reduce((s,p)=>s+area(p),0);
  assert.ok(overlap<0.01,`Overlapping footprints: ${a.f.properties.name} / ${b.f.properties.name}`);
}
const snapshot=JSON.parse(fs.readFileSync('src/data/festivalMapSnapshot.json','utf8'));
const expected=Object.fromEntries(['festivalMap','mapZones','mapPaths','mapPois'].map(key=>[key,data[key]]));
assert.deepEqual(snapshot,JSON.parse(JSON.stringify(expected,(key,value)=>key.startsWith('schematic')?undefined:value)),'Offline native map matches the CMS geometry');
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
console.log(`Map layout passed: ${shapes.length} footprints clear of roads and unrelated areas, perimeter and pitch containment, ${shapes.length} interior captions, Central Street/entrance alignment, matching offline map, official autocamp places 1–296.`);
