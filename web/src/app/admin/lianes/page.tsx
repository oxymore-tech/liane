"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Conflict } from "@/api/exception";
import { deleteLiane, listAllLianes, updateLiane } from "@/api/lianes";
import type { Liane } from "@/api/types";
import { memberCountLabel, stopName } from "@/components/liane/labels";
import { Button, buttonClass, Card, Notice } from "@/components/ui";

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
              className="text-lg font-bold underline"
            >
              {liane.name}
            </Link>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                liane.is_active
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {liane.is_active ? "Active" : "Désactivée"}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {liane.stops.map(stopName).join(" → ")}
          </p>
          <p className="text-sm text-gray-500">
            {memberCountLabel(liane.member_count)} · /l/{liane.slug}
          </p>
          <div className="flex gap-2">
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
