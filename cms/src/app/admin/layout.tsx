import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'УЛЕТАЙ — админка',
  description: 'Панель управления контентом фестиваля УЛЕТАЙ.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
