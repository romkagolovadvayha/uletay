import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {mergeCommunityRelease,type CommunityReleaseSeed} from '../shared/community-release';
import type {AppData} from '../src/types';
import {validateAppData} from '../shared/app-data-validation';
const seed=JSON.parse(readFileSync('cms/data/community-release-20261121.json','utf8')) as CommunityReleaseSeed;
const current=JSON.parse(readFileSync('public/api/data','utf8')) as AppData;
const existing=seed.updates[0],added=seed.artists[0];
const baseline={...current,headliners:current.headliners.filter(a=>!seed.artists.some(b=>b.id===a.id)).map(a=>a.id===existing.id?{...a,...existing.before}:a)};
const merged=mergeCommunityRelease(baseline,seed);assert.ok(validateAppData(merged));assert.ok(merged.headliners.some(a=>a.id===added.id));assert.deepEqual(merged.schedule,baseline.schedule);assert.deepEqual(merged.festival,baseline.festival);
const editorial={...merged,headliners:merged.headliners.map(a=>a.id===existing.id?{...a,genres:['Блюз'],imageUrl:'/api/uploads/images/new-admin-choice.webp'}:a)};
const repeated=mergeCommunityRelease(editorial,seed);assert.equal(repeated.headliners.length,merged.headliners.length);assert.deepEqual(repeated.headliners.find(a=>a.id===existing.id)?.genres,['Блюз']);assert.equal(repeated.headliners.find(a=>a.id===existing.id)?.imageUrl,'/api/uploads/images/new-admin-choice.webp');
assert.equal(mergeCommunityRelease({...current,festival:{...current.festival,year:2028}},seed).festival.year,2028);
for(const artist of merged.headliners){if(!artist.imageUrl?.startsWith('/api/fest-assets/community-20261121/'))continue;const file=artist.imageUrl.replace('/api/fest-assets/','assets/');assert.ok(existsSync(resolve(file)),`Missing release media: ${artist.name}`);assert.ok(existsSync(resolve(file.replace(/\.webp$/,'-list.webp'))),`Missing thumbnail: ${artist.name}`);}
console.log(`Community release: ${seed.artists.length} artists, editorial preservation, repeat safety, all referenced photos and thumbnails OK.`);
