"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getLiane } from "@/api/lianes";
import { followMessages } from "@/api/messages";
import {
  bookTrip,
  cancelTrip,
  getTrip,
  recordGesture,
  unbookTrip,
} from "@/api/trips";
import type {
  GestureKind,
  LianeDetail,
  TripDetail,
  TripPassenger,
} from "@/api/types";
import { LianeSymbol } from "@/components/brand";
import { useAppContext } from "@/components/context-provider";
import { distanceLabel, stopName } from "@/components/liane/labels";
import {
  attestationLabel,
  euros,
  gestureDoneLabel,
  gestureLabel,
  refusalMessage,
  seatsLabel,
  timeLabel,
  tripDateLabel,
  tripSection,
} from "@/components/trip/labels";
import { askPosition } from "@/components/trip/position";
import { StateBadge } from "@/components/trip/trip-card";
import {
  Button,
  buttonClass,
  Card,
  fieldClass,
  labelClass,
  linkClass,
  listClass,
  mutedClass,
  Notice,
  Page,
} from "@/components/ui";
import { cn } from "@/components/utils";

const REFRESH_INTERVAL_MS = 30_000;

const ATTESTATION_DETAILS = {
  Full: "Le départ et l'arrivée ont été confirmés par le conducteur et par le passager, chacun sur son téléphone, avec la position.",
  Partial:
    "Il manque une confirmation ou une position, pour le conducteur ou pour le passager.",
  None: "Le départ et l'arrivée n'ont pas été confirmés avec la position.",
};

function Summary({ trip }: { trip: TripDetail }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-2xl font-extrabold">{tripSection(trip)}</h2>
        <StateBadge trip={trip} />
      </div>
      <p className="text-lg">{tripDateLabel(trip.departure_time)}</p>
      <p className="text-gris">
        {trip.my_role === "Driver"
          ? "Vous conduisez"
          : `Conduit par ${trip.driver.pseudo ?? "un membre"}`}
        {" · "}
        {distanceLabel(trip.distance_meters)}
      </p>
      <p className={mutedClass}>
        Liane{" "}
        <Link href={`/l/${trip.liane.slug}`} className={linkClass}>
          {trip.liane.name}
        </Link>
        {trip.is_open && trip.state === "Planned" && ` · ${seatsLabel(trip)}`}
      </p>
      {trip.state === "Canceled" && (
        <p className="mt-2 rounded-field border border-rouge bg-white px-3 py-2 text-rouge">
          Ce trajet a été annulé par son conducteur.
        </p>
      )}
    </Card>
  );
}

function Gestures({
  trip,
  onDeclare,
  busy,
}: {
  trip: TripDetail;
  onDeclare: (kind: GestureKind) => void;
  busy: boolean;
}) {
  const role = trip.my_role;
  if (!role || trip.state === "Canceled") return null;

  const hasStarted = trip.my_gestures.some(
    (gesture) => gesture.kind === "Start",
  );
  const isTooEarly =
    !hasStarted &&
    trip.is_open &&
    Date.now() < new Date(trip.gesture_window.start_opens_at).getTime();
  if (!trip.next_gesture && trip.my_gestures.length === 0 && !isTooEarly) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-3">
      {trip.my_gestures.map((gesture) => (
        <p key={gesture.kind} className="flex items-start gap-2">
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pale text-sm font-bold text-liane"
          >
            ✓
          </span>
          <span>
            <span className="font-semibold">
              {gestureDoneLabel(role, gesture.kind)} à{" "}
              {timeLabel(gesture.recorded_at)}
            </span>
            <span className={cn(mutedClass, "block")}>
              {gesture.position_status === "Granted"
                ? "Position enregistrée."
                : "Enregistré sans position."}
            </span>
          </span>
        </p>
      ))}

      {trip.next_gesture && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => trip.next_gesture && onDeclare(trip.next_gesture)}
            className={cn(
              buttonClass("key"),
              "min-h-20 w-full gap-3 text-2xl font-extrabold tracking-tight",
            )}
          >
            {busy ? "Un instant…" : gestureLabel(role, trip.next_gesture)}
            <LianeSymbol className="h-6" />
          </button>
          <Notice tone="info">
            Au moment où vous touchez ce bouton, nous relevons l'heure et, si
            vous l'acceptez, votre position, une seule fois : c'est ce qui
            atteste que le trajet a eu lieu. Vous n'êtes jamais suivi pendant le
            trajet.
          </Notice>
        </>
      )}

      {isTooEarly && (
        <p>
          Le bouton « {gestureLabel(role, "Start")} » apparaîtra ici à partir de{" "}
          {timeLabel(trip.gesture_window.start_opens_at)}, une demi-heure avant
          le départ.
        </p>
      )}
    </Card>
  );
}

function passengerStatus(passenger: TripPassenger) {
  if (passenger.ended_at) return `descente à ${timeLabel(passenger.ended_at)}`;
  if (passenger.started_at)
    return `montée à ${timeLabel(passenger.started_at)}`;
  return null;
}

function driverStatus(trip: TripDetail) {
  if (trip.driver_ended_at)
    return `arrivée à ${timeLabel(trip.driver_ended_at)}`;
  if (trip.driver_started_at) {
    return `départ à ${timeLabel(trip.driver_started_at)}`;
  }
  return null;
}

function Participants({
  trip,
  currentUserId,
}: {
  trip: TripDetail;
  currentUserId: string;
}) {
  const driver = driverStatus(trip);
  return (
    <Card>
      <h2 className="mb-1 font-bold">Qui fait ce trajet</h2>
      <ul className={listClass}>
        <li className="py-2">
          <span className="font-semibold">
            {trip.driver.pseudo ?? "Un membre"}
            {trip.driver.id === currentUserId && " (vous)"}
          </span>
          <span className={cn(mutedClass, "block")}>
            Conduit · {tripSection(trip)}
            {driver && ` · ${driver}`}
          </span>
        </li>
        {trip.passengers.map((passenger) => {
          const status = passengerStatus(passenger);
          return (
            <li key={passenger.user.id} className="py-2">
              <span className="font-semibold">
                {passenger.user.pseudo ?? "Un membre"}
                {passenger.user.id === currentUserId && " (vous)"}
              </span>
              <span className={cn(mutedClass, "block")}>
                Passager · {tripSection(passenger)}
                {status && ` · ${status}`}
              </span>
            </li>
          );
        })}
      </ul>
      {trip.passengers.length === 0 && (
        <p className={mutedClass}>Aucun passager inscrit pour l'instant.</p>
      )}
    </Card>
  );
}

function BookingForm({
  trip,
  liane,
  onBook,
}: {
  trip: TripDetail;
  liane: LianeDetail;
  onBook: (fromId: string, toId: string) => Promise<void>;
}) {
  const ordered =
    trip.direction === "Outbound" ? liane.stops : [...liane.stops].reverse();
  const indexOf = (id: string | undefined) =>
    ordered.findIndex((stop) => stop.id === id);
  const first = indexOf(trip.from_stop.id);
  const last = indexOf(trip.to_stop.id);
  const covered = ordered.slice(first, last + 1);

  const usual = liane.membership;
  const usualFrom = indexOf(
    trip.direction === "Outbound"
      ? usual?.board_stop_id
      : usual?.alight_stop_id,
  );
  const usualTo = indexOf(
    trip.direction === "Outbound"
      ? usual?.alight_stop_id
      : usual?.board_stop_id,
  );
  const defaultFrom = Math.min(Math.max(usualFrom, first), last - 1);
  const defaultTo = Math.min(Math.max(usualTo, defaultFrom + 1), last);

  const [fromId, setFromId] = useState(ordered[defaultFrom]?.id ?? "");
  const [toId, setToId] = useState(ordered[defaultTo]?.id ?? "");
  const [sending, setSending] = useState(false);
  const isValid = indexOf(fromId) < indexOf(toId);

  const submit = async () => {
    setSending(true);
    await onBook(fromId, toId);
    setSending(false);
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-bold">Prendre une place sur ce trajet</h2>
      <label className={labelClass}>
        Je monte à
        <select
          className={fieldClass}
          value={fromId}
          onChange={(event) => setFromId(event.target.value)}
        >
          {covered.slice(0, -1).map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stopName(stop)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Je descends à
        <select
          className={fieldClass}
          value={toId}
          onChange={(event) => setToId(event.target.value)}
        >
          {covered.slice(1).map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stopName(stop)}
            </option>
          ))}
        </select>
      </label>
      {!isValid && (
        <Notice>La descente doit se trouver après la montée.</Notice>
      )}
      <Button disabled={sending || !isValid} onClick={submit}>
        M'inscrire à ce trajet
      </Button>
      <p className={mutedClass}>
        Votre place est réservée tout de suite, le conducteur est prévenu.
      </p>
    </Card>
  );
}

function Outcome({ trip }: { trip: TripDetail }) {
  if (trip.is_open || trip.state === "Canceled" || !trip.my_role) return null;
  const mine = trip.passengers.filter(
    (passenger) => passenger.attestation !== null,
  );
  if (mine.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-bold">Après le trajet</h2>
      {mine.map((passenger) => {
        const attestation = passenger.attestation ?? "None";
        return (
          <div key={passenger.user.id}>
            <p
              className={cn(
                "font-semibold",
                attestation === "Full"
                  ? "text-liane"
                  : "rounded-field border-l-4 border-jaune bg-jaune-pale px-3 py-1",
              )}
            >
              {attestation === "Full" && "✓ "}
              {attestationLabel(attestation)}
              {trip.my_role === "Driver" &&
                ` avec ${passenger.user.pseudo ?? "un passager"}`}
            </p>
            <p className={mutedClass}>{ATTESTATION_DETAILS[attestation]}</p>
            {passenger.indicative_contribution_cents !== null && (
              <p className="mt-1 text-sm text-gris">
                Partage des frais indicatif pour{" "}
                {distanceLabel(passenger.distance_meters)} :{" "}
                <span className="font-semibold">
                  {euros(passenger.indicative_contribution_cents)}
                </span>
              </p>
            )}
          </div>
        );
      })}
      <p className="text-xs text-gris">
        Le partage des frais est donné à titre indicatif : rien n'est payé dans
        l'application, arrangez-vous entre vous.
      </p>
    </Card>
  );
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: userLoading } = useAppContext();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripKey = ["trip", id, user?.id ?? null];
  const {
    data: trip,
    isError,
    refetch,
  } = useQuery({
    queryKey: tripKey,
    queryFn: () => getTrip(id),
    enabled: Boolean(user),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const lianeId = trip?.liane.id;
  const slug = trip?.liane.slug;
  const { data: liane } = useQuery({
    queryKey: ["liane", slug, user?.id ?? null],
    queryFn: () => getLiane(slug ?? ""),
    enabled: Boolean(slug),
  });

  useEffect(() => {
    if (!lianeId) return;
    return followMessages(
      lianeId,
      (message) => {
        if (message.data?.trip_id === id) refetch();
      },
      () => refetch(),
    );
  }, [lianeId, id, refetch]);

  const run = async (action: () => Promise<TripDetail | unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(refusalMessage(err));
    }
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ["trips"] });
    setBusy(false);
  };

  const declare = (kind: GestureKind) =>
    run(async () => recordGesture(id, { kind, ...(await askPosition()) }));

  const book = (fromId: string, toId: string) =>
    run(() => bookTrip(id, fromId, toId));

  const unbook = () => {
    if (window.confirm("Vous désinscrire de ce trajet ?")) {
      run(() => unbookTrip(id));
    }
  };

  const cancel = () => {
    if (
      window.confirm(
        "Annuler ce trajet ? Les passagers inscrits sont prévenus.",
      )
    ) {
      run(() => cancelTrip(id));
    }
  };

  if (!userLoading && !user) {
    return (
      <Page title="Trajet">
        <Card className="flex flex-col gap-3">
          <p>Connectez-vous pour voir ce trajet.</p>
          <Link
            href={`/connexion?retour=${encodeURIComponent(`/trajet/${id}`)}`}
            className={buttonClass("primary")}
          >
            Se connecter
          </Link>
        </Card>
      </Page>
    );
  }
  if (isError) {
    return (
      <Page title="Trajet" backHref="/mes-trajets" backLabel="Mes trajets">
        <Card>
          Ce trajet n'existe pas, ou il n'est visible que des membres de sa
          liane.
        </Card>
      </Page>
    );
  }
  if (!trip || !user) {
    return (
      <Page title="Trajet">
        <p className="text-gris">Chargement…</p>
      </Page>
    );
  }

  const canBook =
    !trip.my_role &&
    trip.is_open &&
    trip.state === "Planned" &&
    trip.seats_left > 0 &&
    Boolean(liane?.membership);
  const myBooking = trip.passengers.find(
    (passenger) => passenger.user.id === user.id,
  );
  const canUnbook =
    trip.my_role === "Passenger" && trip.is_open && !myBooking?.started_at;
  const canCancel =
    trip.my_role === "Driver" && trip.is_open && trip.state === "Planned";

  return (
    <Page title="Trajet" backHref={`/l/${trip.liane.slug}`} backLabel="Liane">
      <Summary trip={trip} />
      {error && <Notice>{error}</Notice>}
      <Gestures trip={trip} onDeclare={declare} busy={busy} />
      <Outcome trip={trip} />
      {canBook && liane && (
        <BookingForm trip={trip} liane={liane} onBook={book} />
      )}
      {!trip.my_role &&
        trip.is_open &&
        trip.state === "Planned" &&
        trip.seats_left === 0 && <Card>Ce trajet est complet.</Card>}
      <Participants trip={trip} currentUserId={user.id} />
      {trip.is_open && myBooking?.indicative_contribution_cents != null && (
        <p className="px-1 text-sm text-gris">
          Partage des frais indicatif pour votre trajet (
          {distanceLabel(myBooking.distance_meters)}) :{" "}
          <span className="font-semibold">
            {euros(myBooking.indicative_contribution_cents)}
          </span>
          . Rien n'est payé dans l'application.
        </p>
      )}
      {canUnbook && (
        <Button variant="danger" disabled={busy} onClick={unbook}>
          Me désinscrire
        </Button>
      )}
      {canCancel && (
        <Button variant="danger" disabled={busy} onClick={cancel}>
          Annuler ce trajet
        </Button>
      )}
    </Page>
  );
}
