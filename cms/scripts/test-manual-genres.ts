import assert from 'node:assert/strict';
import { MockAgent, setGlobalDispatcher } from 'undici';
import { fetchLastFmArtistProfile } from '../src/lib/lastfm';
import { enrichHeadlinerFromLastFm } from '../src/lib/headliner-lastfm-sync';
import { mergeLastFmProfiles } from '../src/lib/lastfm-merge';
import { trimLastFmTopTracks, toClientLastFmProfile } from '../src/lib/lastfm-tracks';
import { syncAppHeadliners } from '../src/lib/headliners';
import type { AppData, Headliner } from '../src/types';

async function main() {
  process.env.LASTFM_API_KEY = 'test-local-mock-only';
  process.env.LASTFM_PROXY_URL = ''; process.env.HTTPS_PROXY = ''; process.env.HTTP_PROXY = '';
  const mock = new MockAgent(); mock.disableNetConnect(); setGlobalDispatcher(mock);
  const api = mock.get('https://ws.audioscrobbler.com');
  api.intercept({path:/artist\.getinfo/}).reply(200,{artist:{name:'Тест',stats:{listeners:'123',playcount:'456'},tags:{tag:[{name:'Russian'},{name:'metal'}]},similar:{artist:[]}}}).persist();
  api.intercept({path:/artist\.gettoptracks/}).reply(200,{toptracks:{track:[{name:'Песня',playcount:'40','@attr':{rank:'1'}}]}}).persist();
  try {
    const profile = await fetchLastFmArtistProfile('Тест');
    assert.deepEqual(profile.tags,[]); assert.equal(profile.listeners,123); assert.equal(profile.topTracks[0].name,'Песня');
    const stale={...profile,tags:[{name:'Russian'},{name:'rock'}]};
    assert.deepEqual(mergeLastFmProfiles([stale])?.tags,[]);
    assert.deepEqual(trimLastFmTopTracks(stale).tags,[]);
    assert.deepEqual(toClientLastFmProfile(stale).tags,[]);
    const artist:Headliner={id:'test',name:'Тест',description:'Тест',imageTint:'#111111',imageUrl:'/already-set.jpg',years:[2027],genres:['Фолк-рок','Рок']};
    const updated=await enrichHeadlinerFromLastFm(artist,[artist]);
    assert.deepEqual(updated.genres,artist.genres); assert.deepEqual(updated.lastfm?.tags,[]);
    const normalized=syncAppHeadliners({headliners:[updated],schedule:[],autographs:[]} as unknown as AppData);
    assert.deepEqual(normalized.headliners[0].genres,artist.genres);
    const cleared={...artist,genres:[]};
    assert.deepEqual((await enrichHeadlinerFromLastFm(cleared,[cleared])).genres,[]);
    const duplicate={...artist,id:'same-name',genres:['Металкор']};
    const byReference=syncAppHeadliners({headliners:[cleared,duplicate],schedule:[{id:'show',headlinerId:duplicate.id,artist:duplicate.name,date:'2027-07-07'}],autographs:[]} as unknown as AppData);
    assert.deepEqual(byReference.headliners.find(a=>a.id===duplicate.id)?.genres,['Металкор']);
    assert.deepEqual(byReference.headliners.find(a=>a.id===cleared.id)?.genres,[]);
    console.log('Manual genres: Last.fm responses ignored; refresh, normalization and explicit clearing preserve editorial genres; statistics and tracks still update.');
  } finally { await mock.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
