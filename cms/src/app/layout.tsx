import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'УЛЕТАЙ CMS',
  description: 'Сервер контента фестиваля УЛЕТАЙ.',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get('uletay_admin_theme')?.value === 'light' ? 'light' : 'dark';
  return (
    <html lang="ru" data-admin-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
