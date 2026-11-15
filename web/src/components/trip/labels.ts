import { Conflict } from "@/api/exception";
import type {
  Attestation,
  GestureKind,
  Trip,
  TripRole,
  TripState,
} from "@/api/types";
import { stopName } from "@/components/liane/labels";

export const tripSection = (trip: {
  from_stop: { city: string; label: string };
  to_stop: { city: string; label: string };
}) => `${stopName(trip.from_stop)} → ${stopName(trip.to_stop)}`;

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** « Aujourd'hui à 07:30 », « Demain à 07:30 », sinon « lundi 16 novembre à 07:30 ». */
export const tripDateLabel = (iso: string) => {
  const date = new Date(iso);
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 864e5);
  const time = timeLabel(iso);
  if (days === 0) return `Aujourd'hui à ${time}`;
  if (days === 1) return `Demain à ${time}`;
  if (days === -1) return `Hier à ${time}`;
  const day = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${time}`;
};

export const seatsLabel = (trip: Trip) => {
  if (trip.seats_left === 0) return "Complet";
  return trip.seats_left === 1
    ? "1 place libre"
    : `${trip.seats_left} places libres`;
};

/** Un trajet prévu dont l'heure est passée depuis longtemps n'a simplement pas eu lieu. */
export const stateLabel = (trip: { state: TripState; is_open: boolean }) => {
  if (trip.state === "Canceled") return "Annulé";
  if (trip.state === "Finished") return "Terminé";
  if (trip.state === "Started") return trip.is_open ? "En route" : "Terminé";
  return trip.is_open ? "Prévu" : "N'a pas eu lieu";
};

export const gestureLabel = (role: TripRole, kind: GestureKind) => {
  if (role === "Driver") {
    return kind === "Start" ? "Je suis parti" : "Je suis arrivé";
  }
  return kind === "Start" ? "Je suis monté" : "Je suis descendu";
};

export const gestureDoneLabel = (role: TripRole, kind: GestureKind) => {
  if (role === "Driver") {
    return kind === "Start" ? "Départ déclaré" : "Arrivée déclarée";
  }
  return kind === "Start" ? "Montée déclarée" : "Descente déclarée";
};

export const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const attestationLabel = (attestation: Attestation) => {
  if (attestation === "Full") return "Trajet attesté";
  if (attestation === "Partial") return "Trajet attesté en partie";
  return "Trajet non attesté";
};

const REFUSALS: Record<string, string> = {
  TripCanceled: "Ce trajet a été annulé.",
  TripAlreadyStarted:
    "Ce trajet a déjà commencé : il ne peut plus être annulé.",
  TripClosed: "Ce trajet n'accepte plus d'inscription.",
  TripFull: "Ce trajet est complet.",
  AlreadyBooked: "Vous êtes déjà inscrit à ce trajet.",
  DriverCannotBook: "Vous conduisez ce trajet.",
  AlreadyOnBoard:
    "Vous avez déjà indiqué être monté : vous ne pouvez plus vous désinscrire.",
  TooEarly:
    "C'est trop tôt : revenez dans la demi-heure qui précède le départ.",
  TooLate: "C'est trop tard pour ce trajet.",
  AlreadyDone: "C'est déjà enregistré.",
  StartFirst: "Indiquez d'abord le début de votre trajet.",
};

/** Le serveur explique un refus par un mot-clé ; on en fait une phrase. */
export const refusalMessage = (err: unknown) =>
  (err instanceof Conflict && REFUSALS[err.message]) ||
  "Cela n'a pas fonctionné. Réessayez.";
