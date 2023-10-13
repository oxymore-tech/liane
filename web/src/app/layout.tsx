import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import ContextProvider from "@/components/context-provider";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage de campagne"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ContextProvider>{children}</ContextProvider>
      </body>
    </html>
  );
}
