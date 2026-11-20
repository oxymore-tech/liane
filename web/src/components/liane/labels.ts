import type { Liane, Membership, RouteSource } from "@/api/types";

export const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const memberCountLabel = (count: number) =>
  count === 0
    ? "Aucun membre pour l'instant"
    : count === 1
      ? "1 membre"
      : `${count} membres`;

export const daysLabel = (weekDays: string) =>
  DAYS.filter((_, index) => weekDays[index] === "1").join(", ");

const UNKNOWN_STOP = { label: "?", city: "" };

/** Le tronçon d'un membre est enregistré dans le sens aller ; on le donne dans son sens de trajet. */
export const memberSection = (liane: Liane, membership: Membership) => {
  const stop = (id: string) =>
    liane.stops.find((candidate) => candidate.id === id) ?? UNKNOWN_STOP;
  const board = stop(membership.board_stop_id);
  const alight = stop(membership.alight_stop_id);
  if (membership.direction === "Return") {
    return { from: alight, to: board, bothWays: false };
  }
  return { from: board, to: alight, bothWays: membership.direction === "Both" };
};

export const distanceLabel = (meters: number) => {
  const kilometers = meters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
  }
  return `${Math.round(kilometers)} km`;
};

/** Arrondie aux 5 minutes au-delà de 20 minutes : la durée est indicative. */
export const durationLabel = (seconds: number) => {
  const exact = Math.max(1, Math.round(seconds / 60));
  const minutes = exact > 20 ? Math.round(exact / 5) * 5 : exact;
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest ? ` ${String(rest).padStart(2, "0")}` : ""}`;
};

/** « 36 km · environ 35 min en voiture », ou la distance à vol d'oiseau faute de tracé routier. */
export const routeLabel = (route: {
  route_source: RouteSource;
  distance_meters: number;
  duration_seconds: number | null;
}) => {
  if (route.route_source === "Straight") {
    return `Environ ${distanceLabel(route.distance_meters)} à vol d'oiseau`;
  }
  const distance = distanceLabel(route.distance_meters);
  return route.duration_seconds === null
    ? distance
    : `${distance} · environ ${durationLabel(route.duration_seconds)} en voiture`;
};

/** Distance entre deux arrêts d'une liane, dans un sens ou dans l'autre. */
export const sectionDistance = (liane: Liane, fromId: string, toId: string) => {
  const distanceOf = (id: string) =>
    liane.stop_distances[liane.stops.findIndex((stop) => stop.id === id)];
  const from = distanceOf(fromId);
  const to = distanceOf(toId);
  return from === undefined || to === undefined ? null : Math.abs(to - from);
};
