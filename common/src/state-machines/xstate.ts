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

  return <{ [name in TKey]: NonNullable<unknown> }>Object.fromEntries(seq);
};

export const CreateSubmittingState = ({
  cancelTargetState,
  onSuccess,
  successTargetState,
  serviceId,
  submittingState,
  onError
}: {
  cancelTargetState: string;
  onSuccess?: string;
  successTargetState?: string;
  serviceId?: string;
  submittingState?: string;
  onError?: string;
}) => ({
  initial: "pending",
  on: {
    CANCEL: { target: cancelTargetState }
  },
  invoke: {
    id: serviceId ?? "submit",
    src: serviceId ?? "submit",
    onDone: {
      target: ".success",
      actions: onSuccess
    },
    onError: {
      target: ".failure",
      actions: onError
    }
  },
  states: {
    pending: {
      after: {
        // timeout after 10 second
        10000: { target: "failure" }
      }
    },
    success: { always: { target: successTargetState || ".done" } },
    failure: {
      on: {
        RETRY: { target: submittingState ?? ".submitting" }
      }
    }
  }
});

type RetryEvent = { type: "RETRY" };
type CancelEvent = { type: "CANCEL" };

export type SubmittingEvents = RetryEvent | CancelEvent;

export type ServiceDoneEvent<T> = { type: "done.invoke.submit"; data: T };
export type ServiceErrorEvent = { type: string; data: any };
