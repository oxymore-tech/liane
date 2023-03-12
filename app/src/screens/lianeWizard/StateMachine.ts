import { assign, createMachine, Interpreter, StateMachine } from "xstate";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";

export type StatesKeys = "wizard" | "overview" | "submitting"; //TODO| "submitted"
export const WizardStateSequence = ["from", "to", "date", "time", "vehicle"] as const;
export type WizardStepsKeys = (typeof WizardStateSequence)[number];

const createStateSequence = <T extends unknown>(stateKeys: readonly Partial<T>[], nextState: T) => {
  const states = [
    [stateKeys[0], createState(stateKeys[1])],
    ...stateKeys.slice(1, stateKeys.length - 1).map((key, shiftedIndex) => [key, createState(stateKeys[shiftedIndex + 2], stateKeys[shiftedIndex])]),
    [stateKeys[stateKeys.length - 1], createState(nextState, stateKeys[stateKeys.length - 2])]
  ];

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

type Event = WizardDataEvent | { type: "PREV" } | { type: "SUBMIT" } | { type: "CANCEL" } | { type: "RETRY" };

export type WizardStateMachine = StateMachine<LianeWizardFormData, Schema, Event>;

export type WizardStateMachineInterpreter = Interpreter<LianeWizardFormData, Schema, Event>;

// @ts-ignore
const defaultContext: LianeWizardFormData = {};

const states: { [name in StatesKeys]: any } = {
  wizard: {
    initial: WizardStateSequence[0],
    states: createStateSequence(WizardStateSequence, "#lianeWizard.overview")
  },
  overview: {
    on: {
      UPDATE: {
        actions: ["set"]
      },
      SUBMIT: {
        target: "submitting"
      }
    }
  },
  submitting: {
    initial: "pending",
    on: {
      CANCEL: { target: "overview" }
    },
    invoke: {
      src: "submit",
      onDone: {
        target: ".success"
      },
      onError: {
        target: ".failure"
      }
    },
    states: {
      pending: {},
      success: { type: "final" },
      failure: {
        on: {
          RETRY: { target: "#lianeWizard.submitting" }
        }
      }
    }
  }
  /*submitted: {
    type: "final",
    data: (context, event) => context
  }*/
};

export const CreateLianeContextMachine = (
  submit: (formData: LianeWizardFormData) => Promise<unknown>,
  initialValue?: LianeWizardFormData
): WizardStateMachine => {
  return createMachine(
    {
      id: "lianeWizard",
      predictableActionArguments: true,
      context: initialValue || defaultContext,
      initial: (initialValue ? "overview" : "wizard") as StatesKeys,
      states
    },
    {
      services: {
        submit: (context, _) => submit(context)
      },
      actions: {
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
