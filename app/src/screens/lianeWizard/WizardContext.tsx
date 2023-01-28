import React from "react";
import { BaseFormProps, CarForm, DateForm, FormComponent, LocationForm, RememberChoiceForm, TimeForm } from "@/screens/lianeWizard/Forms";
import { AppColors } from "@/theme/colors";
import { WizardStepsKeys } from "@/screens/lianeWizard/StateMachine";
import { LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { useInterpret } from "@xstate/react";

export interface WizardStepData {
  forms: (() => JSX.Element)[];
  title: string;
  color: AppColors;
}

const WithName =
  <T extends unknown>(WrappedFormComponent: FormComponent<T>, name: LianeWizardFormKey, options: Omit<BaseFormProps<T>, "name"> = {}) =>
  () =>
    <WrappedFormComponent key={`formField.${name}`} name={name} {...options} />;

export type WizardFormDataKey = WizardStepsKeys | "returnTrip";

export const WizardFormData: { [name in WizardFormDataKey]: WizardStepData } = {
  returnTrip: {
    forms: [WithName(TimeForm, "returnTime")],
    title: "A quelle heure repartez-vous ?",
    color: AppColors.blue
  },
  to: {
    forms: [WithName(LocationForm, "to")],
    title: "Où allez-vous ?",
    color: AppColors.pink
  },
  from: {
    forms: [WithName(LocationForm, "from")],
    title: "D'où partez-vous ?",
    color: AppColors.orange
  },
  date: {
    forms: [WithName(DateForm, "departureDate")],
    title: "Quand partez-vous?",
    color: AppColors.yellow
  },
  time: {
    forms: [WithName(TimeForm, "departureTime")],
    title: "A quelle heure partez-vous?",
    color: AppColors.blue
  },
  vehicle: {
    forms: [
      WithName(CarForm, "driverCapacity", { defaultValue: 0 }),
      WithName(RememberChoiceForm, "rememberVehicleChoice", {
        rules: { required: false }
      })
    ],
    title: "Avez-vous un véhicule ?",
    color: AppColors.white
  }
};

export const WizardContext = React.createContext<ReturnType<typeof useInterpret>>();
