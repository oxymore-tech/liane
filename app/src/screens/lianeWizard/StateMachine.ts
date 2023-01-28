import { assign, createMachine, EventObject } from "xstate";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";

export type WizardStepsKeys = "to" | "from" | "time" | "date" | "vehicle";

export type StatesKeys = WizardStepsKeys | "overview" | "submitted";

export const WizardStateSequence: Readonly<WizardStepsKeys[]> = ["to", "from", "date", "time", "vehicle"];

const createStateSequence = <T extends unknown>(stateKeys: readonly Partial<T>[], nextState: T) => {
  const states = [
    [stateKeys[0], createState(stateKeys[1])],
    ...stateKeys.slice(1, stateKeys.length - 1).map((key, shiftedIndex) => [key, createState(stateKeys[shiftedIndex + 2], stateKeys[shiftedIndex])]),
    [stateKeys[stateKeys.length - 1], createState(nextState, stateKeys[stateKeys.length - 2])]
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
    ...createStateSequence<StatesKeys>(WizardStateSequence, "overview"),

    overview: {
      on: {
        UPDATE: {
          actions: ["set"]
        },
        SUBMIT: {
          target: "submitted"
        }
      }
    },
    submitted: {
      type: "final",
      onDone: {
        actions: "submit"
      }
    }
  };

  return createMachine<LianeWizardFormData>(
    {
      predictableActionArguments: true,
      context: initialValue || {},
      initial: (initialValue ? "overview" : "to") as StatesKeys,
      states
    },
    {
      actions: {
        submit: (context, event) => console.log("SUBMITTED", context),
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
