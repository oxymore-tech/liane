import { euros } from "@/components/trip/labels";

/** La part des frais d'un passager, en centimes : le tarif appliqué à la distance de son tronçon. */
export const costShareCents = (distanceMeters: number, centsPerKm: number) =>
  Math.round((distanceMeters * centsPerKm) / 1000);

export const rateLabel = (centsPerKm: number) =>
  `${euros(centsPerKm)} par kilomètre`;

/** « 2026-11 » */
export const monthOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const shiftMonth = (month: string, by: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthOf(new Date(year, monthNumber - 1 + by, 1));
};

/** « Novembre 2026 » */
export const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Date(year, monthNumber - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
};

/** « 30 novembre », pour une date sans heure (« 2026-11-30 »). */
export const dayLabel = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
};
