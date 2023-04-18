import { UTCDateTime } from "@/api";
export type TimeInSeconds = number;
export const toTimeInSeconds = (datetime: Date) => {
  return (datetime.getUTCHours() * 60 + datetime.getUTCMinutes()) * 60 + datetime.getUTCSeconds();
};

export const createDatetimeCursor = (datetime: Date, id?: string) => {
  return datetime.toString() + id ? "_" + id : "";
};

export const formatDuration = (duration: TimeInSeconds) => {
  return duration >= 3600 ? Math.floor(duration / 3600) + "h" + Math.floor((duration % 3600) / 60) : Math.floor(duration / 60) + " min";
};

export const addSeconds = (date: Date, seconds: number) => {
  date.setSeconds(seconds + date.getUTCSeconds());
  return date;
};

export const extractDatePart = (isoDatetime: UTCDateTime) => {
  return isoDatetime.slice(0, isoDatetime.indexOf("T"));
};

export const withOffsetHours = (offset: number, date?: Date | undefined) => {
  return new Date((date?.valueOf() ?? new Date().valueOf()) + offset * (3600 * 1000));
};

export const isToday = (date: Date) => {
  const now = new Date();
  return date.getUTCMonth() === now.getUTCMonth() && date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCDate() === now.getUTCDate();
};
