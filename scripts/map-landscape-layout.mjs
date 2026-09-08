import clipping from 'polygon-clipping';

// Plan coordinates are schematic. These constraints follow the existing site roads.
// The public road was visually traced on the Yandex underlay at centre 53.624016,
// 56.609196 / zoom 16, map bounds x=360,y=-40,w=920,h=900 (2026-09-08).
const center = [53.624016, 56.609196], sx = 111320 * Math.cos(center[1] * Math.PI / 180);
const xy = p => [(p[0] - center[0]) * sx, (p[1] - center[1]) * 111320];
const lngLat = p => [Number((center[0] + p[0] / sx).toFixed(11)), Number((center[1] + p[1] / 111320).toFixed(11))];
const screenToGeo = ([x, y]) => {
  const s = 256 * 2 ** 16, cy = (0.5 - Math.log((1 + Math.sin(center[1] * Math.PI / 180)) / (1 - Math.sin(center[1] * Math.PI / 180))) / (4 * Math.PI)) * s;
  return [center[0] + (x - 820) * 360 / s, Math.atan(Math.sinh(Math.PI * (1 - 2 * (cy + y - 410) / s))) * 180 / Math.PI];
};
export const landscapeRoad = [[360,164],[513,287],[532,309],[539,322],[554,365],[574,470],[592,602],[620,858]].map(screenToGeo);
// Narrow track crossing the southern tent area: underlay at zoom 17,
// centre unchanged, map x=0,y=34,w=1280,h=621.
const landscapeTrack = [[448,451],[503,459],[621,476],[735,490],[801,499]].map(([x,y]) => screenToGeo([820+(x-640)/2,410+(y-344.5)/2]));
const area = polygon => Math.abs(polygon[0].reduce((s, a, i, r) => { const b = r[(i + 1) % r.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
const largest = multi => [...multi].sort((a,b) => area(b) - area(a))[0];
const overlaps = (a, b) => clipping.intersection(a, b).some(p => area(p) > 0.005);
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
  const roads = data.mapPaths.features.filter(f=>f.properties.pathKind !== 'fence' && !f.properties.routingOnly);
  return clipping.union(corridor(landscapeRoad.map(xy), 5), corridor(landscapeTrack.map(xy), 1.8), ...roads.map(f => corridor(f.geometry.coordinates.map(xy), f.properties.pathKind === 'walkway' ? 1.4 : 3.5)));
}

export function arrangeMapLandscape(data) {
  const roads = landscapeRoadCorridors(data);
  const zones = data.mapZones.features.map(f => ({...f, properties:{...f.properties}, geometry: structuredClone(f.properties.schematicGeometry ?? f.geometry)}));
  const base = new Map(zones.map(f=>[f.properties.id, structuredClone(f.geometry)]));
  const broad = f => !f.properties.parentZoneId && ['parking','camping','autocamp','comfort'].includes(f.properties.zoneType) && !/гостиниц/i.test(f.properties.name);
  const small = zones.filter(f => !broad(f) && !f.properties.parentZoneId).sort((a,b)=> Number(b.properties.zoneType==='stage_area')-Number(a.properties.zoneType==='stage_area'));
  const placed = [];
  const report = [];
  for (const feature of small) {
    let poly = feature.geometry.coordinates.map(r=>r.map(xy));
    if (feature.properties.zoneType === 'custom') {
      const clipped = largest(clipping.difference(poly, roads, ...placed));
      if (clipped && area(clipped) > area(poly) * 0.3) {
        report.push({id:feature.properties.id,name:feature.properties.name,retainedPercent:Math.round(area(clipped)/area(poly)*100)});
        poly = clipped;
      }
    }
    const collides = candidate => overlaps(candidate, roads) || placed.some(p=>overlaps(candidate,p));
    if (collides(poly)) {
      let chosen;
      const points=poly[0].slice(0,-1), cx=points.reduce((s,p)=>s+p[0],0)/points.length,cy=points.reduce((s,p)=>s+p[1],0)/points.length;
      for (let distance = 0; distance <= 35 && !chosen; distance += 1) {
        for(const scale of [1,0.85,0.7,0.55]) {
          for (let angle = 0; angle < 360; angle += 15) {
            const dx=distance*Math.cos(angle*Math.PI/180),dy=distance*Math.sin(angle*Math.PI/180);
            const candidate=move(poly.map(r=>r.map(p=>[cx+(p[0]-cx)*scale,cy+(p[1]-cy)*scale])),dx,dy);
            if (!collides(candidate)) {chosen={candidate,dx,dy,distance,scale};break;}
          }
          if(chosen)break;
        }
      }
      if (!chosen) throw new Error('Cannot place without overlap: '+feature.properties.name);
      poly = chosen.candidate;
      report.push({id:feature.properties.id,name:feature.properties.name,shiftMeters:chosen.distance,scale:chosen.scale});
    }
    feature.geometry.coordinates=poly.map(r=>r.map(lngLat));
    placed.push(poly);
  }
  // Each pitch stays a real polygon. Moving a whole row keeps the grid regular.
  const families = new Map();
  zones.filter(f=>f.properties.parentZoneId).forEach(f=>{
    const key=f.properties.id.match(/-r\d+-/)?.[0] ?? f.properties.parentZoneId;
    families.set(key,[...(families.get(key)??[]),f]);
  });
  for (const family of families.values()) {
    const polygons=family.map(f=>f.geometry.coordinates.map(r=>r.map(xy)));
    const collides = shapes => shapes.some(poly=>overlaps(poly,roads)||placed.some(p=>overlaps(poly,p)));
    let chosen=polygons;
    if(collides(chosen)) {
      let found=false;
      for(let distance=1;distance<=35&&!found;distance++) for(let angle=0;angle<360;angle+=15) {
        const candidate=polygons.map(p=>move(p,distance*Math.cos(angle*Math.PI/180),distance*Math.sin(angle*Math.PI/180)));
        if(!collides(candidate)){chosen=candidate;found=true;report.push({id:family[0].properties.id,row:true,shiftMeters:distance});break;}
      }
      if(!found)throw new Error('Cannot place pitch row');
    }
    family.forEach((f,i)=>{f.geometry.coordinates=chosen[i].map(r=>r.map(lngLat));placed.push(chosen[i]);});
  }
  const occupiedAreas=[];
  for(const feature of zones.filter(broad)) {
    let poly=feature.geometry.coordinates.map(r=>r.map(xy));
    const children=zones.filter(f=>f.properties.parentZoneId===feature.properties.id);
    if(children.length) poly=largest(clipping.union(poly,...children.map(f=>f.geometry.coordinates.map(r=>r.map(xy)))));
    let remaining=clipping.difference(poly,roads,...occupiedAreas);
    if(!remaining.length)throw new Error('Area removed entirely: '+feature.properties.name);
    const clean=feature.properties.zoneType === 'camping' ? remaining : [largest(remaining)];
    // Reserve building footprints within areas so neither fills nor captions overlap them.
    const otherFootprints=small.map(f=>f.geometry.coordinates.map(r=>r.map(xy)));
    remaining=clipping.difference(clean,...otherFootprints);
    const footprint=largest(remaining);
    if(!footprint)throw new Error('No usable area: '+feature.properties.name);
    feature.geometry.coordinates=footprint.map(r=>r.map(lngLat));
    const parts=feature.properties.zoneType === 'camping' ? remaining.filter(p=>p!==footprint&&area(p)>4) : [];
    if(parts.length) feature.properties.geometryParts=parts.map(p=>({type:'Polygon',coordinates:p.map(r=>r.map(lngLat))}));
    else delete feature.properties.geometryParts;
    feature.properties.fillOpacity=feature.properties.zoneType==='autocamp' ? 0.12 : 0.16;
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
  return { data:{...data,mapZones:{...data.mapZones,features:zones}},report };
}
