import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#09090B',
  colorScheme: 'dark'
}

export const metadata: Metadata = {
  title: "Trade100 - Polymarket Dashboard",
  description: "An open-source trading dashboard for Polymarket prediction markets. Professional interface for prediction market analysis.",
  keywords: ["polymarket", "prediction markets", "trading", "dashboard", "crypto", "politics"],
  authors: [{ name: "Trade100" }],
  creator: "Trade100",
  publisher: "Trade100",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL(process.env.NODE_ENV === 'production' ? 'https://trade100.vercel.app' : 'http://localhost:3000'),
  openGraph: {
    type: "website",
    siteName: "Trade100",
    title: "Trade100 - Polymarket Dashboard",
    description: "Professional trading dashboard for Polymarket prediction markets",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Trade100 Logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Trade100 - Polymarket Dashboard",
    description: "Professional trading dashboard for Polymarket prediction markets",
    images: ["/android-chrome-512x512.png"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
          <QueryProvider>{children}</QueryProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
