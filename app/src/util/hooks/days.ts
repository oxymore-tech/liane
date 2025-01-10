import { DayOfWeekFlag, TimeOnly, TimeRange } from "@liane/common";

export const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const extractDays = (days: DayOfWeekFlag | undefined) => {
  if (!days) {
    return "";
  }

  const selectedDays = weekDays.filter((_, index) => days[index] === "1");

  return selectedDays.join(", ");
};

export const extractTime = (time: TimeRange | undefined) => {
  if (!time) {
    return "";
  }

  return `${formatTime(time.start)} ➔ ${formatTime(time.end)}`;
};

const formatTime = (time: TimeOnly): string => {
  const hour = time.hour.toString();
  const minute = (time.minute ?? 0).toString().padStart(2, "0");
  return `${hour}h${minute}`;
};
