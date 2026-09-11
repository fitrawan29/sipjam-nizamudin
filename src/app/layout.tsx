import type { Metadata } from 'next';
import { Amiri, Poppins, Space_Mono } from 'next/font/google';
import './globals.css';

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ['arabic'],
  variable: '--font-amiri',
});

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: 'SIPJAM SMA NIZAMUDIN',
  description: 'Sistem Informasi Manajemen Presensi & Jurnal Mengajar',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${amiri.variable} ${poppins.variable} ${spaceMono.variable} font-sans bg-gray-100 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300`}>
        {children}
      </body>
    </html>
  );
}
