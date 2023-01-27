export type TimeInSeconds = number;
export const toTimeInSeconds = (datetime: Date) => {
  return (
    (datetime.getUTCHours() * 60 + datetime.getUTCMinutes()) * 60 +
    datetime.getUTCSeconds()
  );
};
