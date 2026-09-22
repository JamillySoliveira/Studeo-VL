import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'VL Automação - Plataforma EAD',
  description: 'Plataforma de ensino online para cursos de automação industrial, programação de CLPs, supervisórios e inversores.',
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
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
