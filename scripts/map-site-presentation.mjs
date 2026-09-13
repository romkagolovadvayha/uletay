import clipping from 'polygon-clipping';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { registeredPlanPoint, nearestOnLine } from './map-site-registration.mjs';

// The layout packer can shift a stage away from its traced backstage polygon.
// Join both into a single enclosure so that gap never becomes a public passage.
function enclosure(points) {
  const sorted=[...new Map(points.map(p=>[String(p),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half=points=>{const hull=[];for(const p of points){while(hull.length>=2&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}return hull.slice(0,-1);};
  const ring=[...half(sorted),...half([...sorted].reverse())];
  return [...ring,ring[0]];
}

export function finalizeSitePresentation(data) {
  const close=ring=>String(ring[0])===String(ring.at(-1))?ring:[...ring,ring[0]];
  const outer=data.mapPaths.features.find(f=>f.properties.id==='path-mr8m9bz5');
  const parking=data.mapZones.features.filter(f=>f.properties.zoneType==='parking');
  // One continuous green site, as on the supplied plan; area subdivisions do
  // not become spurious streets or bright polygon borders.
  const ground=clipping.union([close(outer.geometry.coordinates)],...parking.flatMap(f=>[f.geometry,...(f.properties.geometryParts??[])].map(g=>g.coordinates)));
  data.festivalMap.siteOutline={type:'MultiPolygon',coordinates:ground};
  const restricted=[];
  for(const [id,stageId,points] of [
    ['west','zone-mr8m54xa',[[381,784],[437,822],[443,840],[410,852],[381,852]]],
    ['ren','zone-mr8m4008',[[934,857],[1001,853],[998,927],[935,917]]],
    ['south','zone-mr8m5vsc',[[644,1183],[734,1191],[718,1197],[655,1256],[644,1264],[629,1224]]],
  ]){
    const stage=data.mapZones.features.find(f=>f.properties.id===stageId);
    const polys=[[enclosure([...points.map(p=>registeredPlanPoint(...p)),...stage.geometry.coordinates[0]])]];
    for(const [index,coordinates] of polys.entries()){
      const zone={type:'Feature',geometry:{type:'Polygon',coordinates},properties:{id:`stage-backstage-${id}-${index}`,name:`Закрытая зона — ${stage.properties.name}`,zoneType:'fence',fillColor:'#8DA837',fillOpacity:0,showLabel:false,accessRestricted:true}};
      restricted.push(zone);
      data.mapPaths.features.push({type:'Feature',geometry:{type:'LineString',coordinates:coordinates[0]},properties:{id:`stage-backstage-fence-${id}-${index}`,name:`Ограждение сцены — ${stage.properties.name}`,pathKind:'fence'}});
    }
  }
  for(const zone of data.mapZones.features){
    if(zone.properties.zoneType==='stage_area')continue;
    const ring=zone.geometry.coordinates[0].slice(0,-1),center=ring.reduce((s,p)=>[s[0]+p[0]/ring.length,s[1]+p[1]/ring.length],[0,0]);
    if(restricted.some(f=>booleanPointInPolygon(center,f))){
      zone.properties.accessRestricted=true;
      delete zone.properties.accessPoint;
      delete zone.properties.schematicAccessPoint;
      zone.properties.description='Объект в служебной зоне за сценой. Проход для посетителей закрыт.';
    }
  }
  data.mapZones.features.push(...restricted);
  // Walking across the public dance floor connects the stage front to the
  // northern services without a long circuit or a shortcut through backstage.
  const ren=data.mapZones.features.find(f=>f.properties.id==='zone-mr8m4008').properties.accessPoint;
  const medical=data.mapPaths.features.find(f=>f.properties.id==='plan-2026-medical-ren-link').geometry.coordinates[0];
  const approach=data.mapPaths.features.filter(f=>f.properties.pathKind!=='fence'&&!f.properties.closed)
    .map(f=>nearestOnLine([ren.lng,ren.lat],f.geometry.coordinates)).sort((a,b)=>a.distance-b.distance)[0].coordinate;
  data.mapPaths.features.push({type:'Feature',properties:{id:'stage-front-ren',name:'Проход по танцполу РЕН ТВ',pathKind:'walkway',routingOnly:true,openAreaId:'plan-2026-dance-ren'},
    geometry:{type:'LineString',coordinates:[approach,[ren.lng,ren.lat],medical]}});
  return data;
}
