"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createRallyingPoint } from "@/api/rallying-points";
import type { RallyingPointInput } from "@/api/types";
import { saveErrorMessage } from "@/components/rallying-point/labels";
import { PointForm } from "@/components/rallying-point/point-form";

export default function NewPointPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const create = async (input: RallyingPointInput) => {
    try {
      await createRallyingPoint(input);
    } catch (err) {
      return saveErrorMessage(err);
    }
    await queryClient.invalidateQueries();
    router.push("/admin/point");
    return null;
  };

  return <PointForm onSave={create} />;
}
