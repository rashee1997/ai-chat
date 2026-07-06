import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Claude Artifact Studio',
  description: 'An interactive AI Chat with real-time streaming artifacts for HTML web apps, Word docs, PowerPoint slides, and Excel sheets.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans antialiased text-slate-800 bg-slate-50">{children}</body>
    </html>
  );
}
