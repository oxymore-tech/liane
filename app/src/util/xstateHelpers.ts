import { PublishStepsKeys } from "@/screens/publish/StateMachine";
export const createStateSequence = <T, TKey extends string>(
  states: { [key: string]: { validation?: (context: T) => boolean } },
  nextState: string,
  createState: (nextTarget: string, nextCondition?: (context: T) => boolean, previousTarget?: string) => any
) => {
  const stateKeys = Object.keys(states).map(k => ({ key: k, validation: states[k].validation }));
  const seq = [
    [stateKeys[0].key, createState(stateKeys[1].key, stateKeys[0].validation)],
    ...stateKeys
      .slice(1, stateKeys.length - 1)
      .map((key, shiftedIndex) => [key.key, createState(stateKeys[shiftedIndex + 2].key, key.validation, stateKeys[shiftedIndex].key)]),
    [stateKeys[stateKeys.length - 1].key, createState(nextState, stateKeys[stateKeys.length - 1].validation, stateKeys[stateKeys.length - 2].key)]
  ];

  return <{ [name in TKey]: {} }>Object.fromEntries(seq);
};

export const CreateSubmittingState = <K>(machineId: string, cancelTargetState?: K) => ({
  initial: "pending",
  on: {
    CANCEL: { target: cancelTargetState || "#" + machineId + ".overview" }
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
    pending: {
      after: {
        // timeout after 10 second
        10000: { target: "failure" }
      }
    },
    success: { type: "final" },
    failure: {
      on: {
        RETRY: { target: "#" + machineId + ".submitting" }
      }
    }
  }
});

type RetryEvent = { type: "RETRY" };
type CancelEvent = { type: "CANCEL" };

export type SubmittingEvents = RetryEvent | CancelEvent;
