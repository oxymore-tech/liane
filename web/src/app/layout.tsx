import type { Metadata } from "next";
import "./globals.css";
import React, { ReactNode } from "react";
import ContextProvider, { PageLayout } from "@/components/ContextProvider";
import { LocalizationProvider } from "@/api/intl";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage de campagne",
  icons: [{ rel: "favicon", url: "/admin/favicon.png" }],
  other: {
    preconnect: ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    stylesheet: ["https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"]
  }
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
