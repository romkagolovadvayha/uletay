// Curated public identity links shared with the community vote importer.
import identities from '../cms/data/wish-artist-identities.json';

const aliases:Record<string,string>=identities;
type ArtistIdentity={id:string;years:number[];imageUrl?:string};
export function resolveArtistProfile<T extends ArtistIdentity>(artists:readonly T[],id:string):T|undefined {
  const ballot=aliases[id]||id;
  const ids=new Set([ballot,...Object.keys(aliases).filter(key=>aliases[key]===ballot)]);
  const records=artists.filter(artist=>ids.has(artist.id));
  if(!records.length)return undefined;
  // Preserve the established history URL when a request created a second ID.
  const primary=[...records].sort((a,b)=>b.years.length-a.years.length||a.id.localeCompare(b.id))[0];
  return {...primary,years:[...new Set(records.flatMap(artist=>artist.years))].sort((a,b)=>b-a),imageUrl:primary.imageUrl||records.find(artist=>artist.imageUrl)?.imageUrl};
}
