import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ThePortal',
  description:
    'Put it here. Get it there. Easily transfer files between your phone and PC.',
  icons: { icon: '/favicon.svg' },
  appleWebApp: {
    capable: true,
    title: 'ThePortal',
    statusBarStyle: 'black-translucent',
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
