import { assign, createMachine, EventObject } from "xstate";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";

export type WizardStepsKeys = "to" | "from" | "time" | "date" | "vehicle";

export type StatesKeys = WizardStepsKeys | "final";

export const WizardStateSequence: Readonly<WizardStepsKeys[]> = ["to", "from", "date", "time", "vehicle"];

const createStateSequence = <T extends unknown>(stateKeys: readonly Partial<T>[], finalState: T) => {
  const states = [
    [stateKeys[0], createState(stateKeys[1])],
    ...stateKeys.slice(1, stateKeys.length - 1).map((key, shiftedIndex) => [key, createState(stateKeys[shiftedIndex + 2], stateKeys[shiftedIndex])]),
    [stateKeys[stateKeys.length - 1], createState(finalState, stateKeys[stateKeys.length - 2])]
  ];
  console.log(JSON.stringify(states));
  return Object.fromEntries(states);
};

// TODO add validity conditions
const createState = <T extends unknown>(nextTarget: T, previousTarget?: T) => ({
  on: {
    NEXT: {
      target: nextTarget,
      actions: ["set"]
    },
    PREV: previousTarget ? { target: previousTarget } : undefined
  }
});

export interface WizardEvent extends EventObject {
  data: Partial<LianeWizardFormData>;
}

export const CreateLianeContextMachine = (initialValue?: LianeWizardFormData) => {
  const states: { [name in StatesKeys]: any } = {
    ...createStateSequence<StatesKeys>(WizardStateSequence, "final"),

    final: {
      type: "final",
      on: {
        UPDATE: {
          actions: ["set"]
        }
      }
    }
  };

  return createMachine<LianeWizardFormData>(
    {
      predictableActionArguments: true,
      context: initialValue || {},
      initial: (initialValue ? "final" : "to") as StatesKeys,
      states
    },
    {
      actions: {
        set: assign<LianeWizardFormData, WizardEvent>((context, event) => {
          console.log(event);
          return {
            ...context,
            ...event.data
          };
        })
      }
    }
  );
};
