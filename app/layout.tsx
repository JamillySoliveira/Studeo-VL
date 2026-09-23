import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'VL Automação - Plataforma EAD',
  description: 'Plataforma de ensino online para cursos de automação industrial, programação de CLPs, supervisórios e inversores.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'VL Automação - Plataforma EAD',
    description: 'Plataforma de ensino online para cursos de automação industrial, programação de CLPs, supervisórios e inversores.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VL Automação - Plataforma EAD',
    description: 'Plataforma de ensino online para cursos de automação industrial, programação de CLPs, supervisórios e inversores.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
