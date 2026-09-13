// OpenFreeMap / OpenStreetMap transportation geometry, read 2026-09-13 from
// https://tiles.openfreemap.org/planet/20260906_080001_pt/14/{x}/{y}.pbf.
// The supplied festival drawing is schematic. Central Street is the fixed
// reference; the arrangement of festival facilities is approximate, not a survey.
export const currentCentralStreet = [
  [53.61876368522644,56.60846412949033],[53.61974000930786,56.60852612873029],
  [53.62072706222534,56.608310607124736],[53.621124029159546,56.608369654262276],
  [53.62170338630676,56.60836079719752],[53.62684786319733,56.60797698906333],
];
export const currentPublicRoad = [
  [53.612937927246094,56.61262080556352],[53.617379665374756,56.61069308583683],
  [53.617878556251526,56.61038015420863],[53.61828625202179,56.6097779011362],
  [53.61854910850525,56.609154972412796],[53.61876368522644,56.60846412949033],
  [53.618908524513245,56.60771127345484],[53.620657324790955,56.59959423717734],
];
export const currentSiteTracks = [
  [[53.61854910850525,56.609154972412796],[53.61945569515228,56.60927896852277]],
  [[53.619895577430725,56.60769651142178],[53.61985266208649,56.607826417114694],[53.61974000930786,56.60852612873029],[53.61945569515228,56.60927896852277],[53.61919283866882,56.61090268953393],[53.62375259399414,56.6118473678155]],
  [[53.618908524513245,56.60771127345484],[53.61985266208649,56.607826417114694],[53.62110257148743,56.60398220055171]],
];
const origin=[53.61656824047423,56.615434790442094];
const oldX=[0.000011830524687,0.00000025801283],oldY=[0.000000530807574,-0.000006677045228];
const det=oldX[0]*oldY[1]-oldX[1]*oldY[0];
export const sourcePlanPoint=([lng,lat])=>{
  const x=lng-origin[0],y=lat-origin[1];
  return [(x*oldY[1]-y*oldY[0])/det,(y*oldX[0]-x*oldX[1])/det];
};
const sourceStreet=[[139,1047],[278,1037],[354,1054],[414,1034.7142857143],[494,1009],[897,1002]];
function streetSegment(x) {
  const found=sourceStreet.findIndex((p,i)=>i>0&&x<=p[0]);
  return found<0?sourceStreet.length-2:Math.max(0,found-1);
}
export function registeredPlanPoint(x,y) {
  const i=streetSegment(x),a=sourceStreet[i],b=sourceStreet[i+1],t=(x-a[0])/(b[0]-a[0]);
  const offset=y-(a[1]+(b[1]-a[1])*t);
  return [currentCentralStreet[i][0]+(currentCentralStreet[i+1][0]-currentCentralStreet[i][0])*t+offset*0.0000016,
    currentCentralStreet[i][1]+(currentCentralStreet[i+1][1]-currentCentralStreet[i][1])*t-offset*0.0000065];
}
const register=p=>registeredPlanPoint(...sourcePlanPoint(p));
// Split at the registration seams: shared road/fence junctions then remain
// coincident instead of cutting across a bend in the new basemap.
function registerLine(points) {
  const source=points.map(sourcePlanPoint),result=[];
  for(let i=1;i<source.length;i++){
    const a=source[i-1],b=source[i],ts=[0];
    for(const [x] of sourceStreet.slice(1,-1)){
      const t=(x-a[0])/(b[0]-a[0]);if(t>1e-8&&t<1-1e-8)ts.push(t);
    }
    for(const t of ts.sort((a,b)=>a-b))result.push(registeredPlanPoint(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t));
  }
  result.push(register(points.at(-1)));return result;
}
const sx=111320*Math.cos(56.609196*Math.PI/180);
const east=currentCentralStreet.at(-1)[0]-currentCentralStreet[4][0];
const north=currentCentralStreet.at(-1)[1]-currentCentralStreet[4][1];
const bearing=Math.atan2(-north*111320,east*sx);
const axes=([x,y])=>[(x*Math.cos(bearing)-y*Math.sin(bearing))/sx,(-x*Math.sin(bearing)-y*Math.cos(bearing))/111320];
export function nearestOnLine(point,line) {
  let best={coordinate:line[0],distance:Infinity};
  for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*111320;
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*sx*dx+(point[1]-a[1])*111320*dy)/(dx*dx+dy*dy)));
    const coordinate=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],distance=Math.hypot((point[0]-coordinate[0])*sx,(point[1]-coordinate[1])*111320);
    if(distance<best.distance)best={coordinate,distance};
  }
  return best;
}
function rigidPolygon(ring,anchor,facilityScale=1) {
  const points=ring.slice(0,-1).map(sourcePlanPoint),center=anchor??points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);
  const target=registeredPlanPoint(...center);
  const i=streetSegment(center[0]),a=currentCentralStreet[i],b=currentCentralStreet[i+1];
  const xScale=Math.hypot((b[0]-a[0])*sx,(b[1]-a[1])*111320)/(sourceStreet[i+1][0]-sourceStreet[i][0]);
  const edge=[points[1][0]-points[0][0],points[1][1]-points[0][1]],length=Math.hypot(...edge),u=edge.map(v=>v/length),v=[-u[1],u[0]];
  const widthScale=Math.hypot(u[0]*xScale,u[1]*.72),heightScale=xScale*.72/widthScale;
  const result=points.map(p=>{
    const dx=(p[0]-center[0])*facilityScale,dy=(p[1]-center[1])*facilityScale,along=(dx*u[0]+dy*u[1])*widthScale,across=(dx*v[0]+dy*v[1])*heightScale;
    const d=axes([along*u[0]+across*v[0],along*u[1]+across*v[1]]);return[target[0]+d[0],target[1]+d[1]];
  });
  return [...result,result[0]];
}
const broad=f=>!f.properties.parentZoneId&&['parking','camping','autocamp','comfort'].includes(f.properties.zoneType)&&!/гостиниц/i.test(f.properties.name);
const palette={
  parking:['#8DA837',1,'#8DA837'],camping:['#8DA837',1,'#8DA837'],
  autocamp:['#8DA837',1,'#8DA837'],comfort:['#8DA837',1,'#8DA837'],
  trade:['#F2F0DF',.93,'#D9D8C9'],building:['#C8CDC5',.94,'#E0E4DD'],
  service:['#F5F2E5',.96,'#DF655A'],water:['#55BFDB',.93,'#C5F0F5'],
  toilet:['#F5F2E5',.96,'#DC544A'],shower:['#E76055',.94,'#FBE7D8'],
  stage_area:['#FFD530',.97,'#FFE574'],custom:['#C5CBC2',.8,'#DCE1D7'],
};
export function registerFestivalMap(data) {
  const mapZones=structuredClone(data.mapZones),mapPaths=structuredClone(data.mapPaths),mapPois=structuredClone(data.mapPois);
  const families=new Map();
  for(const f of mapZones.features){
    f.properties.schematicGeometry??=structuredClone(f.geometry);
    if(f.properties.parentZoneId){
      const key=f.properties.bookingGroup??f.properties.parentZoneId;
      families.set(key,[...(families.get(key)??[]),f]);
    }
  }
  const anchors=new Map();
  for(const [key,features] of families){
    const points=features.flatMap(f=>f.properties.schematicGeometry.coordinates[0].slice(0,-1).map(sourcePlanPoint));
    anchors.set(key,points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]));
  }
  for(const f of mapZones.features){
    const raw=f.properties.schematicGeometry;
    // The source's service boxes include their printed captions. Use one
    // consistent footprint scale, rather than shrinking individual collisions.
    const serviceBox=['service','water','toilet','shower','building'].includes(f.properties.zoneType)
      || (f.properties.zoneType==='trade'&&!/ряды|Кафе и сувениры/.test(f.properties.name));
    const facilityScale=f.properties.zoneType==='service' ? .58 : serviceBox ? .72 : 1;
    f.geometry={type:'Polygon',coordinates:broad(f)?raw.coordinates.map(registerLine):[rigidPolygon(raw.coordinates[0],anchors.get(f.properties.bookingGroup??f.properties.parentZoneId),facilityScale)]};
    if(f.properties.accessPoint && (!f.properties.accessPointGenerated || f.properties.schematicAccessPoint)){
      f.properties.schematicAccessPoint??=f.properties.accessPoint;
      const p=f.properties.schematicAccessPoint,[lng,lat]=register([p.lng,p.lat]);f.properties.accessPoint={lng,lat};
    }
    delete f.properties.geometryParts;
    const colors=palette[f.properties.zoneType];
    if(colors){[f.properties.fillColor,f.properties.fillOpacity,f.properties.strokeColor]=colors;f.properties.strokeWidth=1;}
    if(broad(f))f.properties.strokeWidth=0;
    if(f.properties.zoneType==='comfort'&&/гостиниц/i.test(f.properties.name)){f.properties.fillColor='#CFD1C8';f.properties.fillOpacity=1;}
    if(f.properties.parentZoneId){f.properties.fillColor='#F2CE39';f.properties.fillOpacity=.88;f.properties.strokeColor='#FCED9B';f.properties.strokeWidth=.7;}
  }
  for(const f of mapPaths.features){
    f.properties.schematicGeometry??=structuredClone(f.geometry);
    f.geometry={type:'LineString',coordinates:registerLine(f.properties.schematicGeometry.coordinates)};
    if(f.properties.id==='path-mr8mh9no'){f.properties.closed=true;f.properties.routingOnly=true;}
  }
  for(const f of mapPois.features){
    f.geometry.coordinates=register(f.geometry.coordinates);
    if(f.properties.accessPoint){const p=f.properties.accessPoint,[lng,lat]=register([p.lng,p.lat]);f.properties.accessPoint={lng,lat};}
  }
  mapPaths.features.find(f=>f.properties.id==='path-mr8mckl0').geometry.coordinates=structuredClone(currentCentralStreet);
  mapPaths.features.find(f=>f.properties.id==='path-mr8mckl0').properties.name='Улица Центральная';
  const path=id=>mapPaths.features.find(f=>f.properties.id===id);
  const poi=id=>mapPois.features.find(f=>f.properties.id===`plan-2026-${id}`);
  const movePoi=(feature,coordinate)=>{
    const old=feature.geometry.coordinates;
    for(const f of mapPaths.features)f.geometry.coordinates=f.geometry.coordinates.map(p=>Math.hypot((p[0]-old[0])*sx,(p[1]-old[1])*111320)<.1?coordinate:p);
    feature.geometry.coordinates=coordinate;
  };
  movePoi(poi('entry-1'),currentCentralStreet[0]);
  const eastOfRoad=(feature,offset)=>{
    const onRoad=nearestOnLine(feature.geometry.coordinates,currentPublicRoad).coordinate;
    movePoi(feature,[onRoad[0]+offset/sx,onRoad[1]]);return onRoad;
  };
  const entry2=eastOfRoad(poi('entry-2'),18),entry3=eastOfRoad(poi('entry-3'),18);
  movePoi(poi('entry-4'),[entry3[0]-18/sx,entry3[1]]);
  eastOfRoad(poi('exit-july12'),18);
  path('plan-2026-public-road-route').geometry.coordinates=structuredClone(currentPublicRoad);
  path('plan-2026-public-road-route').properties.routingOnly=false;
  poi('main-gate').properties.sourceZoneId='plan-2026-main-gate-booth';
  poi('comfort-gate').properties.sourceZoneId='plan-2026-comfort-gate-booth';
  path('plan-2026-entry-1-link').geometry.coordinates=currentCentralStreet.slice(0,2);
  path('plan-2026-entry-2-link').geometry.coordinates=[entry2,poi('entry-2').geometry.coordinates];
  path('plan-2026-entry-3-4-crossing').geometry.coordinates=[poi('entry-4').geometry.coordinates,entry3,poi('entry-3').geometry.coordinates];
  // Motorhomes follow the inside of the southern fence. Rebuild the whole row
  // and its access aisle together so a rigid shift cannot put pitches outside.
  const motorhomeAisle=[];
  const fenceY=x=>1713-(x-245)*126/180;
  const rowStart=registeredPlanPoint(308,fenceY(308)),rowEnd=registeredPlanPoint(420,fenceY(420));
  const rowDx=(rowEnd[0]-rowStart[0])*sx,rowDy=(rowEnd[1]-rowStart[1])*111320,rowLength=Math.hypot(rowDx,rowDy);
  const rowUnit=[rowDx/rowLength,rowDy/rowLength],rowNormal=[-rowUnit[1],rowUnit[0]];
  for(let index=0;index<12;index++){
    const p=[rowStart[0]+(rowEnd[0]-rowStart[0])*index/11,rowStart[1]+(rowEnd[1]-rowStart[1])*index/11],u=rowUnit,normal=rowNormal;
    const at=(along,across)=>[p[0]+(u[0]*along+normal[0]*across)/sx,p[1]+(u[1]*along+normal[1]*across)/111320];
    const halfWidth=Math.min(3.2,rowLength/11*.42);
    const points=[at(-halfWidth,13),at(halfWidth,13),at(halfWidth,23),at(-halfWidth,23)];
    const feature=mapZones.features.find(f=>f.properties.id===`plan-2026-motorhome-a${index+1}`);
    feature.geometry.coordinates=[[...points,points[0]]];
    const approach=at(0,27);motorhomeAisle.push(approach);feature.properties.accessPoint={lng:approach[0],lat:approach[1]};
    delete feature.properties.schematicAccessPoint;
  }
  path('plan-2026-motorhome-aisle').geometry.coordinates=[registeredPlanPoint(387,1580),...motorhomeAisle.toReversed()];
  const approach=motorhomeAisle[6],motorhomes=mapZones.features.find(f=>f.properties.id==='plan-2026-motorhomes');
  motorhomes.properties.accessPoint={lng:approach[0],lat:approach[1]};delete motorhomes.properties.schematicAccessPoint;
  return {...data,mapZones,mapPaths,mapPois};
}
