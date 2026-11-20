import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import type { ReactNode } from "react";
import AppProvider from "@/components/context-provider";
import { THEME_COLOR } from "./theme";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage rural et solidaire",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/web-app-manifest-192x192.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Liane",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <AppProvider>
        <body className="flex h-dvh w-full flex-col bg-pierre font-sans text-encre antialiased">
          {children}
        </body>
      </AppProvider>
    </html>
  );
}
