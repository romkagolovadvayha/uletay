import {getArtistWishes,wishResponse,wishFailure} from '@/lib/artist-wishes';
import {optionsResponse} from '@/lib/api-response';
export const dynamic='force-dynamic';
export async function OPTIONS(){return optionsResponse();}
export async function GET(){try{return wishResponse(await getArtistWishes());}catch(error){return wishFailure(error);}}
