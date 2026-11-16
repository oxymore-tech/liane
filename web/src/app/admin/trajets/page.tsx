"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { exportProofs, listAllTrips } from "@/api/trips";
import type {
  AdminProof,
  AdminTrip,
  ProofGesture,
  ProofOccupant,
} from "@/api/types";
import { distanceLabel } from "@/components/liane/labels";
import {
  euros,
  timeLabel,
  tripDateLabel,
  tripSection,
} from "@/components/trip/labels";
import { StateBadge } from "@/components/trip/trip-card";
import { Button, Card, Notice } from "@/components/ui";

const CLASS_MEANINGS = {
  A: "Mise en relation seule",
  B: "Trajet d'un seul occupant attesté",
  C: "Trajet des deux occupants attesté",
};

const CLASS_STYLES = {
  A: "bg-gray-200 text-gray-700",
  B: "bg-amber-100 text-amber-900",
  C: "bg-emerald-100 text-emerald-800",
};

const WARNINGS: Record<string, string> = {
  DriverStartFarFromStop: "Départ du conducteur déclaré loin de l'arrêt",
  DriverEndFarFromStop: "Arrivée du conducteur déclarée loin de l'arrêt",
  PassengerStartFarFromStop: "Montée du passager déclarée loin de l'arrêt",
  PassengerEndFarFromStop: "Descente du passager déclarée loin de l'arrêt",
  DriverTripTooShort: "Conducteur : moins d'une minute entre départ et arrivée",
  PassengerTripTooShort:
    "Passager : moins d'une minute entre montée et descente",
};

const POSITION_STATUS = {
  Granted: "position relevée",
  Denied: "position refusée",
  Unavailable: "position indisponible",
};

function gestureText(gesture: ProofGesture | null) {
  if (!gesture) return "non déclaré";
  const distance =
    gesture.distance_to_stop_meters === null
      ? ""
      : `, à ${distanceLabel(gesture.distance_to_stop_meters)} de l'arrêt`;
  return `${timeLabel(gesture.recorded_at)}, ${POSITION_STATUS[gesture.position_status]}${distance}`;
}

function OccupantLines({
  who,
  occupant,
}: {
  who: string;
  occupant: ProofOccupant;
}) {
  return (
    <li>
      <span className="font-semibold">
        {who} : {occupant.attested ? "trajet attesté" : "trajet non attesté"}
      </span>
      <span className="block">Début : {gestureText(occupant.start)}</span>
      <span className="block">Fin : {gestureText(occupant.end)}</span>
    </li>
  );
}

function Proof({ proof }: { proof: AdminProof }) {
  const detail = proof.proof_detail;
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-2">
        <span>
          <span className="font-semibold">
            {proof.passenger.pseudo ?? "Passager"}
          </span>
          <span className="block text-sm text-gray-600">
            {tripSection(proof)} · {distanceLabel(proof.distance_meters)}
            {proof.indicative_contribution_cents !== null &&
              ` · partage indicatif ${euros(proof.indicative_contribution_cents)}`}
          </span>
        </span>
        {proof.proof_class && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${CLASS_STYLES[proof.proof_class]}`}
          >
            Classe {proof.proof_class}
          </span>
        )}
      </div>
      {proof.proof_class && detail && (
        <details className="mt-1 text-sm text-gray-700">
          <summary className="cursor-pointer text-gray-600">
            {CLASS_MEANINGS[proof.proof_class]} – voir le détail
          </summary>
          <ul className="mt-1 flex flex-col gap-1 pl-3">
            <li>
              Mise en relation : inscription{" "}
              {tripDateLabel(detail.connection.booked_at).toLowerCase()}
            </li>
            <OccupantLines who="Conducteur" occupant={detail.driver} />
            <OccupantLines who="Passager" occupant={detail.passenger} />
            {detail.warnings.map((warning) => (
              <li key={warning} className="text-amber-800">
                À vérifier : {WARNINGS[warning] ?? warning}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function TripProofs({ trip }: { trip: AdminTrip }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/trajet/${trip.id}`} className="font-bold underline">
          {tripDateLabel(trip.departure_time)}
        </Link>
        <StateBadge trip={trip} />
      </div>
      <p>{tripSection(trip)}</p>
      <p className="text-sm text-gray-600">
        Liane {trip.liane.name} · conduit par{" "}
        {trip.driver.pseudo ?? "un membre"}
      </p>
      {trip.proofs.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun passager inscrit.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {trip.proofs.map((proof) => (
            <Proof key={proof.passenger.id} proof={proof} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AdminTripsPage() {
  const { data: trips } = useQuery({
    queryKey: ["admin-trips"],
    queryFn: listAllTrips,
  });
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState<number | null>(null);

  const download = async () => {
    setError(null);
    try {
      const journeys = await exportProofs();
      const file = new Blob([JSON.stringify(journeys, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = `liane-preuves-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setExported(journeys.length);
    } catch {
      setError("L'export n'a pas fonctionné.");
    }
  };

  return (
    <>
      <Card className="flex flex-col gap-2">
        <Button variant="secondary" onClick={download}>
          Exporter les preuves (JSON)
        </Button>
        <p className="text-sm text-gray-500">
          Un élément par couple conducteur/passager. « journey » est au format
          du registre de preuve de covoiturage (API v3.4) ; il est vide quand
          une information obligatoire manque, et « missing » dit laquelle. Le
          fichier contient des positions et des identifiants : ne le partagez
          pas. Rien n'est envoyé au registre.
        </p>
        {exported !== null && (
          <p className="text-sm text-emerald-700">
            {exported} élément(s) exporté(s).
          </p>
        )}
        {error && <Notice>{error}</Notice>}
      </Card>
      {trips?.length === 0 && <Card>Aucun trajet pour l'instant.</Card>}
      {trips?.map((trip) => (
        <TripProofs key={trip.id} trip={trip} />
      ))}
    </>
  );
}
