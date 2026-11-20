"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Conflict } from "@/api/exception";
import { listAllLianes, updateLiane } from "@/api/lianes";
import type { LianeInput } from "@/api/types";
import { memberCountLabel } from "@/components/liane/labels";
import { LianeForm } from "@/components/liane/liane-form";
import { Card, linkClass, mutedClass } from "@/components/ui";

export default function EditLianePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: lianes } = useQuery({
    queryKey: ["admin-lianes"],
    queryFn: listAllLianes,
  });
  const liane = lianes?.find((candidate) => candidate.id === id);

  const save = async (input: LianeInput) => {
    try {
      await updateLiane(id, input);
    } catch (err) {
      return err instanceof Conflict
        ? "Des membres montent ou descendent à un arrêt que vous retirez. Gardez cet arrêt, ou demandez-leur de changer leur tronçon."
        : "La liane n'a pas été enregistrée. Vérifiez le nom et les arrêts.";
    }
    await queryClient.invalidateQueries();
    router.push("/admin/lianes");
    return null;
  };

  if (!lianes) return <Card>Chargement…</Card>;
  if (!liane) {
    return (
      <Card className="flex flex-col gap-2">
        <p>Cette liane est introuvable.</p>
        <Link href="/admin/lianes" className={linkClass}>
          Retour aux lianes
        </Link>
      </Card>
    );
  }

  return (
    <>
      <p className={mutedClass}>
        {memberCountLabel(liane.member_count)} · l'adresse /l/{liane.slug} ne
        change pas quand le nom change.
        {liane.member_count > 0 &&
          " Un arrêt où un membre monte ou descend ne peut pas être retiré."}
      </p>
      <LianeForm key={liane.id} liane={liane} onSave={save} />
    </>
  );
}
