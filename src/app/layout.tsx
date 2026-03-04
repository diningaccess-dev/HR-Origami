import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ui/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ── PWA Metadata ──────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Enso HR",
  description: "HR App für Enso / Origami / Okyu",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Enso HR",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2D6A4F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* PWA — Apple touch icon */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Tự động reload khi chunk JS bị 404 (deployment mới, cache cũ) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var _reloading = false;
                window.addEventListener('error', function(e) {
                  var el = e.target;
                  if (!_reloading && el && el.tagName === 'SCRIPT' && el.src && el.src.indexOf('/_next/static/') !== -1) {
                    _reloading = true;
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        Promise.all(keys.map(function(k) { return caches.delete(k); })).then(function() {
                          window.location.reload();
                        });
                      });
                    } else {
                      window.location.reload();
                    }
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
