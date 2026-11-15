import type { Direction, Liane, Membership } from "@/api/types";

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
