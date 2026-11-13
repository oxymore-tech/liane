import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import AppProvider from "@/components/context-provider";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage rural et solidaire",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Liane",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <AppProvider>
        <body className="flex flex-col bg-gray-800 h-screen w-full">
          {children}
        </body>
      </AppProvider>
    </html>
  );
}
