import React from "react";
import { BaseFormProps, CarForm, DateForm, FormComponent, LocationForm, RememberChoiceForm, TimeForm } from "@/screens/lianeWizard/Forms";
import { AppColors } from "@/theme/colors";
import { WizardStepsKeys } from "@/screens/lianeWizard/StateMachine";
import { LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { useInterpret } from "@xstate/react";

export interface WizardStepData {
  forms: (() => JSX.Element)[];
  title: string;
  mainColor: AppColors;
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
    mainColor: AppColors.blue500
  },
  to: {
    forms: [WithName(LocationForm, "to")],
    title: "Où allez-vous ?",
    mainColor: AppColors.pink500
  },
  from: {
    forms: [WithName(LocationForm, "from")],
    title: "D'où partez-vous ?",
    mainColor: AppColors.orange500
  },
  date: {
    forms: [WithName(DateForm, "departureDate")],
    title: "Quand partez-vous?",
    mainColor: AppColors.yellow500
  },
  time: {
    forms: [WithName(TimeForm, "departureTime")],
    title: "A quelle heure partez-vous?",
    mainColor: AppColors.blue500
  },
  vehicle: {
    forms: [
      WithName(CarForm, "driverCapacity", { defaultValue: 0 }),
      WithName(RememberChoiceForm, "rememberVehicleChoice", {
        rules: { required: false }
      })
    ],
    title: "Avez-vous un véhicule ?",
    mainColor: AppColors.white
  }
};

export const WizardContext = React.createContext<ReturnType<typeof useInterpret>>();
