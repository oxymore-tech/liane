"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mes-lianes", label: "Mes lianes" },
  { href: "/mes-trajets", label: "Mes trajets" },
];

export function MyTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
          className={`rounded-full px-4 py-2 font-semibold ${
            pathname === tab.href
              ? "bg-emerald-700 text-white"
              : "border border-gray-300 bg-white text-gray-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
