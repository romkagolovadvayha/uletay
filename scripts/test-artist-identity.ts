import assert from 'node:assert/strict';
import {resolveArtistProfile} from '../shared/artist-identity';
import {resolveSeoMeta} from '../src/seo/routeSeo';
import {readFileSync} from 'node:fs';
import type {AppData,Headliner} from '../src/types';

const primary:Headliner={id:'hl-стигмата-stigmata',name:'СТИГМАТА / STIGMATA',description:'',imageTint:'#000',years:[2027,2026,2025],imageUrl:'/original.webp',genres:['Металкор']};
const requested:Headliner={...primary,id:'hl-stigmata',name:'STIGMATA',years:[],imageUrl:'/request.webp',genres:[]};
const artists=[primary,requested];const original=JSON.stringify(artists);
for(const id of [primary.id,requested.id]){
  const profile=resolveArtistProfile(artists,id)!;
  assert.equal(profile.id,primary.id);assert.equal(profile.imageUrl,primary.imageUrl);assert.deepEqual(profile.years,[2027,2026,2025]);assert.deepEqual(profile.genres,['Металкор']);
}
assert.equal(JSON.stringify(artists),original,'Resolving a duplicate must not rewrite the catalog');
assert.equal(resolveArtistProfile([primary],requested.id)?.id,primary.id,'Old IDs still open a profile after normalization');
assert.equal(resolveArtistProfile(artists,'missing'),undefined);
const data=JSON.parse(readFileSync(new URL('../cms/seed/content.json',import.meta.url),'utf8')) as AppData;
data.headliners=artists;
const meta=resolveSeoMeta({routes:[{name:'HeadlinerDetail',params:{headlinerId:requested.id}}],index:0},data);
assert.equal(meta.path,'/headliners/hl-стигмата-stigmata');assert.match(meta.title,/2027/);
console.log('Artist identities: history, portraits, manual genres, old links and shared canonical preserved; no data mutation.');
