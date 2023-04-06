import React from "react";
import { BaseFormProps, CarForm, DateForm, FormComponent, TimeForm } from "@/screens/lianeWizard/Forms";
import { AppColors } from "@/theme/colors";
import { WizardStateMachineInterpreter, WizardStepsKeys } from "@/screens/lianeWizard/StateMachine";
import { LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { LocationForm } from "@/components/forms/LocationForm";

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

const rallyingPointsMustBeDifferent = "Veuillez choisir des points de départ et d'arrivée différents.";

export const WizardFormData: { [name in WizardFormDataKey]: WizardStepData } = {
  returnTrip: {
    forms: [WithName(TimeForm, "returnTime")],
    title: "A quelle heure repartez-vous ?",
    color: AppColors.blue
  },
  to: {
    forms: [
      WithName(LocationForm, "to", {
        rules: {
          validate: (v, formValues) => {
            return v === undefined || formValues.from === undefined || formValues.from.id !== v.id || rallyingPointsMustBeDifferent;
          }
        }
      })
    ],
    title: "Où allez-vous ?",
    color: AppColors.pink
  },
  from: {
    forms: [
      WithName(LocationForm, "from", {
        rules: {
          validate: (v, formValues) => {
            return v === undefined || formValues.to === undefined || formValues.to.id !== v.id || rallyingPointsMustBeDifferent;
          }
        }
      })
    ],
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
    forms: [WithName(CarForm, "availableSeats", { defaultValue: 1, rules: { required: false } })], // defaults to 1 passenger seat
    title: "Avez-vous un véhicule ?",
    color: AppColors.white
  }
};

// @ts-ignore
export const WizardContext = React.createContext<WizardStateMachineInterpreter>();
