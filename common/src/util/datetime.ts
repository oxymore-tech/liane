import { DayOfTheWeekFlag, UTCDateTime } from "../api";

export type TimeInSeconds = number;
export const toTimeInSeconds = (datetime: Date) => {
  return (datetime.getHours() * 60 + datetime.getMinutes()) * 60 + datetime.getSeconds();
};

export const createDatetimeCursor = (datetime: Date, id?: string) => {
  return datetime.toString() + id ? "_" + id : "";
};

export const formatDuration = (duration: TimeInSeconds) => {
  if (duration < 60) {
    return "1 min";
  }
  return duration >= 3600
    ? Math.floor(duration / 3600) +
        "h" +
        Math.floor((duration % 3600) / 60)
          .toString()
          .padStart(2, "0")
    : Math.floor(duration / 60).toString() + " min";
};

export const addSeconds = (date: Date, seconds: number) => {
  return new Date(date.getTime() + seconds * 1000);
};

export const extractDatePart = (isoDatetime: UTCDateTime) => {
  return isoDatetime.slice(0, isoDatetime.indexOf("T"));
};

export const withOffsetHours = (offset: number, date?: Date | undefined) => {
  return new Date((date?.valueOf() ?? new Date().valueOf()) + offset * (3600 * 1000));
};

export const isToday = (date: Date) => {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && date.getDate() === now.getDate();
};

export const sleep = (timeInMillis: number) => new Promise<void>(resolve => setTimeout(() => resolve(), timeInMillis));

export const getFirstFutureDate = (date: Date, recurrence: DayOfTheWeekFlag) => {
  const currentDay = (date.getUTCDay() + 6) % 7;
  const comingDays = recurrence.substring(currentDay) + recurrence.substring(0, currentDay);
  const dDay = comingDays.indexOf("1");
  if (dDay < 0) {
    return null;
  }
  return addSeconds(date, 3600 * 24 * dDay);
};
