import {getMyArtistWishes,wishResponse,wishFailure} from '@/lib/artist-wishes';
import {optionsResponse} from '@/lib/api-response';
export const dynamic='force-dynamic';
export async function OPTIONS(){return optionsResponse();}
export async function GET(request:Request){try{return wishResponse(await getMyArtistWishes(request));}catch(error){return wishFailure(error);}}
