import { SITE_URL } from '../seo/site';

export const FESTIVAL_WEBSITE = 'https://uletayfest.ru';
export const FESTIVAL_CONTACTS_URL = `${FESTIVAL_WEBSITE}/contacty`;
export const TICKET_VENDOR_URL = 'https://drivegrup.ru/ticket/ylet2';
export const FESTIVAL_VK_URL = 'https://vk.com/im/convo/-10571147';

export const LEGAL_OPERATOR = {
  name: 'ИП Непогодин С.Ю.',
  ogrnip: '324180000036957',
  inn: '183305717659',
  address: '426030, УР, г. Ижевск, ул. Пазелинская, д. 90В',
  email: 'fonarizh@yandex.ru',
  phones: ['+73412900920', '+73412638610'] as const,
  phoneLabels: ['+7 (3412) 900-920', '+7 (3412) 638-610'] as const,
  location: 'Удмуртия, Сарапульский район, село Лагуново, YLЕТАЙ поле',
};

/** Public URL for App Store Connect / Google Play privacy policy field. */
export const PRIVACY_POLICY_URL = `${SITE_URL}/legal`;

export const SUPPORT_URL = FESTIVAL_CONTACTS_URL;

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  afterBullets?: string[];
};
