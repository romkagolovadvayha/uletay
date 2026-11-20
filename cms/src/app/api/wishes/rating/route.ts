import { getArtistWishRating, wishFailure, wishResponse, WishError } from '@/lib/artist-wishes';
import { optionsResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';
export async function OPTIONS() { return optionsResponse(); }
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawYear = params.get('year');
    if (rawYear !== null && !/^\d{4}$/.test(rawYear)) throw new WishError('Неверный год фестиваля', 400);
    return wishResponse(await getArtistWishRating(params.get('artistId') || '', rawYear === null ? undefined : Number(rawYear)));
  } catch (error) { return wishFailure(error); }
}
