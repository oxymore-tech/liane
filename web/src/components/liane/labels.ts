import type { Direction, Liane, Membership, RouteSource } from "@/api/types";

export const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const stopName = (stop: { city: string; label: string }) =>
  stop.city || stop.label;

export const firstStopName = (liane: Liane) => stopName(liane.stops[0]);

export const lastStopName = (liane: Liane) =>
  stopName(liane.stops[liane.stops.length - 1]);

export const memberCountLabel = (count: number) =>
  count === 0
    ? "Aucun membre pour l'instant"
    : count === 1
      ? "1 membre"
      : `${count} membres`;

export const daysLabel = (weekDays: string) =>
  DAYS.filter((_, index) => weekDays[index] === "1").join(", ");

export const directionLabel = (liane: Liane, direction: Direction) => {
  const outbound = `${firstStopName(liane)} → ${lastStopName(liane)}`;
  const back = `${lastStopName(liane)} → ${firstStopName(liane)}`;
  if (direction === "Outbound") return outbound;
  if (direction === "Return") return back;
  return "dans les deux sens";
};

/** Le tronçon d'un membre est enregistré dans le sens aller ; on l'affiche dans son sens de trajet. */
export const sectionLabel = (liane: Liane, membership: Membership) => {
  const name = (id: string) => {
    const stop = liane.stops.find((candidate) => candidate.id === id);
    return stop ? stopName(stop) : "?";
  };
  const board = name(membership.board_stop_id);
  const alight = name(membership.alight_stop_id);
  if (membership.direction === "Return") return `${alight} → ${board}`;
  if (membership.direction === "Both") return `${board} ⇄ ${alight}`;
  return `${board} → ${alight}`;
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
