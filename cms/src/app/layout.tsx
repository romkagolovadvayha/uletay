import type { Metadata, Viewport } from 'next';

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
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
