import { LianeRequest, LianeSearchFilter, RallyingPoint } from "@/api";
import { toTimeInSeconds } from "@/util/datetime";

export interface SearchData {
  to: RallyingPoint;
  from: RallyingPoint;
  tripTime: Date;
  tripDate: Date;
  timeIsDepartureTime: boolean;
  vehicle: number;
}

export const toSearchFilter = (formData: SearchData): LianeSearchFilter => {
  const departureTime: any = new Date(
    formData.tripDate.getFullYear(),
    formData.tripDate.getMonth(),
    formData.tripDate.getDate(),
    formData.tripTime.getHours(),
    formData.tripTime.getMinutes()
  );
  const goTime = departureTime.toISOString();

  return {
    from: formData.from,
    to: formData.to,
    targetTime: {
      direction: formData.timeIsDepartureTime ? "Departure" : "Arrival",
      dateTime: goTime
    },
    availableSeats: formData.vehicle
  };
};

export const fromSearchFilter = (formData: LianeSearchFilter): SearchData => {
  const tripDate = new Date(formData.targetTime.dateTime);
  return {
    from: formData.from,
    to: formData.to,
    tripDate,
    tripTime: tripDate,
    timeIsDepartureTime: formData.targetTime.direction === "Departure",
    vehicle: formData.availableSeats
  };
};

export const toLianeRequest = (filter: LianeSearchFilter): LianeRequest => {
  return {
    to: filter.to,
    from: filter.from,
    departureTime: filter.targetTime.dateTime,
    // returnTime: filter.returnTime,
    availableSeats: filter.availableSeats
  };
};
