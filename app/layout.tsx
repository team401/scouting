import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { Toaster } from '@/components/ui/toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Team 401 Scouting',
  description: 'Offline-first match scouting and strategy for FRC teams.',
  applicationName: 'Team 401 Scouting',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '401 Scouting',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#65152f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NODE_ENV === 'development' && (
          <Script
            id="team401-dev-service-worker-cleanup"
            strategy="beforeInteractive"
          >
            {`(async()=>{try{const registrations=await navigator.serviceWorker?.getRegistrations?.()??[];const hadRegistrations=registrations.length>0;await Promise.all(registrations.map(r=>r.unregister()));const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('team401-')).map(k=>caches.delete(k)));if(hadRegistrations&&!sessionStorage.getItem('team401-dev-sw-cleaned')){sessionStorage.setItem('team401-dev-sw-cleaned','1');location.reload()}}catch{}})()`}
          </Script>
        )}
        <Toaster>{children}</Toaster>
        <ServiceWorkerRegister />
        <Script id="team401-theme" strategy="beforeInteractive">
          {`try{const saved=localStorage.getItem('team401-theme');const theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#24282b':'#65152f')}catch{}`}
        </Script>
      </body>
    </html>
  );
}
