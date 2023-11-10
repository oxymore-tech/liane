import type { Metadata } from "next";
import "./globals.css";
import React, { ReactNode } from "react";
import ContextProvider, { PageLayout } from "@/components/ContextProvider";
import { LocalizationProvider } from "@/api/intl";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage de campagne"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LocalizationProvider>
          <ContextProvider>
            <PageLayout>{children}</PageLayout>
          </ContextProvider>
        </LocalizationProvider>
      </body>
    </html>
  );
}
