import { DayOfWeekFlag } from "@liane/common";

export const extractDays = (days: DayOfWeekFlag | undefined) => {
  if (!days) {
    return "";
  }

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const selectedDays = dayNames.filter((_, index) => days[index] === "1");

  return selectedDays.join(", ");
};
