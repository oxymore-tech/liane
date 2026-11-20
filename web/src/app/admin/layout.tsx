"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppContext } from "@/components/context-provider";
import { buttonClass, Card, Page, Tabs } from "@/components/ui";

const TABS = [
  { href: "/admin/liane", label: "Lianes" },
  { href: "/admin/point", label: "Points" },
  { href: "/admin/trajet", label: "Trajets" },
  { href: "/admin/signalement", label: "Signalements" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAppContext();
  const pathname = usePathname();

  if (loading) {
    return (
      <Page title="Administration">
        <p className="text-gris">Chargement…</p>
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
      <Tabs tabs={TABS} isCurrent={(href) => pathname.startsWith(href)} />
      {children}
    </Page>
  );
}
