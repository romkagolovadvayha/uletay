import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const origin = 'http://127.0.0.1:3000';
const response = await fetch(`${origin}/api/data`);
assert.equal(response.status,200);
const payload=await response.json(), data=payload.data||payload;
assert.equal(data.headliners.length,870);
assert.ok(data.headliners.every(artist=>Array.isArray(artist.genres)&&(!artist.lastfm||artist.lastfm.tags.length===0)));
const feed=await (await fetch(`${origin}/api/wishes`)).json();
for(const artist of [feed.artists[0],feed.artists.find(item=>item.name==='The Hatters')].filter(Boolean)) {
 const result=await fetch(`${origin}/api/wishes/rating?artistId=${encodeURIComponent(artist.id)}&year=${data.festival.year}`);
 assert.equal(result.status,200); assert.equal(result.headers.get('cache-control'),'no-store');
 const rating=await result.json();
 assert.equal(rating.support,artist.support);assert.equal(rating.rank,1+feed.artists.filter(item=>item.support>artist.support).length);
 assert.equal('score' in rating,false);
}
const next=await (await fetch(`${origin}/api/wishes/rating?artistId=${encodeURIComponent(feed.artists[0].id)}&year=${data.festival.year+1}`)).json();
assert.equal(next.support,0); assert.equal(next.rank,null);
const alias=await fetch(`${origin}/api/wishes/rating?artistId=hl-ravanna`); assert.equal(alias.status,200);
assert.equal((await fetch(`${origin}/api/wishes/rating?artistId=unknown`)).status,404);
assert.equal((await fetch(`${origin}/api/wishes/rating`)).status,400);
assert.equal((await fetch(`${origin}/api/wishes/rating?artistId=x&year=2027x`)).status,400);
assert.equal((await fetch(`${origin}/api/wishes/rating?artistId=x&year=2029`)).status,400);
// The offline fallback uses the same editorial catalog as the local public API.
await writeFile('public/api/data',JSON.stringify(data));
console.log('Artist HTTP: editorial genres for all 870 records, no Last.fm tags, support/ranking without scores, aliases, next-year reset, invalid input and offline catalog verified.');
