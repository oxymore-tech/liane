import { isExactMatch, JoinLianeRequestDetailed, LianeMatch, RallyingPoint } from "@/api";
import { InternalLianeSearchFilter } from "@/util/ref";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";
import { toTimeInSeconds } from "@/util/datetime";

export interface SearchData {
  to: RallyingPoint;
  from: RallyingPoint;
  tripTime: Date;
  tripDate: Date;
  timeIsDepartureTime: boolean;
  availableSeats: number;
}

export const toSearchFilter = (formData: SearchData): InternalLianeSearchFilter => {
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
    availableSeats: formData.availableSeats
  };
};

export const fromSearchFilter = (formData: InternalLianeSearchFilter): SearchData => {
  const tripDate = new Date(formData.targetTime.dateTime);
  return {
    from: formData.from,
    to: formData.to,
    tripDate,
    tripTime: tripDate,
    timeIsDepartureTime: formData.targetTime.direction === "Departure",
    availableSeats: formData.availableSeats
  };
};

export const toLianeWizardFormData = (filter: InternalLianeSearchFilter): LianeWizardFormData => {
  return {
    to: filter.to,
    from: filter.from,
    departureDate: new Date(filter.targetTime.dateTime),
    departureTime: toTimeInSeconds(new Date(filter.targetTime.dateTime)),
    returnTime: filter.returnTime,
    availableSeats: filter.availableSeats
  };
};

export const toJoinLianeRequest = (filter: InternalLianeSearchFilter, match: LianeMatch, message: string): JoinLianeRequestDetailed => {
  return {
    to: filter.to,
    from: filter.from,
    targetLiane: match.liane,
    takeReturnTrip: false, //TODO
    message,
    seats: filter.availableSeats,
    match: match.match
  };
};
