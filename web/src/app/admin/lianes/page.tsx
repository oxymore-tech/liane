"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Conflict } from "@/api/exception";
import {
  deleteLiane,
  listAllLianes,
  recomputeRoute,
  updateLiane,
} from "@/api/lianes";
import type { Liane } from "@/api/types";
import {
  memberCountLabel,
  routeLabel,
  stopName,
} from "@/components/liane/labels";
import {
  Badge,
  Button,
  buttonClass,
  Card,
  mutedClass,
  Notice,
} from "@/components/ui";

export default function AdminLianesPage() {
  const { data: lianes, refetch } = useQuery({
    queryKey: ["admin-lianes"],
    queryFn: listAllLianes,
  });
  const [error, setError] = useState<string | null>(null);

  const setActive = async (liane: Liane, isActive: boolean) => {
    setError(null);
    await updateLiane(liane.id, {
      name: liane.name,
      stop_ids: liane.stops.map((stop) => stop.id),
      is_active: isActive,
    });
    await refetch();
  };

  const recompute = async (liane: Liane) => {
    setError(null);
    try {
      const recomputed = await recomputeRoute(liane.id);
      if (recomputed.route_source === "Straight") {
        setError(
          `Le tracé de « ${liane.name} » n'a pas pu être calculé par la route : il reste en ligne droite.`,
        );
      }
    } catch {
      setError("Le recalcul du tracé n'a pas fonctionné.");
    }
    await refetch();
  };

  const remove = async (liane: Liane) => {
    const warning =
      liane.member_count > 0
        ? `Supprimer « ${liane.name} » et retirer ses ${liane.member_count} membre(s) ?`
        : `Supprimer « ${liane.name} » ?`;
    if (!window.confirm(warning)) return;
    setError(null);
    try {
      await deleteLiane(liane.id);
    } catch (err) {
      setError(
        err instanceof Conflict
          ? "Cette liane a déjà des trajets : désactivez-la plutôt que de la supprimer."
          : "La suppression n'a pas fonctionné.",
      );
    }
    await refetch();
  };

  return (
    <>
      <Link href="/admin/lianes/nouvelle" className={buttonClass("primary")}>
        Nouvelle liane
      </Link>
      {error && <Notice>{error}</Notice>}
      {lianes?.length === 0 && <Card>Aucune liane pour l'instant.</Card>}
      {lianes?.map((liane) => (
        <Card key={liane.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/l/${liane.slug}`}
              className="text-lg font-bold tracking-tight text-liane underline"
            >
              {liane.name}
            </Link>
            <Badge tone={liane.is_active ? "pale" : "neutral"}>
              {liane.is_active ? "Active" : "Désactivée"}
            </Badge>
          </div>
          <p className="text-sm">{liane.stops.map(stopName).join(" → ")}</p>
          <p className={mutedClass}>
            {memberCountLabel(liane.member_count)} · /l/{liane.slug}
          </p>
          <p className={mutedClass}>{routeLabel(liane)}</p>
          {liane.route_source === "Straight" && (
            <Notice tone="warning">
              Tracé approximatif : ligne droite entre les arrêts.
            </Notice>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/lianes/${liane.id}`}
              className={buttonClass("secondary")}
            >
              Modifier
            </Link>
            {liane.route_source === "Straight" && (
              <Button variant="secondary" onClick={() => recompute(liane)}>
                Recalculer le tracé
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setActive(liane, !liane.is_active)}
            >
              {liane.is_active ? "Désactiver" : "Activer"}
            </Button>
            <Button variant="danger" onClick={() => remove(liane)}>
              Supprimer
            </Button>
          </div>
        </Card>
      ))}
    </>
  );
}
