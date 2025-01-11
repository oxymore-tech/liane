import type { Metadata } from "next";
import "./globals.css";
import React, { ReactNode } from "react";
import ContextProvider, { PageLayout } from "@/components/ContextProvider";
import { LocalizationProvider } from "@/api/intl";
import Head from "next/head";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage de campagne"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
      </Head>
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
