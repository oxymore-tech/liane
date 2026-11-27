"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { Statement, StatementEntry } from "@/api/types";
import { closeWallet, getStatement, openWallet } from "@/api/wallet";
import { useAppContext } from "@/components/context-provider";
import { ConfirmDialog } from "@/components/dialog";
import { distanceLabel } from "@/components/liane/labels";
import { PointRoute } from "@/components/rallying-point/point-name";
import { euros, tripDateLabel } from "@/components/trip/labels";
import {
  Button,
  buttonClass,
  Card,
  listClass,
  mutedClass,
  Notice,
  Page,
} from "@/components/ui";
import {
  dayLabel,
  monthLabel,
  monthOf,
  rateLabel,
  shiftMonth,
} from "@/components/wallet/labels";
import { useWallet, walletKey } from "@/components/wallet/use-wallet";

const useWalletRefresh = () => {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: walletKey(user?.id) });
};

function OpenWallet({ centsPerKm }: { centsPerKm: number }) {
  const refresh = useWalletRefresh();
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    setOpening(true);
    setFailed(false);
    try {
      await openWallet();
      await refresh();
    } catch {
      setFailed(true);
    }
    setOpening(false);
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Partager les frais de vos trajets</h2>
      <p>
        Avec un porte-monnaie, les frais de chaque trajet sont partagés au tarif
        de Liane, le même pour tous :{" "}
        <span className="font-semibold">{rateLabel(centsPerKm)}</span> parcouru
        par le passager.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>Passager, vous devez votre part au conducteur.</li>
        <li>Conducteur, vous recevez la part de vos passagers.</li>
        <li>
          Le partage ne se fait qu'entre deux personnes qui ont chacune un
          porte-monnaie.
        </li>
        <li>
          Un trajet compte quand le passager et le conducteur l'ont tous deux
          déclaré.
        </li>
        <li>Tout est dû une seule fois, à la fin du mois.</li>
      </ul>
      <p className={mutedClass}>
        Votre relevé n'est visible que de vous. Pour l'instant, Liane tient le
        compte de ce qui est dû : aucun paiement ne passe encore par
        l'application.
      </p>
      {failed && (
        <Notice>Le porte-monnaie n'a pas pu être ouvert. Réessayez.</Notice>
      )}
      <Button loading={opening} onClick={open}>
        Ouvrir mon porte-monnaie
      </Button>
    </Card>
  );
}

function CloseWallet() {
  const refresh = useWalletRefresh();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = async () => {
    setFailed(false);
    try {
      await closeWallet();
    } catch {
      setFailed(true);
      return;
    }
    await refresh();
    setConfirming(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Fermer mon porte-monnaie
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={close}
        title="Fermer votre porte-monnaie ?"
        confirmLabel="Fermer mon porte-monnaie"
        cancelLabel="Le garder"
        destructive
        error={failed ? "La fermeture n'a pas fonctionné. Réessayez." : null}
      >
        <p>
          Vos prochains trajets se feront sans partage des frais dans Liane.
        </p>
        <p>Ce qui figure déjà sur votre relevé reste dû.</p>
      </ConfirmDialog>
    </>
  );
}

function Total({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex-1 rounded-field bg-pale px-3 py-2">
      <p className="text-sm text-gris">{label}</p>
      <p className="text-2xl font-extrabold text-liane">{euros(cents)}</p>
    </div>
  );
}

function Entry({ entry }: { entry: StatementEntry }) {
  const counterpart = entry.counterpart.pseudo ?? "un membre";
  const owes = entry.role === "Passenger";
  return (
    <li>
      <Link
        href={`/trajet/${entry.trip_id}`}
        className="flex items-start justify-between gap-3 py-3 hover:bg-pale"
      >
        <span className="min-w-0">
          <span className="block">
            <PointRoute from={entry.from_stop} to={entry.to_stop} />
          </span>
          <span className={`${mutedClass} block`}>
            {tripDateLabel(entry.departure_time)} ·{" "}
            {owes ? `conduit par ${counterpart}` : `passager : ${counterpart}`}{" "}
            · {distanceLabel(entry.distance_meters)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-bold">{euros(entry.amount_cents)}</span>
          <span className={mutedClass}>{owes ? "à payer" : "à recevoir"}</span>
        </span>
      </Link>
    </li>
  );
}

function StatementCard({
  statement,
  isCurrentMonth,
}: {
  statement: Statement;
  isCurrentMonth: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <p className={mutedClass}>
        {isCurrentMonth
          ? `À régler en fin de mois, le ${dayLabel(statement.due_on)}.`
          : `Échéance : le ${dayLabel(statement.due_on)}.`}
      </p>
      <div className="flex gap-3">
        <Total label="Vous devez" cents={statement.owed_cents} />
        <Total label="Vous recevez" cents={statement.received_cents} />
      </div>
      {statement.entries.length === 0 ? (
        <p className={mutedClass}>
          Aucun trajet avec partage des frais ce mois-ci.
        </p>
      ) : (
        <ul className={listClass}>
          {statement.entries.map((entry) => (
            <Entry
              key={`${entry.trip_id}-${entry.counterpart.id}`}
              entry={entry}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MonthlyStatement() {
  const { user } = useAppContext();
  const currentMonth = monthOf(new Date());
  const [month, setMonth] = useState(currentMonth);
  const { data: statement, isError } = useQuery({
    queryKey: ["statement", user?.id, month],
    queryFn: () => getStatement(month),
    enabled: Boolean(user),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1">
        <Button
          variant="quiet"
          aria-label="Mois précédent"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          ← Précédent
        </Button>
        <h2 className="text-lg font-bold">{monthLabel(month)}</h2>
        <Button
          variant="quiet"
          aria-label="Mois suivant"
          disabled={month === currentMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          Suivant →
        </Button>
      </div>
      {isError && <Notice>Le relevé n'a pas pu être chargé.</Notice>}
      {statement && (
        <StatementCard
          statement={statement}
          isCurrentMonth={month === currentMonth}
        />
      )}
    </>
  );
}

export default function WalletPage() {
  const { user, loading } = useAppContext();
  const { data: wallet } = useWallet();

  if (!loading && !user) {
    return (
      <Page title="Porte-monnaie">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous pour voir votre porte-monnaie.</p>
          <Link
            href="/connexion?retour=%2Fporte-monnaie"
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }
  if (!wallet) {
    return (
      <Page title="Porte-monnaie" backHref="/profil" backLabel="Profil">
        <p className="text-gris">Chargement…</p>
      </Page>
    );
  }
  if (wallet.kind === "Disabled") {
    return (
      <Page title="Porte-monnaie" backHref="/profil" backLabel="Profil">
        <Card>Le partage des frais n'est pas proposé pour l'instant.</Card>
      </Page>
    );
  }

  return (
    <Page title="Porte-monnaie" backHref="/profil" backLabel="Profil">
      {wallet.kind === "Closed" && (
        <OpenWallet centsPerKm={wallet.cents_per_km} />
      )}
      {wallet.kind === "Open" && (
        <Notice tone="info">
          Votre porte-monnaie est ouvert. Tarif de Liane :{" "}
          {rateLabel(wallet.cents_per_km)}.
        </Notice>
      )}
      <MonthlyStatement />
      {wallet.kind === "Open" && <CloseWallet />}
    </Page>
  );
}
