import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "Polymarket Dashboard",
  description: "An open-source trading dashboard for Polymarket prediction markets.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
