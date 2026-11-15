"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { listLianeTrips } from "@/api/trips";
import type { Liane, Membership } from "@/api/types";
import { Button, Card } from "@/components/ui";
import { TripCard } from "./trip-card";
import { TripForm } from "./trip-form";

/** Pour un membre : les trajets à venir de la liane et de quoi en proposer un. */
export function LianeTrips({
  liane,
  membership,
}: {
  liane: Liane;
  membership: Membership;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const { data: trips } = useQuery({
    queryKey: ["trips", "liane", liane.id],
    queryFn: () => listLianeTrips(liane.id),
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-lg font-bold">Prochains trajets</h2>
      {trips?.length === 0 && (
        <p className="px-1 text-gray-600">
          Aucun trajet prévu pour l'instant. Proposez le vôtre : les autres
          membres sont prévenus.
        </p>
      )}
      {trips?.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
      {formOpen ? (
        <Card>
          <h3 className="mb-3 text-lg font-bold">Proposer un trajet</h3>
          <TripForm
            liane={liane}
            membership={membership}
            onDone={(trip) => router.push(`/trajet/${trip.id}`)}
            onCancel={() => setFormOpen(false)}
          />
        </Card>
      ) : (
        liane.is_active && (
          <Button onClick={() => setFormOpen(true)}>Proposer un trajet</Button>
        )
      )}
    </section>
  );
}
