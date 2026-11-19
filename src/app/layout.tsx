import type { Metadata, Viewport } from 'next';
import { Archivo, Geist, Geist_Mono } from 'next/font/google';
import { site } from '@/content/site';
import { SmoothScroll } from '@/components/providers/SmoothScroll';
import { PageTransitionProvider } from '@/components/providers/PageTransition';
import { Header } from '@/components/layout/Header';
import { personJsonLd } from '@/lib/seo';
import './globals.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });
// Wide display face for the name and logo: Archivo's width axis at 125% is the closest
// free match to Acumin Pro Wide, the (Adobe-licensed) wide face alche.studio uses.
const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.seo.title, template: `%s · ${site.name}` },
  description: site.seo.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.seo.title,
    description: site.seo.description,
    url: '/',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: site.seo.title, description: site.seo.description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  colorScheme: 'dark',
};

/**
 * Runs before first paint. Shows the intro only to first-time visitors with motion
 * allowed, and lets any click/key skip it. Everything else on the page is already
 * server-rendered underneath, so the loader never blocks content.
 */
const introScript = `try{var d=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!localStorage.getItem('intro-seen')&&location.pathname==='/'){d.setAttribute('data-intro','');localStorage.setItem('intro-seen','1');var s=function(){if(d.hasAttribute('data-intro'))d.setAttribute('data-intro','skip')};addEventListener('pointerdown',s,{once:true});addEventListener('keydown',s,{once:true});setTimeout(function(){d.removeAttribute('data-intro')},2600)}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${archivo.variable} dark antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-fg focus:px-5 focus:py-3 focus:text-bg"
        >
          Skip to content
        </a>
        <div className="loader" aria-hidden="true">
          <div>
            <div className="loader-name">{site.name}</div>
            <div className="loader-bar" />
          </div>
        </div>
        <SmoothScroll />
        <PageTransitionProvider>
          <Header />
          {children}
        </PageTransitionProvider>
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
