"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const TABS = [
  { href: "/mes-lianes", label: "Mes lianes" },
  { href: "/mes-trajets", label: "Mes trajets" },
  { href: "/profil", label: "Profil" },
];

export function MyTabs() {
  const pathname = usePathname();
  return <Tabs tabs={TABS} isCurrent={(href) => pathname === href} />;
}
