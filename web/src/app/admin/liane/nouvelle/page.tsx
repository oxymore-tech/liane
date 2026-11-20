"use client";

import { useRouter } from "next/navigation";
import { createLiane } from "@/api/lianes";
import type { LianeInput } from "@/api/types";
import { LianeForm } from "@/components/liane/liane-form";

export default function NewLianePage() {
  const router = useRouter();

  const create = async (input: LianeInput) => {
    try {
      await createLiane(input);
    } catch {
      return "La liane n'a pas été créée. Vérifiez le nom et les arrêts.";
    }
    router.push("/admin/liane");
    return null;
  };

  return <LianeForm onSave={create} />;
}
