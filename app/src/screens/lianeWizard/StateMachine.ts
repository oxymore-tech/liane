import { assign, createMachine, StateMachine } from "xstate";
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

type Schema = {
  states: {
    [name in StatesKeys]: {};
  };
};

export type WizardDataEvent = { type: "NEXT"; data: { data: LianeWizardFormData } } | { type: "UPDATE"; data: { data: LianeWizardFormData } };

type Event = WizardDataEvent | { type: "PREV" } | { type: "SUBMIT" };

export type WizardStateMachine = StateMachine<LianeWizardFormData, Schema, Event>;

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

// @ts-ignore
const defaultContext: LianeWizardFormData = {};

export const CreateLianeContextMachine = (initialValue?: LianeWizardFormData): WizardStateMachine => {
  return createMachine(
    {
      predictableActionArguments: true,
      context: initialValue || defaultContext,
      initial: (initialValue ? "overview" : "to") as StatesKeys,
      states
    },
    {
      actions: {
        submit: (context, _) => console.log("SUBMITTED", context),
        set: assign<LianeWizardFormData, WizardDataEvent>((context, event) => {
          return {
            ...context,
            ...event.data
          };
        })
      }
    }
  );
};
