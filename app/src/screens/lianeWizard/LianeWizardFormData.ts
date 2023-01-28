import { RallyingPoint } from "@/api";
import { TimeInSeconds } from "@/util/datetime";

export type LianeWizardFormKey = keyof LianeWizardFormData;

export type LianeWizardFormData = {
  departureDate: Date;
  departureTime: TimeInSeconds;
  returnTime?: TimeInSeconds;
  driverCapacity: number;
  rememberVehicleChoice: boolean;
  from: RallyingPoint;
  to: RallyingPoint;
};
