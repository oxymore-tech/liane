"use client";

import Link from "next/link";
import type { Trip, Wallet } from "@/api/types";
import { distanceLabel } from "@/components/liane/labels";
import { euros } from "@/components/trip/labels";
import { linkClass } from "@/components/ui";
import { costShareCents, rateLabel } from "./labels";
import { useWallet } from "./use-wallet";

const WALLET_HREF = "/porte-monnaie";

function DriverNotice({
  wallet,
}: {
  wallet: Exclude<Wallet, { kind: "Disabled" }>;
}) {
  if (wallet.kind === "Open") {
    return (
      <>
        Partage des frais : chaque passager qui a un porte-monnaie vous devra{" "}
        {rateLabel(wallet.cents_per_km)} sur son tronçon.
      </>
    );
  }
  return (
    <>
      Pas de partage des frais dans Liane pour ce trajet : vous n'avez pas de
      porte-monnaie.{" "}
      <Link href={WALLET_HREF} className={linkClass}>
        Ouvrir un porte-monnaie
      </Link>
    </>
  );
}

function PassengerNotice({
  wallet,
  trip,
  distanceMeters,
}: {
  wallet: Exclude<Wallet, { kind: "Disabled" }>;
  trip: Trip;
  distanceMeters: number;
}) {
  if (wallet.kind === "Closed") {
    return (
      <>
        Pas de partage des frais dans Liane pour ce trajet : vous n'avez pas de
        porte-monnaie.{" "}
        <Link href={WALLET_HREF} className={linkClass}>
          Ouvrir un porte-monnaie
        </Link>
      </>
    );
  }
  if (!trip.driver_has_wallet) {
    return (
      <>
        Pas de partage des frais dans Liane pour ce trajet : le conducteur n'a
        pas de porte-monnaie.
      </>
    );
  }
  return (
    <>
      Partage des frais :{" "}
      <span className="font-semibold">
        {euros(costShareCents(distanceMeters, wallet.cents_per_km))}
      </span>{" "}
      pour {distanceLabel(distanceMeters)}, à {rateLabel(wallet.cents_per_km)}.
      À régler en fin de mois.
    </>
  );
}

/**
 * Dit, avant et après l'inscription, si les frais de ce trajet seront partagés et pour combien.
 * `distanceMeters` : le tronçon du passager. Rien n'est affiché si Liane n'a pas de tarif.
 */
export function CostShareNotice({
  trip,
  distanceMeters,
}: {
  trip: Trip;
  distanceMeters: number;
}) {
  const { data: wallet } = useWallet();
  if (!wallet || wallet.kind === "Disabled") {
    return null;
  }
  return (
    <p className="text-sm text-gris">
      {trip.my_role === "Driver" ? (
        <DriverNotice wallet={wallet} />
      ) : (
        <PassengerNotice
          wallet={wallet}
          trip={trip}
          distanceMeters={distanceMeters}
        />
      )}
    </p>
  );
}
