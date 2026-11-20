"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listMyTrips } from "@/api/trips";
import { useAppContext } from "@/components/context-provider";
import { MyTabs } from "@/components/my-tabs";
import { NotificationSettings } from "@/components/notifications";
import { TripCard } from "@/components/trip/trip-card";
import {
  buttonClass,
  Card,
  MascotNote,
  Page,
  sectionTitleClass,
} from "@/components/ui";

export default function MyTripsPage() {
  const { user, loading } = useAppContext();
  const { data: trips } = useQuery({
    queryKey: ["trips", "mine", user?.id],
    queryFn: listMyTrips,
    enabled: Boolean(user),
  });

  if (!loading && !user) {
    return (
      <Page title="Mes trajets">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous pour retrouver vos trajets.</p>
          <Link
            href="/connexion?retour=%2Fmes-trajets"
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Mes trajets">
      <MyTabs />
      <h2 className={sectionTitleClass}>À venir</h2>
      {trips?.upcoming.length === 0 && (
        <MascotNote>
          <p>
            Aucun trajet à venir. Ouvrez une de vos lianes pour proposer un
            trajet ou vous inscrire à celui d'un autre membre.
          </p>
          <Link href="/mes-lianes" className={buttonClass("primary")}>
            Voir mes lianes
          </Link>
        </MascotNote>
      )}
      {trips?.upcoming.map((trip) => (
        <TripCard key={trip.id} trip={trip} showLiane />
      ))}
      {trips && trips.past.length > 0 && (
        <>
          <h2 className={sectionTitleClass}>Passés</h2>
          {trips.past.map((trip) => (
            <TripCard key={trip.id} trip={trip} showLiane />
          ))}
        </>
      )}
      {user && <NotificationSettings />}
    </Page>
  );
}
