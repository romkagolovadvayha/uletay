import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { supplementFestivalMap, planCoordinate } from './festival-map-plan.mjs';
import { landscapeRoad } from './map-landscape-layout.mjs';

const output = path.resolve('tmp/map-test-runtime.cjs');
await fs.mkdir(path.dirname(output), {recursive:true});
// Only the platform link adapter is stubbed; geometry, routing and filters are real.
await build({stdin:{contents:`export * from './src/utils/map/pathfinding'; export * from './src/utils/map/combinedRoute'; export * from './src/utils/map/geo'; export * from './src/utils/map/zoneGeo'; export * from './src/utils/map/poiData'; export * from './src/utils/map/layerStyles'; export * from './src/utils/map/fenceRouting'; export * from './src/utils/map/placeMarkers'; export * from './src/components/map/nativeYandexMapHtml';`,resolveDir:process.cwd()},
  bundle:true,platform:'node',format:'cjs',outfile:output,define:{__DEV__:'false'},
  plugins:[{name:'platform-link-adapter',setup(b){b.onResolve({filter:/^react-native$/},()=>({path:'platform',namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const Platform={OS:'web'}; export const Linking={openURL(){throw Error('Unexpected navigation in geometry test')}};` }));}}]});
const {buildCombinedRouteToTarget,buildGoogleMapsRouteUrl,buildYandexRouteUrl,findInternalPathAsync,zoneTargetPoint,withOperationalPois,getMapFilters,filterZoneFeatures,routeCrossesFencePaths,extractFencePaths,buildMapPlaceMarkers,clusterMapPlaces,buildNativeYandexMapHtml} = await import(pathToFileURL(output).href);
const data = process.argv.includes('--local') ? await (await fetch('http://localhost:3000/api/data')).json() : JSON.parse(await fs.readFile('cms/seed/content.json','utf8'));
const planOrigin=planCoordinate(0,0),planX=planCoordinate(1,0),planY=planCoordinate(0,1);
const planDx=planX[0]-planOrigin[0],planDy=planX[1]-planOrigin[1],planEx=planY[0]-planOrigin[0],planEy=planY[1]-planOrigin[1],planDet=planDx*planEy-planEx*planDy;
const toPlan=([lng,lat])=>[((lng-planOrigin[0])*planEy-(lat-planOrigin[1])*planEx)/planDet,((lat-planOrigin[1])*planDx-(lng-planOrigin[0])*planDy)/planDet];
const nearestOnLine=(point,line)=>line.slice(1).reduce((best,b,index)=>{
  const a=line[index],ab=[b[0]-a[0],b[1]-a[1]],ap=[point[0]-a[0],point[1]-a[1]];
  const t=Math.max(0,Math.min(1,(ap[0]*ab[0]+ap[1]*ab[1])/(ab[0]**2+ab[1]**2)));
  const candidate=[a[0]+ab[0]*t,a[1]+ab[1]*t],distance=Math.hypot(point[0]-candidate[0],point[1]-candidate[1]);
  return distance<best.distance?{point:candidate,distance}:best;
},{point:line[0],distance:Infinity});
assert.deepEqual(supplementFestivalMap(data),data,'The map supplement must be idempotent');
for(const collection of [data.mapZones,data.mapPaths,data.mapPois]) {
  const ids=collection.features.map(f=>f.properties.id);
  assert.equal(new Set(ids).size,ids.length,'Unique feature IDs');
}
for(const f of data.mapZones.features) {
  const ring=f.geometry.coordinates[0];
  assert.deepEqual(ring[0],ring.at(-1),'Closed polygon: '+f.properties.name);
  assert.ok(ring.flat().every(Number.isFinite));
}
const pois=withOperationalPois(data.mapZones,data.mapPois);
assert.deepEqual(withOperationalPois(data.mapZones,pois),pois,'No duplicate derived places after cache normalization');
const filters=getMapFilters(data.mapZones,pois).map(f=>f.id);
for(const category of ['camping','comfort','building','medical','entrance','parking']) assert.ok(filters.includes(category),category);
const medical=filterZoneFeatures(data.mapZones.features,'medical');
assert.equal(medical.length,5,'All five medical points belong to the medical filter');
assert.ok(medical.every(f=>!f.properties.name.includes('Полиция')));
assert.equal(data.mapZones.features.filter(f=>f.properties.zoneType==='parking').length,3,'Three separate parking areas match the source');
assert.equal(data.mapZones.features.filter(f=>f.properties.parentZoneId==='plan-2026-motorhomes').length,12,'Motorhome pitches A1–A12');
const autocampPlaces=data.mapZones.features.filter(f=>f.properties.parentZoneId==='plan-2026-autocamp');
assert.equal(autocampPlaces.length,296,'Official autocamp places 1–296');
assert.deepEqual(autocampPlaces.map(f=>f.properties.bookingNumber).sort((a,b)=>a-b),Array.from({length:296},(_,i)=>i+1),'Autocamp booking numbers are complete');
assert.ok(autocampPlaces.every(f=>f.properties.id===`ticket-2027-autocamp-place-${String(f.properties.bookingNumber).padStart(3,'0')}`));
assert.ok(autocampPlaces.every(f=>f.properties.markerLabel===String(f.properties.bookingNumber)&&!f.properties.name.includes('ряд')));
assert.ok(filters.includes('autocamp'),'Autocamp has its own visible filter');
assert.equal(filterZoneFeatures(data.mapZones.features,'parking').length,3,'Parking filter stays separate from autocamp pitches');
assert.ok(!data.mapZones.features.some(f=>['plan-2026-police','plan-2026-groceries'].includes(f.properties.id)),'Misread duplicate places are removed');
const planPoi=id=>toPlan(data.mapPois.features.find(f=>f.properties.id===id).geometry.coordinates);
const publicRoad=landscapeRoad.map(toPlan),entry1=planPoi('plan-2026-entry-1');
assert.ok(nearestOnLine(entry1,publicRoad).distance<6,'Entrance 1 sits at the real public-road junction');
const entry3=planPoi('plan-2026-entry-3'),entry4=planPoi('plan-2026-entry-4');
const crossing=nearestOnLine([(entry3[0]+entry4[0])/2,(entry3[1]+entry4[1])/2],publicRoad);
assert.ok(crossing.distance<6&&entry4[0]<crossing.point[0]&&entry3[0]>crossing.point[0],'Entrances 3 and 4 stay on opposite sides of the real road');
const exit=planPoi('plan-2026-exit-july12'),entry2=planPoi('plan-2026-entry-2');
assert.ok(exit[1]<entry3[1]&&entry3[1]<entry1[1]&&entry1[1]<entry2[1],'Roadside entrances keep the north-to-south order from the plan');
const placeMarkers=buildMapPlaceMarkers(data.mapZones.features,pois.features);
const expectedPlaceIds=placeMarkers.map(p=>p.kind+':'+p.id).sort();
assert.equal(expectedPlaceIds.length,data.mapZones.features.length+data.mapPois.features.length,'Each real place has a visible marker representation');
for(const zoom of [12,15,17,20]) {
  const groups=clusterMapPlaces(placeMarkers,zoom);
  assert.deepEqual(groups.flatMap(g=>g.places.map(p=>p.kind+':'+p.id)).sort(),expectedPlaceIds,'Grouping never hides or duplicates places at zoom '+zoom);
  assert.equal(groups.filter(g=>g.places[0].pinned).length,5,'Three parking areas, autocamp and motorhomes remain distinct');
  assert.ok(groups.filter(g=>g.places[0].pinned).every(g=>g.places.length===1));
}
assert.ok(clusterMapPlaces(placeMarkers,20).length>clusterMapPlaces(placeMarkers,15).length,'Zooming in separates nearby places');
const nativeScript=buildNativeYandexMapHtml('test',{lat:56,lng:53},15).match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(nativeScript);
new Function(nativeScript); // Verify the emitted WebView script, including the shared grouping function.
const p=(x,y)=>({lng:53+x/61000,lat:56+y/111320});
const line=(id,points,extras={})=>({type:'Feature',properties:{id,pathKind:'walkway',...extras},geometry:{type:'LineString',coordinates:points.map(([x,y])=>{const q=p(x,y);return[q.lng,q.lat]})}});
const paths=(...features)=>({type:'FeatureCollection',features});
assert.ok(await findInternalPathAsync(paths(line('east',[[0,0],[100,0]]),line('north',[[50,0],[50,100]])),p(0,0),p(50,100)),'T junction connects');
assert.ok(await findInternalPathAsync(paths(line('east',[[0,50],[100,50]]),line('north',[[50,0],[50,100]])),p(0,50),p(50,100)),'Crossroads connect');
const short=await findInternalPathAsync(paths(line('road',[[0,0],[1000,0]])),p(450,0),p(460,0));
assert.ok(short && short.distanceMeters<15,'Same segment does not detour through its endpoints');
assert.equal(await findInternalPathAsync(paths(line('a',[[0,0],[100,0]]),line('b',[[100,50],[100,100]])),p(0,0),p(100,100)),null,'No invented bridge across a gap');
assert.equal(await findInternalPathAsync(paths(line('a',[[0,0],[100,0]],{closed:true})),p(0,0),p(100,0)),null,'Closed path is excluded');
assert.equal(await findInternalPathAsync(paths(line('a',[[0,0],[100,0]]),line('fence',[[50,-10],[50,10]],{pathKind:'fence'})),p(0,0),p(100,0)),null,'Fence crossings remain forbidden');
const publicArrival=data.mapPois.features.find(feature=>feature.properties.id==='plan-2026-entry-1');
const [publicArrivalLng,publicArrivalLat]=publicArrival.geometry.coordinates;
const publicArrivalPoint={lat:publicArrivalLat,lng:publicArrivalLng};
assert.ok(buildYandexRouteUrl(null,publicArrivalPoint).includes(`rtext=~${publicArrivalLat},${publicArrivalLng}`),'Yandex arrival link targets entrance 1');
assert.ok(buildGoogleMapsRouteUrl(publicArrivalPoint).endsWith(`destination=${publicArrivalLat},${publicArrivalLng}`),'Google arrival link targets entrance 1');
const entrancePoi=(id,name,point)=>({type:'Feature',properties:{id,name,category:'entrance',status:'unknown',link:{type:'none'}},geometry:{type:'Point',coordinates:[point.lng,point.lat]}});
const connectedEntrance=p(0,0),disconnectedEntrance=p(0,100),outsideUser=p(0,120),routeTarget=p(100,0);
const entranceChoicePaths=paths(line('connected',[[0,0],[100,0]]),line('disconnected',[[0,100],[10,100]]));
const entranceChoicePois={type:'FeatureCollection',features:[
  entrancePoi('near-disconnected','Ближайший, но изолированный',disconnectedEntrance),
  entrancePoi('far-connected','Дальний связный вход',connectedEntrance),
]};
const oldFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:false});
try {
  const combined=await buildCombinedRouteToTarget({
    userLocation:outsideUser,target:routeTarget,targetName:'Тестовая сцена',mapPaths:entranceChoicePaths,mapPois:entranceChoicePois,
    mapConfig:{center:p(50,50),defaultZoom:16,territoryBounds:{sw:p(-10,-10),ne:p(110,110)}},
  });
  assert.ok(combined,'Outside route uses an entrance connected to the destination');
  const internal=combined.segments.find(segment=>segment.kind==='internal');
  assert.ok(internal);
  assert.ok(Math.abs(internal.coordinates[0][0]-connectedEntrance.lng)<1e-9 && Math.abs(internal.coordinates[0][1]-connectedEntrance.lat)<1e-9,'Nearest disconnected entrance is skipped');
} finally { globalThis.fetch=oldFetch; }
const [lng,lat]=data.mapPois.features.find(f=>f.properties.id==='plan-2026-main-gate').geometry.coordinates;
const reports=[];
for(const zone of data.mapZones.features) {
  const route=await findInternalPathAsync(data.mapPaths,{lng,lat},zoneTargetPoint(zone),data.mapZones);
  if(route)assert.equal(routeCrossesFencePaths(route.coordinates,extractFencePaths(data.mapPaths)),false);
  reports.push({id:zone.properties.id,name:zone.properties.name,routable:Boolean(route),distance:route?Math.round(route.distanceMeters):null});
}
await fs.mkdir('artifacts/map-audit',{recursive:true});
await fs.writeFile('artifacts/map-audit/routes.json',JSON.stringify(reports,null,2));
for (const name of ['Сцена РЕН ТВ','Западная сцена','Южная сцена']) assert.ok(reports.find(r=>r.name===name)?.routable,`Route to ${name}`);
assert.equal(reports.filter(report=>report.routable).length,reports.length,'Every mapped zone is connected to the visitor route network');
console.log(`Map data and routing regressions passed. ${data.mapZones.features.length} zones, ${data.mapPois.features.length} explicit markers.`);
console.log(`Routes from main gate: ${reports.filter(r=>r.routable).length}/${reports.length}`);
if(process.argv.includes('--details')) console.log(reports);
// Print the source-plan coordinates of the road junctions for the geometry audit.
if(process.argv.includes('--junctions')) {
  for(const f of data.mapPaths.features.filter(f=>f.properties.pathKind!=='fence')) console.log(f.properties.id,f.geometry.coordinates.map(point=>toPlan(point).map(Math.round)));
}
