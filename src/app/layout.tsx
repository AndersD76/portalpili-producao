import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import NotificationManager from '@/components/NotificationManager'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Portal Pili',
  description: 'Sistema de gestão de produção e qualidade - Portal Pili',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pili',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script dangerouslySetInnerHTML={{ __html: `
          if('caches' in window){caches.keys().then(function(n){n.forEach(function(c){caches.delete(c)})});}
          if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(sw){sw.update()})});}
        `}} />
      </head>
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
        <NotificationManager />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  )
}
