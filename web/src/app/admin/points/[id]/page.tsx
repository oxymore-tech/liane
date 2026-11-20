"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getAdminRallyingPoint,
  updateRallyingPoint,
} from "@/api/rallying-points";
import type { RallyingPointInput } from "@/api/types";
import { saveErrorMessage } from "@/components/rallying-point/labels";
import { PointForm } from "@/components/rallying-point/point-form";
import { Card, linkClass } from "@/components/ui";

export default function EditPointPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Pas de cache : le formulaire part toujours de l'état enregistré.
  const { data: point, isError } = useQuery({
    queryKey: ["admin-point", id],
    queryFn: () => getAdminRallyingPoint(id),
    retry: false,
    gcTime: 0,
  });

  const save = async (input: RallyingPointInput) => {
    try {
      await updateRallyingPoint(id, input);
    } catch (err) {
      return saveErrorMessage(err);
    }
    await queryClient.invalidateQueries();
    router.push("/admin/points");
    return null;
  };

  if (isError) {
    return (
      <Card className="flex flex-col gap-2">
        <p>Ce point est introuvable.</p>
        <Link href="/admin/points" className={linkClass}>
          Retour aux points
        </Link>
      </Card>
    );
  }
  if (!point) return <Card>Chargement…</Card>;

  return <PointForm key={point.id} point={point} onSave={save} />;
}
