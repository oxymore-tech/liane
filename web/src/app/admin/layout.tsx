"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppContext } from "@/components/context-provider";
import { buttonClass, Card, Page } from "@/components/ui";

const TABS = [
  { href: "/admin/lianes", label: "Lianes" },
  { href: "/admin/trajets", label: "Trajets" },
  { href: "/admin/signalements", label: "Signalements" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAppContext();
  const pathname = usePathname();

  if (loading) {
    return (
      <Page title="Administration">
        <p className="text-gray-500">Chargement…</p>
      </Page>
    );
  }
  if (!user) {
    return (
      <Page title="Administration">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous avec un compte administrateur.</p>
          <Link
            href={`/connexion?retour=${encodeURIComponent(pathname)}`}
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }
  if (!user.is_admin) {
    return (
      <Page title="Administration">
        <Card>Cette page est réservée aux administrateurs.</Card>
      </Page>
    );
  }

  return (
    <Page title="Administration">
      <nav className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
            className={`rounded-full px-4 py-2 font-semibold ${
              pathname.startsWith(tab.href)
                ? "bg-emerald-700 text-white"
                : "border border-gray-300 bg-white text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </Page>
  );
}
