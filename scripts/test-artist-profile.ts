import assert from 'node:assert/strict';
import { getRussianGenres, getArtistGenres, normalizeManualArtistGenres } from '../src/utils/musicGenres';
import { getArtistExpectationYear } from '../src/utils/artistExpectation';
import { formatWishVoteCount, getArtistExpectationRating, type WishFeed } from '../shared/artist-wishes';
import type { AppData } from '../src/types';

assert.deepEqual(getRussianGenres([{name:'Russian'},{name:'rock'},{name:'Russian Rock'},{name:'upcoming album 2024'},{name:'yandex music'}]), ['Рок','Русский рок']);
assert.deepEqual(getRussianGenres([{name:'Pop-Rock'},{name:'pop rock'},{name:'rock\'n\'roll'},{name:'post - punk'}]), ['Поп-рок','Рок-н-ролл','Постпанк']);
assert.deepEqual(getRussianGenres([{name:'рок'},{name:'Металкор'},{name:'unknown personal tag'}]), ['Рок','Металкор']);
assert.deepEqual(getRussianGenres(undefined), []);
assert.deepEqual(getRussianGenres([{name:'folk metal'},{name:'Power metal'}], 1), ['Фолк-метал']);
assert.deepEqual(getRussianGenres(['Russian','русский язык','female vocalists','80s','covers','accordion','horror'].map(name=>({name}))), []);
assert.deepEqual(normalizeManualArtistGenres(['Рок','Рок','Русский','Металкор','rock']), ['Рок','Металкор']);
assert.deepEqual(getArtistGenres({genres:[]}), []);
assert.deepEqual(getArtistGenres({lastfm:{tags:[{name:'rock'}]}} as {genres?:string[]}), []);

const data={festival:{year:2027,startDate:'2027-07-07',endDate:'2027-07-11'},schedule:[]} as unknown as Pick<AppData,'festival'|'schedule'>;
assert.equal(getArtistExpectationYear(data,new Date('2026-11-20T12:00:00+04:00')),2027);
assert.equal(getArtistExpectationYear(data,new Date('2027-07-09T20:00:00+04:00')),2027);
assert.equal(getArtistExpectationYear(data,new Date('2027-07-12T03:59:59+04:00')),2027);
assert.equal(getArtistExpectationYear(data,new Date('2027-07-12T04:00:00+04:00')),2028);

const feed={year:2027,artists:[{id:'a',support:100},{id:'b',support:100},{id:'c',support:50},{id:'d',support:0}]} as WishFeed;
assert.deepEqual(getArtistExpectationRating(feed,'a'),{artistId:'a',year:2027,support:100,rank:1,totalArtists:4});
assert.equal(getArtistExpectationRating(feed,'b')?.rank,1);
assert.equal(getArtistExpectationRating(feed,'c')?.rank,3);
assert.equal(getArtistExpectationRating(feed,'d')?.rank,null);
assert.equal(getArtistExpectationRating(feed,'missing'),null);
assert.equal(getArtistExpectationRating({year:2028,artists:[{id:'a',support:0}]} as WishFeed,'a')?.support,0);
assert.equal(formatWishVoteCount(1),'1 голос');
assert.equal(formatWishVoteCount(12),'12 голосов');
assert.equal(formatWishVoteCount(22),'22 голоса');
console.log('Artist profile: Russian genres, metadata filtering, equal ranks, support counts, plural forms and Samara festival rollover passed');
