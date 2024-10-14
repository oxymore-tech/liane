import { DayOfWeekFlag } from "@liane/common";

export const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const extractDays = (days: DayOfWeekFlag | undefined) => {
  if (!days) {
    return "";
  }

  const selectedDays = weekDays.filter((_, index) => days[index] === "1");

  return selectedDays.join(", ");
};
