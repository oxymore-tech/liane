import type { Metadata } from "next";
import "./globals.css";
import React, { ReactNode } from "react";
import ContextProvider from "@/components/ContextProvider";
import { PageLayout } from "./dashboard/layout";

export const metadata: Metadata = {
  title: "Liane",
  description: "Covoiturage de campagne"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ContextProvider>
          <PageLayout>{children}</PageLayout>
        </ContextProvider>
      </body>
    </html>
  );
}
