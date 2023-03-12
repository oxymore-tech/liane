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
