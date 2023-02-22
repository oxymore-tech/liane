export type TimeInSeconds = number;
export const toTimeInSeconds = (datetime: Date) => {
  return (datetime.getUTCHours() * 60 + datetime.getUTCMinutes()) * 60 + datetime.getUTCSeconds();
};

export const createDatetimeCursor = (datetime: Date, id?: string) => {
  return datetime.toString() + id ? "_" + id : "";
};

export const formatDuration = (duration: TimeInSeconds) => {
  return duration >= 60 ? Math.floor(duration / 60) + "h" + Math.floor(duration % 60) : duration + " min";
};
