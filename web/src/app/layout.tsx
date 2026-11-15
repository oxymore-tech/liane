import type { Metadata, Viewport } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import AppProvider from "@/components/context-provider";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage rural et solidaire",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/web-app-manifest-192x192.png",
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
  themeColor: "#10b981",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <AppProvider>
        <body className="flex h-dvh w-full flex-col bg-gray-800">
          {children}
        </body>
      </AppProvider>
    </html>
  );
}
