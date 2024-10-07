import { DayOfWeekFlag } from "@liane/common";

export const extractDays = (days: DayOfWeekFlag | undefined) => {
  if (!days) {
    return "";
  }

  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const selectedDays = dayNames.filter((_, index) => days[index] === "1");

  return selectedDays.join(", ");
};
