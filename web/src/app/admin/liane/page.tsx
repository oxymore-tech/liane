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
import { ConfirmDialog } from "@/components/dialog";
import { memberCountLabel, routeLabel } from "@/components/liane/labels";
import { PointName } from "@/components/rallying-point/point-name";
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
  const [toRemove, setToRemove] = useState<Liane | null>(null);
  /** L'action en cours, « activer:<id> » ou « tracer:<id> » : son bouton le montre. */
  const [busy, setBusy] = useState<string | null>(null);

  const setActive = async (liane: Liane, isActive: boolean) => {
    setError(null);
    setBusy(`activer:${liane.id}`);
    await updateLiane(liane.id, {
      name: liane.name,
      stop_ids: liane.stops.map((stop) => stop.id),
      is_active: isActive,
    }).catch(() => setError("La liane n'a pas été modifiée."));
    await refetch();
    setBusy(null);
  };

  const recompute = async (liane: Liane) => {
    setError(null);
    setBusy(`tracer:${liane.id}`);
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
    setBusy(null);
  };

  const remove = async (liane: Liane) => {
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
    setToRemove(null);
  };

  return (
    <>
      <Link href="/admin/liane/nouvelle" className={buttonClass("primary")}>
        Nouvelle liane
      </Link>
      {error && <Notice>{error}</Notice>}
      {lianes?.length === 0 && <Card>Aucune liane pour l'instant.</Card>}
      {lianes?.map((liane) => (
        <Card key={liane.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/l/${liane.slug}`}
              className="text-lg font-bold tracking-tight text-liane underline underline-offset-2 hover:decoration-2"
            >
              {liane.name}
            </Link>
            <Badge tone={liane.is_active ? "pale" : "neutral"}>
              {liane.is_active ? "Active" : "Désactivée"}
            </Badge>
          </div>
          <p className="text-sm">
            {liane.stops.map((stop, index) => (
              <span key={stop.id}>
                {index > 0 && " → "}
                <PointName inline point={stop} />
              </span>
            ))}
          </p>
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
              href={`/admin/liane/${liane.id}`}
              className={buttonClass("secondary")}
            >
              Modifier
            </Link>
            {liane.route_source === "Straight" && (
              <Button
                variant="secondary"
                loading={busy === `tracer:${liane.id}`}
                onClick={() => recompute(liane)}
              >
                Recalculer le tracé
              </Button>
            )}
            <Button
              variant="secondary"
              loading={busy === `activer:${liane.id}`}
              onClick={() => setActive(liane, !liane.is_active)}
            >
              {liane.is_active ? "Désactiver" : "Activer"}
            </Button>
            <Button variant="danger" onClick={() => setToRemove(liane)}>
              Supprimer
            </Button>
          </div>
        </Card>
      ))}
      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        onConfirm={() => (toRemove ? remove(toRemove) : undefined)}
        title={`Supprimer « ${toRemove?.name} » ?`}
        confirmLabel="Supprimer la liane"
        destructive
      >
        {toRemove && toRemove.member_count > 0 && (
          <p>
            Ses {toRemove.member_count} membre(s) en seront retirés. C'est
            définitif.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
