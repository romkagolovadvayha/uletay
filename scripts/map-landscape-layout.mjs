import clipping from 'polygon-clipping';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { currentCentralStreet, currentPublicRoad, currentSiteTracks, nearestOnLine } from './map-site-registration.mjs';

// Placement constraints use the current MapLibre underlay and visitor paths.
const center = [53.624016, 56.609196], sx = 111320 * Math.cos(center[1] * Math.PI / 180);
const xy = p => [(p[0] - center[0]) * sx, (p[1] - center[1]) * 111320];
const lngLat = p => [Number((center[0] + p[0] / sx).toFixed(11)), Number((center[1] + p[1] / 111320).toFixed(11))];
export const landscapeRoad = currentPublicRoad;
const area = polygon => Math.abs(polygon[0].reduce((s, a, i, r) => { const b = r[(i + 1) % r.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
const largest = multi => [...multi].sort((a,b) => area(b) - area(a))[0];
const cachedBounds=new WeakMap();
function bounds(poly) {
  let result=cachedBounds.get(poly);if(result)return result;
  result=[Infinity,Infinity,-Infinity,-Infinity];
  for(const p of poly.flat(typeof poly[0]?.[0]?.[0]==='number'?1:2)){
    result[0]=Math.min(result[0],p[0]);result[1]=Math.min(result[1],p[1]);result[2]=Math.max(result[2],p[0]);result[3]=Math.max(result[3],p[1]);
  }
  cachedBounds.set(poly,result);return result;
}
const overlaps = (a, b) => {
  const x=bounds(a),y=bounds(b);
  return x[0]<y[2]&&x[2]>y[0]&&x[1]<y[3]&&x[3]>y[1]&&clipping.intersection(a,b).some(p=>area(p)>.005);
};
function nearby(roads,poly) {
  const [x0,y0,x1,y1]=bounds(poly),m=46;
  return clipping.intersection(roads,[[[x0-m,y0-m],[x1+m,y0-m],[x1+m,y1+m],[x0-m,y1+m],[x0-m,y0-m]]]);
}
function convexHull(points) {
  const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=points=>{const result=[];for(const p of points){while(result.length>1&&cross(result.at(-2),result.at(-1),p)<=0)result.pop();result.push(p);}return result.slice(0,-1);};
  const ring=[...half(sorted),...half(sorted.toReversed())];return [[...ring,ring[0]]];
}
const isSolid=f=>!f.properties.parentZoneId&&!['parking','camping','autocamp','custom'].includes(f.properties.zoneType)
  &&(f.properties.zoneType!=='comfort'||/гостиниц/i.test(f.properties.name));
const geometries=f=>[f.geometry,...(f.properties.geometryParts??[])];
function crossesLine(a,b,line) {
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  return line.slice(1).some((d,i)=>{const c=line[i];return cross(a,b,c)*cross(a,b,d)<-1e-18&&cross(c,d,a)*cross(c,d,b)<-1e-18;});
}
function assignBuildingApproaches(zones,paths) {
  const roads=paths.features.filter(f=>f.properties.pathKind!=='fence'&&!f.properties.closed);
  const fences=paths.features.filter(f=>f.properties.pathKind==='fence').map(f=>f.geometry.coordinates);
  const solids=zones.filter(isSolid);
  for(const feature of solids.filter(f=>f.properties.zoneType!=='stage_area'&&!f.properties.accessRestricted&&f.properties.id!=='plan-2026-wc-south')){
    const samples=geometries(feature).flatMap(g=>{const ring=g.coordinates[0];return ring.slice(0,-1).flatMap((a,i)=>[a,[(a[0]+ring[i+1][0])/2,(a[1]+ring[i+1][1])/2]]);});
    const candidates=samples.flatMap(target=>roads.map(f=>({...nearestOnLine(target,f.geometry.coordinates),target}))).sort((a,b)=>a.distance-b.distance);
    const best=candidates.find(({coordinate:a,target:b,distance})=>distance<=35
      &&!fences.some(line=>crossesLine(a,b,line))
      &&!solids.some(other=>other!==feature&&geometries(other).some(g=>crossesLine(a,b,g.coordinates[0])
        ||booleanPointInPolygon([(a[0]+b[0])/2,(a[1]+b[1])/2],g))));
    if(!best)throw new Error('No unobstructed visitor approach: '+feature.properties.name);
    feature.properties.accessPoint={lng:Number(best.coordinate[0].toFixed(11)),lat:Number(best.coordinate[1].toFixed(11))};
    feature.properties.accessPointGenerated=true;
  }
}
const move = (poly, dx, dy) => poly.map(r => r.map(p => [p[0] + dx, p[1] + dy]));
function corridor(points, radius) {
  const polys = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) continue;
    const dx = (b[1] - a[1]) / length * radius, dy = -(b[0] - a[0]) / length * radius;
    polys.push([[[a[0]+dx,a[1]+dy],[b[0]+dx,b[1]+dy],[b[0]-dx,b[1]-dy],[a[0]-dx,a[1]-dy],[a[0]+dx,a[1]+dy]]]);
  }
  for (const a of points) {
    const r = Array.from({length:13},(_,i)=>[a[0]+radius*Math.cos(i*Math.PI/6), a[1]+radius*Math.sin(i*Math.PI/6)]);
    r[12] = r[0]; polys.push([r]);
  }
  return clipping.union(...polys);
}
export function landscapeRoadCorridors(data) {
  const roads = data.mapPaths.features.filter(f=>f.properties.pathKind !== 'fence' && !f.properties.openAreaId);
  return clipping.union(corridor(landscapeRoad.map(xy), 5), corridor(currentCentralStreet.map(xy), 4),
    ...currentSiteTracks.map(line=>corridor(line.map(xy),2.2)),
    ...roads.map(f => corridor(f.geometry.coordinates.map(xy), f.properties.routingOnly ? .7 : f.properties.pathKind === 'walkway' ? 1.4 : 3.5)));
}

export function arrangeMapLandscape(data) {
  const roads = clipping.union(landscapeRoadCorridors(data), ...data.mapPaths.features.filter(f=>f.properties.pathKind==='fence').map(f=>corridor(f.geometry.coordinates.map(xy),.6)));
  const zones = data.mapZones.features.map(f => ({...f, properties:{...f.properties}, geometry: structuredClone(f.geometry)}));
  const base = new Map(zones.map(f=>[f.properties.id, structuredClone(f.properties.schematicGeometry ?? f.geometry)]));
  const outerFence=data.mapPaths.features.find(f=>f.properties.id==='path-mr8m9bz5');
  const close=ring=>[...ring,ring[0]];
  const sourceBoundary={type:'Polygon',coordinates:[close(outerFence.properties.schematicGeometry.coordinates)]};
  const boundary=[close(outerFence.geometry.coordinates).map(xy)];
  const mustStayInside=feature=>{
    const points=base.get(feature.properties.id).coordinates[0],center=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);
    return booleanPointInPolygon(center,sourceBoundary);
  };
  const leavesBoundary=poly=>clipping.difference(poly,boundary).some(p=>area(p)>.005);
  const broad = f => !f.properties.parentZoneId && ['parking','camping','autocamp','comfort'].includes(f.properties.zoneType) && !/гостиниц/i.test(f.properties.name);
  const small = zones.filter(f => !broad(f) && !f.properties.parentZoneId).sort((a,b)=> Number(b.properties.zoneType==='stage_area')-Number(a.properties.zoneType==='stage_area'));
  const placed = [];
  const report = [];
  for (const feature of small) {
    let poly = feature.geometry.coordinates.map(r=>r.map(xy));
    if(['plan-2026-trade-central','plan-2026-trade-north'].includes(feature.properties.id)){
      // A trade row is a row of pavilions, with openings for visitor passages.
      const pieces=clipping.difference(poly,roads,...placed).filter(p=>area(p)>1);
      if(!pieces.length)throw new Error('Trade row has no usable pavilions: '+feature.properties.name);
      const main=largest(pieces);
      feature.geometry.coordinates=main.map(r=>r.map(lngLat));
      feature.properties.geometryParts=pieces.filter(p=>p!==main).map(p=>({type:'Polygon',coordinates:p.map(r=>r.map(lngLat))}));
      placed.push(...pieces.flatMap(p=>clipping.union(p,corridor(p[0],.8))));
      continue;
    }
    const localRoads=nearby(roads,poly);
    const inside=mustStayInside(feature);
    const collides = candidate => overlaps(candidate, localRoads) || placed.some(p=>overlaps(candidate,p)) || inside&&leavesBoundary(candidate);
    if (collides(poly)) {
      let chosen;
      for (let distance = 0; distance <= 45 && !chosen; distance += 1) {
        for (let angle = 0; angle < 360; angle += 15) {
          const dx=distance*Math.cos(angle*Math.PI/180),dy=distance*Math.sin(angle*Math.PI/180);
          const candidate=move(poly,dx,dy);
          if (!collides(candidate)) {chosen={candidate,distance};break;}
        }
      }
      if (!chosen) throw new Error('Cannot place without overlap: '+feature.properties.name);
      poly = chosen.candidate;
      report.push({id:feature.properties.id,name:feature.properties.name,shiftMeters:chosen.distance});
    }
    feature.geometry.coordinates=poly.map(r=>r.map(lngLat));
    placed.push(...clipping.union(poly,corridor(poly[0],.8)));
  }
  // Each pitch stays a real polygon. Moving a whole row keeps the grid regular.
  const families = new Map();
  zones.filter(f=>f.properties.parentZoneId).forEach(f=>{
    const key=f.properties.bookingGroup ?? f.properties.parentZoneId;
    families.set(key,[...(families.get(key)??[]),f]);
  });
  for (const family of families.values()) {
    const polygons=family.map(f=>f.geometry.coordinates.map(r=>r.map(xy)));
    const localRoads=nearby(roads,polygons);
    const inside=family.some(mustStayInside);
    const collides = shapes => shapes.some(poly=>overlaps(poly,localRoads)||placed.some(p=>overlaps(poly,p))||inside&&leavesBoundary(poly));
    let chosen=polygons;
    if(collides(chosen)) {
      let found=false;
      for(let distance=1;distance<=45&&!found;distance++) for(let angle=0;angle<360;angle+=15) {
        const candidate=polygons.map(p=>move(p,distance*Math.cos(angle*Math.PI/180),distance*Math.sin(angle*Math.PI/180)));
        if(!collides(candidate)){chosen=candidate;found=true;report.push({id:family[0].properties.id,row:true,shiftMeters:distance});break;}
      }
      if(!found)throw new Error('Cannot place pitch row: '+family[0].properties.name);
    }
    family.forEach((f,i)=>{f.geometry.coordinates=chosen[i].map(r=>r.map(lngLat));placed.push(chosen[i]);});
  }
  const occupiedAreas=[];
  const broadZones=zones.filter(broad).sort((a,b)=>Number(zones.some(f=>f.properties.parentZoneId===b.properties.id))-Number(zones.some(f=>f.properties.parentZoneId===a.properties.id)));
  for(const feature of broadZones) {
    let poly=feature.geometry.coordinates.map(r=>r.map(xy));
    const children=zones.filter(f=>f.properties.parentZoneId===feature.properties.id);
    if(children.length) poly=largest(clipping.union(poly,convexHull(children.flatMap(f=>f.geometry.coordinates[0].map(xy)))));
    let remaining=clipping.difference(poly,roads,...occupiedAreas);
    if(mustStayInside(feature))remaining=clipping.intersection(remaining,boundary);
    if(!remaining.length)throw new Error('Area removed entirely: '+feature.properties.name);
    const clean=remaining;
    // Reserve building footprints within areas so neither fills nor captions overlap them.
    const otherFootprints=small.flatMap(f=>geometries(f).map(g=>g.coordinates.map(r=>r.map(xy))));
    remaining=clipping.difference(clean,...otherFootprints);
    const footprint=largest(remaining);
    if(!footprint)throw new Error('No usable area: '+feature.properties.name);
    feature.geometry.coordinates=footprint.map(r=>r.map(lngLat));
    const parts=remaining.filter(p=>p!==footprint&&area(p)>4);
    if(parts.length) feature.properties.geometryParts=parts.map(p=>({type:'Polygon',coordinates:p.map(r=>r.map(lngLat))}));
    else delete feature.properties.geometryParts;
    occupiedAreas.push(footprint,...parts);
    report.push({id:feature.properties.id,name:feature.properties.name,retainedPercent:Math.round(area(footprint)/area(poly)*100)});
  }
  for(const feature of zones) {
    feature.properties.schematicGeometry=base.get(feature.properties.id);
    // Rotated captions are fitted to the resulting footprint at render time.
    delete feature.properties.labelRotation;
    delete feature.properties.layoutRings;
    delete feature.properties.layout;
  }
  assignBuildingApproaches(zones,data.mapPaths);
  return { data:{...data,mapZones:{...data.mapZones,features:zones}},report };
}
