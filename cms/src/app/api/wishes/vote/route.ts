import {saveArtistWishVote,wishResponse,wishFailure} from '@/lib/artist-wishes';
import {optionsResponse} from '@/lib/api-response';
export const dynamic='force-dynamic';
export async function OPTIONS(){return optionsResponse();}
export async function POST(request:Request){try{return wishResponse(await saveArtistWishVote(request));}catch(error){return wishFailure(error);}}
