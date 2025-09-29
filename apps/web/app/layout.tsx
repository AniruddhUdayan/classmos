import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Classmos - Educational Platform',
  description: 'AI-powered educational platform with quizzes and real-time learning',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey="pk_test_ZmluZXItc2hhcmstMjMuY2xlcmsuYWNjb3VudHMuZGV2JA">
      <html lang='en' className="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
