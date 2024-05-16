import { DayOfTheWeekFlag } from "@liane/common";

export const extractDays = (days: DayOfTheWeekFlag | undefined) => {
  if (!days) {
    return "";
  }

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const selectedDays = dayNames.filter((_, index) => days[index] === "1");

  return selectedDays.join(", ");
};
