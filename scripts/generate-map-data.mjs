import fs from 'node:fs/promises';
import { supplementFestivalMap } from './festival-map-plan.mjs';

const file='cms/seed/content.json';
const data=supplementFestivalMap(JSON.parse(await fs.readFile(file,'utf8')));
data.mapDataVersion='2026-plan-v3-central-street';
await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
// Same geometry for a cold native launch without a network connection. CMS
// responses still replace these collections, including deliberately empty ones.
const snapshot=Object.fromEntries(['festivalMap','mapZones','mapPaths','mapPois'].map(key=>[key,data[key]]));
const compact=JSON.stringify(snapshot,(key,value)=>key.startsWith('schematic')?undefined:value);
await fs.writeFile('src/data/festivalMapSnapshot.json',compact+'\n');
console.log(`Generated ${data.mapDataVersion}: ${data.mapZones.features.length} zones, ${data.mapPaths.features.length} paths, ${data.mapPois.features.length} entrances/info markers.`);
