import type { Metadata } from 'next';
import { getClientAppData } from '@/lib/app-data';
import { config } from '@/lib/config';
import { selectVkHeadliners } from '../../../../shared/vk-headliners';
import { HeadlinersShowcase } from './showcase';
import './showcase.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Кто едет на УЛЕТАЙ — участники фестиваля',
  description: 'Знакомьтесь с участниками УЛЕТАЙ, слушайте их в VK Музыке и выбирайте билеты на фестиваль.',
  robots: { index: false, follow: true },
};

export default async function VkHeadlinersPage() {
  const siteUrl = /^https:\/\/[^/]+$/.test(config.corsOrigin) ? config.corsOrigin : 'https://uletayapp.ru';
  const data = await getClientAppData();
  const { festival } = data;
  const format = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dates = format.formatRange(new Date(`${festival.startDate}T12:00:00Z`), new Date(`${festival.endDate}T12:00:00Z`));
  // This dynamic server route serializes one request-time value for hydration.
  // eslint-disable-next-line react-hooks/purity
  const initialNow = Date.now();
  return <HeadlinersShowcase
    cards={selectVkHeadliners(data, siteUrl)}
    year={festival.year}
    startDate={festival.startDate}
    endDate={festival.endDate}
    initialNow={initialNow}
    dates={dates}
    location={festival.locationShort}
    ageRating={festival.ageRating}
    allUrl={`${siteUrl}/headliners/${festival.year}`}
    ticketUrl="https://drivegrup.ru/ticket/ylet3"
    release={process.env.RELEASE_SHA || 'development'}
  />;
}
