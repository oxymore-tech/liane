"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { searchAdminRallyingPoints } from "@/api/rallying-points";
import { useDebounce } from "@/components/hooks";
import { DEFAULT_VIEW } from "@/components/map/map-style";
import {
  kindLabel,
  lianeCountLabel,
  originLabel,
} from "@/components/rallying-point/labels";
import { buttonClass, Card, fieldClass, Notice } from "@/components/ui";

const PointsMap = dynamic(() => import("@/components/map/points-map"), {
  ssr: false,
});

const NEAR = { lat: DEFAULT_VIEW.latitude, lng: DEFAULT_VIEW.longitude };

const badgeClass = "rounded-full px-2 py-0.5 text-xs font-semibold";

export default function AdminPointsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const { data: points, isError } = useQuery({
    queryKey: ["admin-points", debouncedSearch],
    queryFn: () => searchAdminRallyingPoints(debouncedSearch, NEAR),
  });

  return (
    <>
      <Link href="/admin/points/nouveau" className={buttonClass("primary")}>
        Ajouter un point
      </Link>
      <label className="text-sm font-medium">
        Chercher un point
        <input
          type="search"
          className={fieldClass}
          value={search}
          placeholder="Nom du point ou de la commune"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="h-72 overflow-hidden rounded-card border border-bordure lg:h-96">
        <PointsMap
          points={points ?? []}
          onSelect={(id) => router.push(`/admin/points/${id}`)}
        />
      </div>
      {isError && <Notice>La recherche n'a pas fonctionné.</Notice>}
      {points?.length === 0 && <Card>Aucun point trouvé.</Card>}
      {points?.map((point) => (
        <Card key={point.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-bold">{point.label}</h2>
            <span
              className={`${badgeClass} shrink-0 ${
                point.is_active ? "bg-pale text-liane" : "bg-bordure text-gris"
              }`}
            >
              {point.is_active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <p className="text-sm text-gris">
            {kindLabel(point.kind)}
            {(point.zip_code || point.city) &&
              ` · ${point.zip_code} ${point.city}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {originLabel(point) && (
              <span className={`${badgeClass} bg-jaune-pale text-encre`}>
                {originLabel(point)}
              </span>
            )}
            <span className="text-sm text-gris">
              {point.lianes.length === 0
                ? "Aucune liane ne s'y arrête"
                : `Arrêt de ${lianeCountLabel(point.lianes.length)} : ${point.lianes.join(", ")}`}
            </span>
          </div>
          <Link
            href={`/admin/points/${point.id}`}
            className={`${buttonClass("secondary")} self-start`}
          >
            Modifier
          </Link>
        </Card>
      ))}
    </>
  );
}
