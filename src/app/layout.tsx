import type { Metadata, Viewport } from 'next';
import { Amiri, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import UpdateNotificationToast from '@/components/UpdateNotificationToast';

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ['arabic'],
  variable: '--font-amiri',
});

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-manrope',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'SIPJAM',
  description: 'Sistem Informasi Manajemen Presensi & Jurnal Mengajar',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0F766E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${amiri.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans bg-[#E6ECF2] dark:bg-[#1F242D] text-[#0F172A] dark:text-[#F1F5F9] antialiased transition-colors duration-300`}>
        <ThemeProvider defaultTheme="light">
          {children}
          <UpdateNotificationToast />
        </ThemeProvider>
      </body>
    </html>
  );
}
