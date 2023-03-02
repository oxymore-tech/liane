import { LianeRequest, RallyingPoint } from "@/api";
import { TimeInSeconds, toTimeInSeconds } from "@/util/datetime";

export type LianeWizardFormKey = keyof LianeWizardFormData;

export type LianeWizardFormData = {
  departureDate: Date;
  departureTime: TimeInSeconds;
  returnTime: TimeInSeconds | null;
  availableSeats: number;
  from: RallyingPoint;
  to: RallyingPoint;
};

export const toLianeRequest = (formData: LianeWizardFormData): LianeRequest => {
  let departureTime: any = new Date(formData.departureTime * 1000);
  departureTime.setUTCFullYear(formData.departureDate.getUTCFullYear());
  departureTime.setUTCMonth(formData.departureDate.getUTCMonth());
  departureTime.setUTCDate(formData.departureDate.getUTCDate());
  departureTime = departureTime.toISOString();

  let returnTime;
  if (formData.returnTime) {
    returnTime = new Date(formData.returnTime * 1000);
    returnTime.setUTCFullYear(formData.departureDate.getUTCFullYear());
    returnTime.setUTCMonth(formData.departureDate.getUTCMonth());
    returnTime.setUTCDate(formData.departureDate.getUTCDate());
    returnTime = returnTime.toISOString();
  }
  return {
    from: formData.from.id!,
    to: formData.to.id!,
    availableSeats: formData.availableSeats,
    returnTime,
    departureTime
  };
};
