import type { Metadata } from 'next';
import './styles/base.css';
import './styles/workspace.css';
import './styles/theme.css';

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
